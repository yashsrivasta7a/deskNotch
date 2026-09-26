/**
 * The status the closed notch shows at its edge: privacy dots (whether any app
 * is using the microphone or camera right now), Wi-Fi, and Bluetooth.
 *
 * - Microphone and camera: Windows keeps this itself, for its own tray icon.
 *   Under ConsentStore, every app that asked for a device has
 *   LastUsedTimeStart/Stop, and a Stop of 0 means "still using it".
 * - Wi-Fi: `netsh wlan show interfaces`, the network name and signal.
 * - Bluetooth: the paired devices whose "is connected" property is true.
 *
 * One PowerShell stays alive and prints a line only when something changes,
 * so an idle check costs nothing on this side.
 *
 * ponytail: polled (privacy 1.5 s, Wi-Fi ~10 s, Bluetooth ~30 s, since asking
 * every Bluetooth device takes a second or two) rather than watched; native
 * watchers would need a native module, add one if the lag matters.
 */
import { BrowserWindow, ipcMain } from 'electron'
import { type ChildProcess, spawn } from 'child_process'

export interface PrivacyState {
  mic: boolean
  camera: boolean
  /** The Wi-Fi network, when connected. */
  wifi: { name: string; signal: number } | null
  /** Names of connected Bluetooth devices. */
  bluetooth: string[]
}

let state: PrivacyState = { mic: false, camera: false, wifi: null, bluetooth: [] }
let watcher: ChildProcess | null = null

const SCRIPT = (parent: number) => `
$base = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore'
function Live($device) {
  [int][bool](Get-ChildItem "$base\\$device" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.GetValue('LastUsedTimeStop') -eq 0 -and $_.GetValue('LastUsedTimeStart') -gt 0 } |
    Select-Object -First 1)
}
function Wifi {
  $lines = netsh wlan show interfaces 2>$null
  $s = ($lines | Select-String '^\\s+State\\s+:\\s+(.+)$' | Select-Object -First 1).Matches.Groups[1].Value
  if ($s -ne 'connected') { return '' }
  $ssid = ($lines | Select-String '^\\s+SSID\\s+:\\s+(.+)$' | Select-Object -First 1).Matches.Groups[1].Value
  $sig = ($lines | Select-String '^\\s+Signal\\s+:\\s+(\\d+)%' | Select-Object -First 1).Matches.Groups[1].Value
  "$ssid|$sig"
}
function Bluetooth {
  $devs = Get-PnpDevice -Class Bluetooth -PresentOnly -ErrorAction SilentlyContinue |
    Where-Object { $_.FriendlyName -notmatch 'Enumerator|Radio|Adapter|Transport|Service|Protocol|RFCOMM|Generic|Avrcp|Wireless Bluetooth' }
  if (-not $devs) { return '' }
  $on = $devs | Get-PnpDeviceProperty -KeyName '{83DA6326-97A6-4088-9453-A1923F573B29} 15' -ErrorAction SilentlyContinue |
    Where-Object { $_.Data -eq $true } | ForEach-Object { $id = $_.InstanceId; ($devs | Where-Object InstanceId -eq $id).FriendlyName }
  ($on | Select-Object -Unique) -join ';'
}
$last = ''; $tick = 0; $wifi = ''; $bt = ''
while ($true) {
  if (-not (Get-Process -Id ${parent} -ErrorAction SilentlyContinue)) { exit }
  if ($tick % 7 -eq 0) { $wifi = Wifi }
  if ($tick % 20 -eq 0) { $bt = Bluetooth }
  $now = "$(Live 'microphone'),$(Live 'webcam')\`t$wifi\`t$bt"
  if ($now -ne $last) { [Console]::Out.WriteLine($now); [Console]::Out.Flush(); $last = $now }
  $tick++
  Start-Sleep -Milliseconds 1500
}`

/** "1,0<TAB>Home|90<TAB>Buds;Mouse" → the state. */
const parse = (line: string): PrivacyState | null => {
  const [devices, wifi = '', bt = ''] = line.split('\t')
  const [mic, camera] = devices.split(',')
  if (camera === undefined) return null
  const [name, signal] = wifi.split('|')
  return {
    mic: mic === '1',
    camera: camera === '1',
    wifi: wifi ? { name, signal: Number(signal) || 0 } : null,
    bluetooth: bt ? bt.split(';').filter(Boolean) : [],
  }
}

const start = () => {
  if (watcher) return
  watcher = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', SCRIPT(process.pid)], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  let buffer = ''
  watcher.stdout?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const next = parse(line.trim())
      if (!next) continue
      state = next
      for (const window of BrowserWindow.getAllWindows()) window.webContents.send('privacy:state', state)
    }
  })
  watcher.on('exit', () => {
    watcher = null
  })
}

export function registerPrivacyIpc() {
  // The first ask starts the watcher; the answer after that comes as events.
  ipcMain.handle('privacy:get', () => {
    start()
    return state
  })
}

export function stopPrivacyIpc() {
  watcher?.kill()
  watcher = null
}
