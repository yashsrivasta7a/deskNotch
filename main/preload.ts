import { contextBridge, ipcRenderer, IpcRendererEvent, webUtils } from 'electron'

const handler = {
  send<T>(channel: string, value?: T) {
    ipcRenderer.send(channel, value)
  },
  /** Ask the main process for a value and wait for its reply. */
  invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
    return ipcRenderer.invoke(channel, ...args)
  },
  /** The real path of a file dropped on the page (Electron no longer puts it on File). */
  pathOf(file: File) {
    return webUtils.getPathForFile(file)
  },
  on<T>(channel: string, callback: (...args: T[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: T[]) =>
      callback(...args)
    ipcRenderer.on(channel, subscription)

    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
}

contextBridge.exposeInMainWorld('bridge', handler)

export type IpcHandler = typeof handler
