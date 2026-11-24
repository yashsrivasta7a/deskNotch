import { BrowserWindow, screen } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { readStore } from './store'
import { notchWindows } from './display'

let watcherProcess: ChildProcess | null = null
let lastRawResult = ''
/** Per notch window id: whether it is tucked up out of a browser's way. */
const tucked = new Map<number, boolean>()

/** Browsers, by process name: their tabs and address bar sit right under the notch. */
const BROWSERS = new Set(['chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi'])

const SCRIPT = (parentPid: number) => `
$code = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class FullscreenCheck {
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MONITORINFO {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
    }

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);

    [DllImport("user32.dll")]
    public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool IsZoomed(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    public const uint MONITOR_DEFAULTTONEAREST = 2;

    // "fullscreen,zoomed,touchesTop,monitorLeft,monitorTop,monitorRight,monitorBottom,exe"
    // for the foreground window, or "self" / "keep" when deskNotch or a transient
    // Windows overlay (Alt+Tab, Start, Task View) is focused.
    public static string Foreground() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return "0,0,0,0,0,0,0,";

        StringBuilder className = new StringBuilder(256);
        GetClassName(hwnd, className, 256);
        string cls = className.ToString();
        if (cls == "MultitaskingViewFrame" || cls == "TaskListThumbnailWnd" ||
            cls == "XamlExplorerHostIslandWindow" || cls == "Windows.UI.Core.CoreWindow" ||
            cls == "NotifyIconOverflowWindow" || cls == "TopLevelWindowForOverflowXamlIsland") {
            return "keep";
        }
        bool shell = cls == "Progman" || cls == "WorkerW" || cls == "Shell_TrayWnd" || cls == "Shell_SecondaryTrayWnd";

        StringBuilder title = new StringBuilder(256);
        GetWindowText(hwnd, title, 256);
        if (title.ToString() == "DeskNotch") return "self";

        IntPtr hMonitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        MONITORINFO mi = new MONITORINFO();
        mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
        if (!GetMonitorInfo(hMonitor, ref mi)) return "0,0,0,0,0,0,0,";

        bool fullscreen = false;
        bool zoomed = false;
        bool touchesTop = false;
        RECT rect;
        if (!shell && GetWindowRect(hwnd, out rect)) {
            zoomed = IsZoomed(hwnd);
            fullscreen = !zoomed && rect.Left <= mi.rcMonitor.Left + 2 && rect.Top <= mi.rcMonitor.Top + 2
                && rect.Right >= mi.rcMonitor.Right - 2 && rect.Bottom >= mi.rcMonitor.Bottom - 2;
            int monW = mi.rcMonitor.Right - mi.rcMonitor.Left;
            int winW = rect.Right - rect.Left;
            touchesTop = rect.Top <= mi.rcMonitor.Top + 4 && winW >= (int)(monW * 0.7);
        }

        string exe = "";
        try {
            uint pid;
            GetWindowThreadProcessId(hwnd, out pid);
            exe = System.Diagnostics.Process.GetProcessById((int)pid).ProcessName;
        } catch {}

        return string.Format("{0},{1},{2},{3},{4},{5},{6},{7}",
            fullscreen ? 1 : 0, zoomed ? 1 : 0, touchesTop ? 1 : 0,
            mi.rcMonitor.Left, mi.rcMonitor.Top, mi.rcMonitor.Right, mi.rcMonitor.Bottom, exe);
    }
}
"@

Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

$last = ""
while ($true) {
  if (-not (Get-Process -Id ${parentPid} -ErrorAction SilentlyContinue)) { exit }
  $res = [FullscreenCheck]::Foreground()
  if ($res -ne $last) {
    Write-Output $res
    $last = $res
  }
  Start-Sleep -Milliseconds 300
}
`

export function startFullscreenWatch() {
  if (process.platform !== 'win32') return

  if (watcherProcess) return

  try {
    watcherProcess = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', SCRIPT(process.pid)], {
      windowsHide: true,
    })

    let buffer = ''
    watcherProcess.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) {
          handleFullscreenChange(trimmed)
        }
      }
    })

    watcherProcess.on('error', (err) => {
      console.error('[fullscreen] watcher error:', err)
    })

    watcherProcess.on('exit', () => {
      watcherProcess = null
    })
  } catch (err) {
    console.error('[fullscreen] failed to start watcher:', err)
  }
}

export function stopFullscreenWatch() {
  if (watcherProcess) {
    watcherProcess.kill()
    watcherProcess = null
  }
}

/** Starts the watcher when a setting needs it and stops it when none does:
 *  its PowerShell costs ~80 MB, not worth keeping for nothing. */
export function checkAndApplyFullscreenState() {
  const settings = (readStore().settings ?? {}) as Record<string, unknown>
  if (settings.hideOnFullscreen === false && settings.tuckForBrowsers !== true && settings.shrinkOverApps !== true) {
    stopFullscreenWatch()
    lastRawResult = ''
    // Nothing in front on any monitor: every notch shown and untucked.
    handleFullscreenChange('0,0,0,0,0,0,0,')
    return
  }
  startFullscreenWatch()
  if (lastRawResult) handleFullscreenChange(lastRawResult)
}

/** Whether this notch is tucked right now, for a renderer that just loaded. */
export const isTucked = (windowId: number) => tucked.get(windowId) ?? false

function handleFullscreenChange(rawResult: string) {
  // deskNotch itself or a transient OS overlay (Alt+Tab, Start): keep current state.
  if (!rawResult || rawResult === 'self' || rawResult === 'keep') return
  const parts = rawResult.split(',')
  if (parts.length < 8) return
  const [fsFlag, zoomedFlag, topFlag, l, t, r, b, exe = ''] = parts
  const monitor = [l, t, r, b].map(Number)
  // A half-written line leaves the notches as they are.
  if ((fsFlag !== '0' && fsFlag !== '1') || monitor.some(isNaN)) return
  lastRawResult = rawResult

  const settings = (readStore().settings ?? {}) as Record<string, unknown>
  const hideOnFullscreen = settings.hideOnFullscreen !== false
  const tuckForBrowsers = settings.tuckForBrowsers === true
  const shrinkOverApps = settings.shrinkOverApps === true
  const browser = BROWSERS.has(exe.toLowerCase())

  const isFullscreen = fsFlag === '1'
  const isZoomed = zoomedFlag === '1'
  const touchesTop = topFlag === '1'

  const displays = screen.getAllDisplays()
  for (const [id, window] of notchWindows()) {
    const display = displays.find((d) => String(d.id) === id)
    // Only the notch on the foreground window's monitor reacts to it.
    let onDisplay = false
    if (display) {
      const { x, y, width, height } = display.bounds
      onDisplay = monitor[0] < x + width && monitor[2] > x && monitor[1] < y + height && monitor[3] > y
    }

    // Fullscreen (videos, games, F11) hides the notch outright: nothing should
    // sit on top of it, not even the slim line.
    const hide = hideOnFullscreen && isFullscreen && onDisplay
    if (hide && window.isVisible()) window.hide()
    else if (!hide && !window.isVisible()) restoreWindow(window)

    // Otherwise shrink to the slim top-edge line: over browsers, and, when
    // asked for, over any maximized or top-flush app so its title bar shows.
    const shouldTuck =
      onDisplay &&
      !hide &&
      ((tuckForBrowsers && browser) || (shrinkOverApps && (isZoomed || touchesTop)))

    if (isTucked(window.id) !== shouldTuck) {
      tucked.set(window.id, shouldTuck)
      window.webContents.send('notch:tucked', shouldTuck)
    }
  }
}
function restoreWindow(window: BrowserWindow) {
  window.showInactive()
  window.setAlwaysOnTop(true, 'screen-saver')
  window.setVisibleOnAllWorkspaces(true)
  window.setSkipTaskbar(true)
}