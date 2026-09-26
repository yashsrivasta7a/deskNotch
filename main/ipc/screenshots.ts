/**
 * Screenshots, as they are taken. Windows 11's Snipping Tool (Win+Shift+S,
 * Print Screen) saves every capture to Pictures\Screenshots, so watching that
 * folder catches them as real files, ready to drag out or keep, for the cost
 * of a folder watch.
 *
 * ponytail: a capture copied to the clipboard only (auto-save switched off
 * in Snipping Tool) is missed; watching the clipboard would catch it.
 */
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import fs from 'fs'
import path from 'path'

const IMAGE = /\.(png|jpe?g)$/i

const folders = () =>
  [path.join(app.getPath('pictures'), 'Screenshots'), process.env.OneDrive && path.join(process.env.OneDrive, 'Pictures', 'Screenshots')]
    .filter((dir): dir is string => Boolean(dir) && fs.existsSync(dir as string))
    .filter((dir, i, all) => all.indexOf(dir) === i)

const watchers: fs.FSWatcher[] = []
const seen = new Set<string>()

/** Waits until the file stops growing: the tool writes it in more than one go. */
const settled = async (file: string) => {
  let last = -1
  for (let i = 0; i < 20; i++) {
    const size = await fs.promises.stat(file).then((s) => s.size, () => -1)
    if (size > 0 && size === last) return true
    last = size
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  return false
}

/** Discards a capture: to the Recycle Bin, so a slip can be undone. Only files
 *  in the screenshot folders, so this can never be pointed anywhere else. */
ipcMain.handle('screenshot:discard', async (_event, file: unknown) => {
  if (typeof file !== 'string') return false
  const resolved = path.resolve(file)
  if (!IMAGE.test(resolved) || !folders().some((dir) => path.dirname(resolved) === path.resolve(dir))) return false
  await shell.trashItem(resolved)
  return true
})

export function startScreenshotWatch() {
  for (const dir of folders()) {
    try {
      watchers.push(
        fs.watch(dir, async (_event, name) => {
          if (!name || !IMAGE.test(name)) return
          const file = path.join(dir, name.toString())
          if (seen.has(file)) return
          seen.add(file)
          // Only new captures: a rename or touch of an old file is not one.
          const born = await fs.promises.stat(file).then((s) => s.birthtimeMs, () => 0)
          if (Date.now() - born > 10_000 || !(await settled(file))) return
          for (const window of BrowserWindow.getAllWindows()) window.webContents.send('screenshot:new', file)
        }),
      )
    } catch (error) {
      console.warn('[screenshots] cannot watch', dir, (error as Error).message)
    }
  }
}

export function stopScreenshotWatch() {
  for (const watcher of watchers.splice(0)) watcher.close()
}
