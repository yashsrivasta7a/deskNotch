/**
 * The apps with a window open, for the desk's dock: name, title, icon, and a
 * handle to bring one forward. Listed by PowerShell, icons read by Electron.
 */
import { app, ipcMain } from 'electron'
import { execFile } from 'child_process'
import { USER32 } from './media'

export interface OpenApp {
  pid: number
  name: string
  title: string
  /** The window handle, as a string — it can exceed what JSON keeps exact. */
  hwnd: string
  icon: string | null
}

const LIST = `
Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } |
  Select-Object Id, ProcessName, MainWindowTitle, @{n='Hwnd';e={$_.MainWindowHandle.ToString()}}, Path |
  ConvertTo-Json -Compress
`

/** Our own window, and the shells that host others' windows, are not apps to switch to. */
const SKIP = new Set(['electron', 'desknotch', 'textinputhost', 'applicationframehost', 'systemsettings', 'shellexperiencehost', 'msedgewebview2', 'nvidia overlay', 'startmenuexperiencehost', 'searchhost'])

const icons = new Map<string, string | null>()

const iconFor = async (path: string | null) => {
  if (!path) return null
  if (icons.has(path)) return icons.get(path)!
  try {
    const image = await app.getFileIcon(path, { size: 'normal' })
    const url = image.isEmpty() ? null : image.toDataURL()
    icons.set(path, url)
    return url
  } catch {
    icons.set(path, null)
    return null
  }
}

const list = () =>
  new Promise<OpenApp[]>((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', LIST], { windowsHide: true, maxBuffer: 4 << 20 }, async (error, stdout) => {
      if (error || !stdout.trim()) return resolve([])
      try {
        const raw = JSON.parse(stdout)
        const rows: any[] = Array.isArray(raw) ? raw : [raw]
        const apps = await Promise.all(
          rows
            .filter((row) => !SKIP.has(String(row.ProcessName).toLowerCase()))
            .map(async (row) => ({
              pid: row.Id,
              name: row.ProcessName,
              title: row.MainWindowTitle,
              hwnd: String(row.Hwnd),
              icon: await iconFor(row.Path ?? null),
            })),
        )
        resolve(apps)
      } catch {
        resolve([])
      }
    })
  })

/** Brings one window forward: restored if minimised, then in front. */
const raise = (hwnd: string) =>
  new Promise<void>((resolve) => {
    if (!/^\d+$/.test(hwnd)) return resolve()
    const script = `${USER32}
$h = [IntPtr]::new([Int64]${hwnd})
[W]::ShowWindow($h, 9) | Out-Null
[W]::SetForegroundWindow($h) | Out-Null
`
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true }, () => resolve())
  })

export function registerAppsIpc() {
  ipcMain.handle('apps:list', list)
  ipcMain.handle('apps:focus', (_event, hwnd: string) => raise(String(hwnd)))
}
