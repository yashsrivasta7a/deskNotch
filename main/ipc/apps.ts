/**
 * The apps used most, for the desk: what Windows itself counts. Explorer keeps
 * a tally per app under UserAssist (the Start menu's "most used" comes from
 * it): launches and time in focus. The top few by focus time, with the name
 * and icon Windows shows for each, from one PowerShell pass, cached a while.
 */
import { ipcMain, shell } from 'electron'
import { execFile, spawn } from 'child_process'
import fs from 'fs'

export interface TopApp {
  id: string
  name: string
  icon: string | null
}

const USER_ASSIST = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist\\{CEBFF5CD-ACE2-4F4F-9178-9926F41749EA}\\Count'

/** Not apps anyone would open from here: the shell, the lock screen, ourselves. */
const SKIP = /^(UEME_|\{)|com\.devezio\.desknotch|Microsoft\.LockApp|Microsoft\.Windows\.(Explorer|Shell|StartMenu)|DevToolsApp|explorer\.exe$/i

const rot13 = (s: string) => s.replace(/[a-z]/gi, (c) => String.fromCharCode(((c <= 'Z' ? 65 : 97) + ((c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26))))

/** Every app in the tally, by time in focus, most first. */
const usage = () =>
  new Promise<string[]>((resolve) => {
    execFile('reg', ['query', USER_ASSIST], { windowsHide: true, maxBuffer: 8 << 20 }, (error, stdout) => {
      if (error) return resolve([])
      const rows: { id: string; focus: number }[] = []
      for (const line of stdout.split(/\r?\n/)) {
        const match = line.match(/^\s{4}(.+?)\s{4}REG_BINARY\s{4}([0-9A-F]+)$/)
        if (!match) continue
        const data = Buffer.from(match[2], 'hex')
        if (data.length < 16) continue
        const id = rot13(match[1])
        const focus = data.readUInt32LE(12)
        if (focus > 60_000 && !SKIP.test(id)) rows.push({ id, focus })
      }
      resolve(rows.sort((a, b) => b.focus - a.focus).map((row) => row.id))
    })
  })

/** Names and icons for app ids (AppUserModelIDs or exe paths), as Windows shows them. */
const DESCRIBE = `$ErrorActionPreference = 'SilentlyContinue'
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class AppIcon {
  [ComImport, Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IShellItemImageFactory { [PreserveSig] int GetImage(SIZE size, int flags, out IntPtr phbm); }
  [StructLayout(LayoutKind.Sequential)] struct SIZE { public int cx; public int cy; }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  static extern void SHCreateItemFromParsingName(string path, IntPtr pbc, [MarshalAs(UnmanagedType.LPStruct)] Guid riid, [MarshalAs(UnmanagedType.Interface)] out IShellItemImageFactory ppv);
  [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr h);
  [DllImport("gdi32.dll")] static extern int GetObject(IntPtr h, int c, ref DIBSECTION ds);
  [StructLayout(LayoutKind.Sequential)] struct BITMAP { public int bmType, bmWidth, bmHeight, bmWidthBytes; public short bmPlanes, bmBitsPixel; public IntPtr bmBits; }
  [StructLayout(LayoutKind.Sequential)] struct DIBSECTION { public BITMAP dsBm; public int biSize, biWidth, biHeight; public short biPlanes, biBitCount; public int biCompression, biSizeImage, biXPelsPerMeter, biYPelsPerMeter, biClrUsed, biClrImportant; public int f0, f1, f2; public IntPtr dshSection; public int dsOffset; }
  public static string Png(string parsing, int size) {
    IShellItemImageFactory f;
    try { SHCreateItemFromParsingName(parsing, IntPtr.Zero, typeof(IShellItemImageFactory).GUID, out f); } catch { return null; }
    IntPtr h;
    SIZE s; s.cx = size; s.cy = size;
    if (f.GetImage(s, 0x4, out h) != 0) return null;
    try {
      DIBSECTION ds = new DIBSECTION();
      GetObject(h, Marshal.SizeOf(ds), ref ds);
      using (Bitmap bmp = new Bitmap(ds.dsBm.bmWidth, ds.dsBm.bmHeight, ds.dsBm.bmWidthBytes, PixelFormat.Format32bppPArgb, ds.dsBm.bmBits))
      using (Bitmap copy = new Bitmap(bmp)) {
        if (ds.biHeight > 0) copy.RotateFlip(RotateFlipType.RotateNoneFlipY);
        using (MemoryStream ms = new MemoryStream()) { copy.Save(ms, ImageFormat.Png); return Convert.ToBase64String(ms.ToArray()); }
      }
    } finally { DeleteObject(h); }
  }
}
'@
$ids = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('__IDS__')) | ConvertFrom-Json
$names = @{}
(New-Object -ComObject Shell.Application).NameSpace('shell:AppsFolder').Items() | ForEach-Object { $names[$_.Path] = $_.Name }
$out = foreach ($id in $ids) {
  $isPath = Test-Path -LiteralPath $id
  $name = if ($names.ContainsKey($id)) { $names[$id] } elseif ($isPath) { $d = (Get-Item -LiteralPath $id).VersionInfo.FileDescription; if ($d) { $d } else { [IO.Path]::GetFileNameWithoutExtension($id) } } else { $null }
  $parsing = if ($isPath) { $id } else { "shell:AppsFolder\\$id" }
  [pscustomobject]@{ id = $id; name = $name; icon = [AppIcon]::Png($parsing, 48) }
}
@($out) | ConvertTo-Json -Compress
`

const describe = (ids: string[]) =>
  new Promise<TopApp[]>((resolve) => {
    const script = DESCRIBE.replace('__IDS__', Buffer.from(JSON.stringify(ids)).toString('base64'))
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, maxBuffer: 16 << 20 }, (error, stdout) => {
      if (error || !stdout.trim()) return resolve([])
      try {
        const rows = JSON.parse(stdout)
        resolve(
          (Array.isArray(rows) ? rows : [rows])
            .filter((row) => row.name)
            .map((row) => ({ id: row.id, name: row.name, icon: row.icon ? `data:image/png;base64,${row.icon}` : null })),
        )
      } catch {
        resolve([])
      }
    })
  })

const COUNT = 7
const FRESH = 30 * 60_000
let cache: { at: number; apps: TopApp[] } | null = null

/** Names and icons already looked up, by id: favourites ask again each time the desk opens. */
const known = new Map<string, TopApp>()

const describeCached = async (ids: string[]) => {
  const missing = ids.filter((id) => !known.has(id))
  if (missing.length) for (const app of await describe(missing)) known.set(app.id, app)
  return ids.flatMap((id) => (known.has(id) ? [known.get(id)!] : []))
}

const topApps = async () => {
  if (cache && Date.now() - cache.at < FRESH) return cache.apps
  // A few spare, for ids that no longer resolve (uninstalled, moved).
  const apps = (await describeCached((await usage()).slice(0, COUNT + 5))).slice(0, COUNT)
  cache = { at: Date.now(), apps }
  return apps
}

/** Every app in the Start menu's list, by name: what favourites are picked from. */
const LIST_ALL = `(New-Object -ComObject Shell.Application).NameSpace('shell:AppsFolder').Items() |
  ForEach-Object { [pscustomobject]@{ id = $_.Path; name = $_.Name } } | ConvertTo-Json -Compress`

let installed: { at: number; apps: { id: string; name: string }[] } | null = null

const allApps = () =>
  installed && Date.now() - installed.at < FRESH
    ? Promise.resolve(installed.apps)
    : new Promise<{ id: string; name: string }[]>((resolve) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', LIST_ALL], { windowsHide: true, maxBuffer: 8 << 20 }, (error, stdout) => {
          try {
            const rows = error ? [] : JSON.parse(stdout)
            const apps = (Array.isArray(rows) ? rows : [rows])
              // Names that are really uninstallers, help files or web links are not apps to pin.
              .filter((row) => row.id && row.name && !/uninstall|readme|help|website|documentation/i.test(row.name) && !/^https?:/i.test(row.id))
              .sort((a, b) => a.name.localeCompare(b.name))
            installed = { at: Date.now(), apps }
            resolve(apps)
          } catch {
            resolve([])
          }
        })
      })

export function registerAppsIpc() {
  ipcMain.handle('apps:top', () => topApps())
  ipcMain.handle('apps:all', () => allApps())
  ipcMain.handle('apps:describe', (_event, ids: unknown) =>
    describeCached((Array.isArray(ids) ? ids : []).filter((id): id is string => typeof id === 'string').slice(0, 24)),
  )
  // Only apps this side has listed (most used, or installed) can be launched:
  // nothing arbitrary from the page.
  ipcMain.handle('apps:launch', async (_event, id: unknown) => {
    if (typeof id !== 'string') return
    const listed = cache?.apps.some((app) => app.id === id) || (await allApps()).some((app) => app.id === id)
    if (!listed) return
    if (fs.existsSync(id)) void shell.openPath(id)
    else spawn('explorer.exe', [`shell:AppsFolder\\${id}`], { detached: true, stdio: 'ignore' }).unref()
  })
}
