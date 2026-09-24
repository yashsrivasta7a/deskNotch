/**
 * Media: sending the transport keys, and jumping to whatever is playing.
 *
 * The SMTC library only observes, so play, pause and skip go out as the
 * system media keys — the same ones a keyboard sends, which every player
 * honours whether or not it has focus.
 */
import { ipcMain } from 'electron'
import { type ChildProcess, execFile, spawn } from 'child_process'

const MEDIA_KEYS = { 'play-pause': 0xb3, next: 0xb0, previous: 0xb1 } as const
type MediaKey = keyof typeof MEDIA_KEYS

export const USER32 = `
Add-Type @"
using System; using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
}
"@
`

/**
 * One PowerShell kept alive for key presses: starting a fresh one costs a
 * third of a second, which is the difference between a button and a lag.
 * It reads a key code per line and taps that key.
 */
let keyServer: ChildProcess | null = null

const pressKey = (code: number) => {
  if (!keyServer || keyServer.exitCode !== null) {
    keyServer = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `${USER32}
while (($line = [Console]::In.ReadLine()) -ne $null) {
  $vk = [byte]$line
  [W]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
  [W]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)
}`,
      ],
      { windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] },
    )
    keyServer.on('exit', () => {
      keyServer = null
    })
  }
  keyServer.stdin?.write(`${code}\n`)
}

/** Brings the first visible window of an exe forward, maximised. Best effort:
 *  Windows may refuse to hand focus to another process, in which case the
 *  window still flashes on the taskbar. */
const raiseExe = (name: string) =>
  new Promise<void>((resolve) => {
    const script = `${USER32}
$p = Get-Process -Name "${name}" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($p) { [W]::ShowWindow($p.MainWindowHandle, 3) | Out-Null; [W]::SetForegroundWindow($p.MainWindowHandle) | Out-Null }
`
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true }, () => resolve())
  })

export function registerMediaIpc() {
  ipcMain.handle('media:key', (_event, key: MediaKey) => {
    if (key in MEDIA_KEYS) pressKey(MEDIA_KEYS[key])
  })

  ipcMain.handle('media:focus', async (_event, sourceAppId: string) => {
    if (typeof sourceAppId !== 'string' || !/^[\w.!-]+$/.test(sourceAppId)) return
    if (sourceAppId.includes('!')) {
      // A Store app (Spotify from the Store, say): the shell activates it by its AUMID.
      spawn('explorer.exe', [`shell:AppsFolder\\${sourceAppId}`], { detached: true, stdio: 'ignore' }).unref()
      return
    }
    await raiseExe(sourceAppId.replace(/\.exe$/i, ''))
  })
}

export function stopMediaIpc() {
  keyServer?.kill()
  keyServer = null
}
