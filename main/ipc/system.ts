/** Readings about the machine itself. */
import { ipcMain } from 'electron'
import os from 'os'

export function registerSystemIpc() {
  /** Memory pressure and uptime, read from Node rather than a native module. */
  ipcMain.handle('system:stats', () => {
    const total = os.totalmem()
    const free = os.freemem()

    return {
      memoryUsed: (total - free) / total,
      uptimeSeconds: os.uptime(),
    }
  })
}
