# deskNotch — functionality

Planned features. Status marks what exists today, not what is intended.

**Status:** `[ ]` planned · `[~]` in progress · `[x]` done

Anything under Behaviour is togglable from the settings panel. None of it is
fixed — the user decides what runs.

---

## Collapsed bar

The always-visible strip. Space is tight, so these are glanceable indicators
rather than controls.

- [ ] **Mic / camera in-use dot** — privacy indicator; shows when something is recording.
- [x] **Now playing** — current track, with album art in the collapsed bar.
- [ ] **Weather icon** — current conditions at the user's location.
- [ ] **Timer** — remaining time, shown only while a timer is running.
- [x] **Task count** — pending tasks, shown in the collapsed bar when any exist.
- [ ] **Headphone icon** — shown when headphones are connected.
- [ ] **Battery** — charge level and charging state.
- [ ] **Bluetooth device battery** — headphones, mouse, controller.

## Expanded

Shown when the notch opens. Room for real controls.

- [~] **Media controls** — album art, progress and buttons are built; the buttons
  are not wired up yet. See the caveat below.
- [ ] **Volume slider**
- [~] **Calendar** — the week, scrollable a day at a time. Events are not
  wired to a source yet, so it shows dates only.
- [x] **Timer** — presets plus a free-entry field, digits on a rolling counter.
- [ ] **Stopwatch**
- [x] **Todos** — add, complete and clear, persisted to disk.
- [ ] **Clipboard history**
- [ ] **Weather** — fuller forecast than the collapsed icon.
- [ ] **Screenshot tools**
- [ ] **Focus / DND toggle**
- [ ] **Notification peek** — notifications surface here instead of the corner.

## Behaviour

All of these are settings, not hardcoded behaviour.

- [x] **Views** — the notch holds several screens (glance, tasks, settings) with
  a rail to switch between them, rather than one crowded row.
- [x] **Pin open** — clicking the collapsed bar holds the notch open, so it does
  not close while typing or reading.
- [x] **Click-through** — the strip only takes clicks over the notch itself;
  everything else passes through to the window underneath.
- [x] **Ambient glow** — a looping light along the bottom edge while music plays.
- [x] **Album tint** — the shell picks up colour from the current artwork.

- [ ] **Auto-expand on event** — opens on a finished timer or an alarm. Togglable.
- [ ] **Multi-monitor support** — the notch is pinned to the primary display
  and does not follow a change of monitor.
- [x] **Startup on boot** — registers with Windows via `setLoginItemSettings`.
- [ ] **Hide on fullscreen** — stays out of the way during video and games.
- [ ] **Tray icon + quit** — the app is frameless, so this is the only way out.
- [x] **Settings panel** — which panels appear in the glance row, plus
  appearance and start-on-boot.
- [ ] **Keyboard shortcut to open** — the notch is hover-only otherwise, so there
  is no way to reach it without the mouse.

---

## What each feature needs

Most of this list needs no native Windows code. Worth knowing before reaching
for a native library.

### Electron built-in

| Feature | API |
|---|---|
| Clipboard history | `clipboard` (main process only) |
| Screenshot tools | `desktopCapturer` |
| Multi-monitor | `screen` |
| Tray + quit | `Tray` |
| Startup on boot | `app.setLoginItemSettings()` |
| Keyboard shortcut | `globalShortcut` |
| Notes, todos, timer, calendar UI, settings | React + a JSON file |

### Plain web APIs

| Feature | API |
|---|---|
| Battery (laptop) | `navigator.getBattery()` |
| Weather | `fetch` against a weather API |

### Needs native Windows access

| Feature | Needs |
|---|---|
| Now playing, media controls | SMTC |
| Volume slider | Core Audio, or a small npm package |
| Headphones connected | WinRT device enumeration |
| Hide on fullscreen | Win32 window query |
| Mic / camera in-use dot | Registry or WinRT — see caveat |
| Bluetooth device battery | WinRT — see caveat |

### Library choice

**`node-windows-smtc-monitor`** for media. Purpose-built, Rust/napi-rs bindings,
event-based rather than polled, and covers both reading now-playing and sending
controls.

**NodeRT** is a general WinRT bridge — powerful, but it generates a module per
Windows namespace and needs a native rebuild against each Electron version. Add
it when a specific feature requires a namespace nothing else wraps, not as a
foundation.

Unrelated but easy to trip over: Electron does not enable Chromium's
`HardwareMediaKeyHandling` and `MediaSessionService` flags, so `mediaSession`
does not register an Electron app as a media source on Windows. That concerns
*publishing* media info, not reading it, and does not affect now-playing.

### Media controls are read-only for now

`@coooookies/windows-smtc-monitor` only *observes* SMTC. It reports play, pause
and track changes but exposes no method to trigger them, so the buttons in the
expanded view are inert.

Sending media keys on Windows means a `keybd_event` Win32 call, which needs a
native binding this project does not have yet. The buttons already take
`onPrevious` / `onPlayPause` / `onNext` props, so wiring them is a small change
once that exists.

### Two features that may not fully work

**Bluetooth device battery.** UWP exposes no battery API for Bluetooth Classic
devices, which is what most headphones are. Web Bluetooth reads battery only
from BLE devices advertising the battery GATT service. No library choice fixes
this — expect partial coverage at best.

**Mic / camera in-use dot.** Windows has no supported API for this. It can be
read from the registry under `CapabilityAccessManager\ConsentStore`, but classic
apps can access the microphone without going through the privacy service and
will not appear there. Best-effort, not reliable.

---

## Ideas

### Announce, then settle

When a device connects, show its icon briefly, then let it shrink into a small
persistent dot. The icon says what happened; the dot says it is still true.

The collapsed bar has very little room, so a permanent icon per device does not
scale. An icon that announces itself and then settles into a dot costs almost no
space once the moment has passed.

Bluetooth is the first case. The same shape fits anything that connects,
finishes or changes state — headphones, chargers, a finished timer, a completed
download. Worth building once as a shared component rather than per feature.

Undecided: how long the icon holds before collapsing, whether dots stack when
several things are connected, and what a click on a dot does.

### Lower priority

- **Pomodoro** — a timer mode, given timers are already in scope.
- **Quick launch** — a few pinned apps or folders.
- **Themes** — accent color, notch dimensions.
- **Idle auto-collapse** — closes itself after a period untouched.
