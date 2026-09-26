/**
 * Files for the desk's strip: details and icons for any path, Windows' own
 * recent-files list, opening and revealing, and dragging a file back out.
 */
import { app, ipcMain, nativeImage, screen, shell, type NativeImage } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'

export interface FileItem {
  path: string
  name: string
  isDir: boolean
  icon: string | null
  /** A picture of the file itself — the image, a video frame, a PDF's first
   *  page — where Windows has one. */
  thumb: string | null
}

/** Icons by path, kept as images so a drag can use one without waiting. */
const icons = new Map<string, NativeImage>()

const iconFor = async (file: string) => {
  const cached = icons.get(file)
  if (cached) return cached
  try {
    const image = await app.getFileIcon(file, { size: 'normal' })
    icons.set(file, image)
    return image
  } catch {
    return null
  }
}

/** Windows' own thumbnail for a file, as Explorer shows it. Null where there is
 *  none (most documents and folders fall back to their icon). */
const IMAGES = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.ico', '.webp'])
let shellThumbWarned = false

const thumbFor = async (file: string) => {
  // Pictures: load and shrink the picture itself — no dependence on the shell.
  if (IMAGES.has(path.extname(file).toLowerCase())) {
    const image = nativeImage.createFromPath(file)
    if (!image.isEmpty()) {
      const { width, height } = image.getSize()
      return width > height ? image.resize({ height: 128 }) : image.resize({ width: 128 })
    }
  }
  // Everything else: Windows' own thumbnail (video frames, PDF pages…).
  try {
    const image = await nativeImage.createThumbnailFromPath(file, { width: 128, height: 128 })
    return image.isEmpty() ? null : image
  } catch (error) {
    if (!shellThumbWarned) {
      shellThumbWarned = true
      console.warn('[files] no shell thumbnail:', (error as Error).message)
    }
    return null
  }
}

/** A path's details, or null if it is gone. */
const describe = async (file: string): Promise<FileItem | null> => {
  try {
    const stat = await fs.promises.stat(file)
    const icon = await iconFor(file)
    const thumb = stat.isDirectory() ? null : await thumbFor(file)
    // Dragging a file out shows its thumbnail under the pointer, when it has one.
    if (thumb) icons.set(file, thumb.resize({ width: 64 }))
    return {
      path: file,
      name: path.basename(file) || file,
      isDir: stat.isDirectory(),
      icon: icon && !icon.isEmpty() ? icon.toDataURL() : null,
      thumb: thumb ? thumb.toDataURL() : null,
    }
  } catch {
    return null
  }
}

const RECENT = path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Recent')

/**
 * What Windows itself lists as recent: the shortcuts in the Recent folder,
 * newest first, resolved to the files they point at. Folders and files that
 * have since moved are left out.
 */
const recent = async (limit = 12): Promise<FileItem[]> => {
  let entries: { lnk: string; at: number }[] = []
  try {
    const names = await fs.promises.readdir(RECENT)
    entries = await Promise.all(
      names
        .filter((name) => name.toLowerCase().endsWith('.lnk'))
        .map(async (name) => {
          const lnk = path.join(RECENT, name)
          return { lnk, at: (await fs.promises.stat(lnk)).mtimeMs }
        }),
    )
  } catch {
    return []
  }
  entries.sort((a, b) => b.at - a.at)

  const items: FileItem[] = []
  for (const { lnk } of entries) {
    if (items.length >= limit) break
    let target = ''
    try {
      target = shell.readShortcutLink(lnk).target
    } catch {
      continue
    }
    if (!target || items.some((item) => item.path === target)) continue
    const item = await describe(target)
    if (item && !item.isDir) items.push(item)
  }
  return items
}

/** A 1×1 transparent image, for a drag whose file has no icon. */
const BLANK = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')

const isPath = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && path.isAbsolute(value)

export function registerFilesIpc() {
  ipcMain.handle('files:describe', async (_event, paths: unknown) =>
    (await Promise.all((Array.isArray(paths) ? paths : []).filter(isPath).map(describe))).filter(Boolean),
  )
  ipcMain.handle('files:recent', () => recent())
  ipcMain.handle('files:open', (_event, file: unknown) => (isPath(file) ? shell.openPath(file) : 'not a path'))
  ipcMain.handle('files:reveal', (_event, file: unknown) => {
    if (isPath(file)) shell.showItemInFolder(file)
  })
  // Dragging out: the renderer starts the gesture, the OS carries the real file.
  // On Windows startDrag runs the system's drag loop and returns when the drag
  // ends, so the reply says where the pointer let go — the renderer uses it to
  // tell a drop elsewhere (take the file off the shelf) from a drop back home.
  // One path, or several: "drag all" carries the whole shelf as one drag,
  // which Explorer, chat apps and mail take as a multi-file drop.
  ipcMain.handle('files:drag', (event, which: unknown) => {
    const files = (Array.isArray(which) ? which : [which]).filter((f): f is string => isPath(f) && fs.existsSync(f))
    if (!files.length) return null
    const file = files[0]
    const began = Date.now()
    event.sender.startDrag({ file, files, icon: icons.get(file) ?? BLANK })
    return { at: screen.getCursorScreenPoint(), blocked: Date.now() - began > 120 }
  })
}
