/** Settings that have to be applied to the OS, not just remembered. */
import { app, ipcMain, shell } from 'electron'

/** The Microsoft Store build, which Windows starts through a declared startup
 *  task (electron-builder.yml `addAutoLaunchExtension`), not a login item. */
const store = process.windowsStore === true

export function registerSettingsIpc() {
  // A dev run is electron.exe plus a dev server: registered at login, Windows
  // launches bare electron.exe and shows Electron's default app instead of the
  // notch. So only the installed app registers, and a dev run clears any entry
  // an earlier dev run left behind.
  if (!app.isPackaged) app.setLoginItemSettings({ openAtLogin: false })

  ipcMain.handle('app:is-store', () => store)
  // A fixed address, not one from the page: the renderer can only open this.
  ipcMain.handle('app:open-repo', () => shell.openExternal('https://github.com/yashsrivasta7a/deskNotch'))
  ipcMain.handle('app:open-support', () => shell.openExternal('https://github.com/sponsors/yashsrivasta7a'))
  // The Store build's switch: Windows' own Startup apps page, where its task is.
  ipcMain.handle('settings:open-startup', () => shell.openExternal('ms-settings:startupapps'))

  ipcMain.handle('settings:start-on-boot', (_event, enabled?: unknown) => {
    if (!app.isPackaged || store) return false
    if (typeof enabled === 'boolean') {
      app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath })
    }
    return app.getLoginItemSettings({ path: process.execPath }).openAtLogin
  })

  /** Close deskNotch until the user opens it again. */
  ipcMain.on('app:quit', () => app.quit())
}
