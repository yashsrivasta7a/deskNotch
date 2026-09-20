/** Every IPC handler the app registers, in one call. */
import { registerStoreIpc } from './store'
import { registerPhotoIpc } from './photo'
import { registerSystemIpc } from './system'
import { registerSettingsIpc } from './settings'

export function registerIpc() {
  registerStoreIpc()
  registerPhotoIpc()
  registerSystemIpc()
  registerSettingsIpc()
}
