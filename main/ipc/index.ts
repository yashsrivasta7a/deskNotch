/** Every IPC handler the app registers, in one call. */
import { registerStoreIpc } from './store'
import { registerPhotoIpc } from './photo'
import { registerSystemIpc } from './system'
import { registerSettingsIpc } from './settings'
import { registerLimitsIpc } from './limits'
import { registerMediaIpc } from './media'
import { registerAppsIpc } from './apps'

export function registerIpc() {
  registerStoreIpc()
  registerPhotoIpc()
  registerSystemIpc()
  registerSettingsIpc()
  registerLimitsIpc()
  registerMediaIpc()
  registerAppsIpc()
}
