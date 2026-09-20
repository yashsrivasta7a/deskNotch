/** Generic get/set over the persisted store. */
import { ipcMain } from 'electron'
import { readStore, writeStore, type StoreShape } from '../store'

export function registerStoreIpc() {
  ipcMain.handle('store:get', (_event, key: keyof StoreShape) => readStore()[key])

  ipcMain.handle('store:set', (_event, key: keyof StoreShape, value: unknown) => {
    writeStore({ ...readStore(), [key]: value } as StoreShape)
    return true
  })
}
