import { useCallback, useEffect, useRef, useState } from 'react'

/** Mirrors FileItem in main/ipc/files.ts. */
export interface FileItem {
  path: string
  name: string
  isDir: boolean
  icon: string | null
  thumb: string | null
}

/**
 * A kept list of files — the shelf, or the pins — saved to the store under
 * `key`. Adding a path that is already there moves it to the end.
 */
export function useFileList(key: 'shelf' | 'pins') {
  const [items, setItems] = useState<FileItem[]>([])
  const loaded = useRef(false)

  useEffect(() => {
    window.bridge
      ?.invoke<string[]>('store:get', key)
      .then((paths) => window.bridge?.invoke<FileItem[]>('files:describe', paths ?? []))
      .then((list) => setItems(list ?? []))
      .catch(() => setItems([]))
      .finally(() => {
        loaded.current = true
      })
  }, [key])

  useEffect(() => {
    if (!loaded.current) return
    void window.bridge?.invoke('store:set', key, items.map((item) => item.path))
  }, [items, key])


  const add = useCallback(async (paths: string[]) => {
    const found = (await window.bridge?.invoke<FileItem[]>('files:describe', paths)) ?? []
    // Left to right in the order they arrive: new files join the right end.
    setItems((prev) => [...prev.filter((item) => !found.some((f) => f.path === item.path)), ...found])
  }, [])

  // A file dropped anywhere on the notch, not just on the shelf's well, is
  // announced as 'shelf:add'; the shelf takes it and says so (preventDefault).
  useEffect(() => {
    if (key !== 'shelf') return
    const take = (event: Event) => {
      event.preventDefault()
      void add((event as CustomEvent<string[]>).detail)
    }
    window.addEventListener('shelf:add', take)
    return () => window.removeEventListener('shelf:add', take)
  }, [key])

  const remove = useCallback((file: string) => setItems((prev) => prev.filter((item) => item.path !== file)), [])

  /** Empties the list, the last file first, a beat apart, so it is swept away
   *  rather than blinking out. */
  const clear = useCallback(() => {
    setItems((prev) => {
      prev
        .slice()
        .reverse()
        .forEach((item, i) => setTimeout(() => setItems((now) => now.filter((x) => x.path !== item.path)), i * 45))
      return prev
    })
  }, [])

  return { items, add, remove, clear }
}

/** Windows' recent files, read while `enabled`. */
export function useRecentFiles(enabled: boolean) {
  const [items, setItems] = useState<FileItem[] | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const read = () =>
      window.bridge
        ?.invoke<FileItem[]>('files:recent')
        .then((list) => !cancelled && setItems(list))
        .catch(() => !cancelled && setItems([]))
    void read()
    const timer = setInterval(read, 15000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [enabled])

  return items
}

export const openFile = (file: string) => void window.bridge?.invoke('files:open', file)
export const revealFile = (file: string) => void window.bridge?.invoke('files:reveal', file)
/**
 * Drags a file out. Resolves true when it was let go somewhere other than
 * `home` (the element it came from) — a real drop — and false when it came
 * back. If the drag could not be followed to its end, it counts as out.
 */
export const dragFile = async (file: string, home: Element | null) => {
  const result = await window.bridge?.invoke<{ at: { x: number; y: number }; blocked: boolean } | null>('files:drag', file)
  if (!result) return false
  if (!result.blocked || !home) return true
  const r = home.getBoundingClientRect()
  const x = result.at.x - window.screenX
  const y = result.at.y - window.screenY
  return !(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
}

/** The real paths of files dropped on the page. */
export const droppedPaths = (event: React.DragEvent) =>
  Array.from(event.dataTransfer.files)
    .map((file) => window.bridge?.pathOf(file) ?? '')
    .filter(Boolean)
