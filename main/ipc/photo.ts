/** The user's chosen photo: picking it, and keeping it. */
import { dialog, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { readStore, writeStore } from '../store'

export function registerPhotoIpc() {
  /** Opens a picker and returns the chosen image as a data URL, or null if the
   *  dialog was dismissed. Reading happens here because the renderer has no
   *  filesystem access. */
  ipcMain.handle('photo:pick', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    })

    const filePath = result.filePaths[0]
    if (result.canceled || !filePath) return null

    try {
      const extension = path.extname(filePath).slice(1).toLowerCase()
      const mime = extension === 'jpg' ? 'jpeg' : extension
      const data = fs.readFileSync(filePath).toString('base64')
      const dataUrl = `data:image/${mime};base64,${data}`

      writeStore({ ...readStore(), photo: dataUrl })
      return dataUrl
    } catch (error) {
      console.error('[photo] could not read image:', error)
      return null
    }
  })
}
