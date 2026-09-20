/** Settings that have to be applied to the OS, not just remembered. */
import { app, ipcMain } from 'electron'

export function registerSettingsIpc() {
  ipcMain.handle('settings:start-on-boot', (_event, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
    return app.getLoginItemSettings().openAtLogin
  })
}
