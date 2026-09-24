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
- [x] **Now playing** — album art and a pulse in the collapsed bar (no title: too much for the bar); the glance card shows art, title, a live progress line and controls. Tap the art to bring the player forward, maximised.
- [ ] **Weather icon** — current conditions at the user's location.
- [ ] **Timer** — remaining time, shown only while a timer is running.
- [x] **Task count** — pending tasks, shown in the collapsed bar when any exist.
- [ ] **Headphone icon** — shown when headphones are connected.
- [ ] **Battery** — charge level and charging state.
- [ ] **Bluetooth device battery** — headphones, mouse, controller.
- [ ] **Laptop temperature** — glanceable CPU/chassis thermal readout or warning icon when running hot.
- [x] **AI usage** — plan limits for Claude (session, week) and Codex (its plan's windows), % used, from the same endpoints as `/usage` and `/status`.

## Expanded

Shown when the notch opens. Room for real controls.

- [x] **Media controls** — play, pause and skip from the glance card, sent as the system media keys.
- [ ] **Volume slider**
- [~] **Calendar** — the date leads the time card; the desk shows this week as focus minutes per day. No events source yet.
- [x] **Focus** — a Pomodoro card in the glance: the breathing ring fills in green beside the countdown and the task it is for, tickable in place; tap the card to start or pause. The Today view picks 15/25/50, pauses, adds time. A tiny ring and countdown take over the collapsed bar while it runs.
- [ ] **Stopwatch**
- [x] **Todos** — add, complete, delete and clear on the desk; the next one shows in the glance, tickable, with quick-add from the task or focus card. Persisted to disk.
- [ ] **Clipboard history**
- [ ] **Weather** — fuller forecast than the collapsed icon.
- [ ] **Screenshot tools**
- [ ] **Focus / DND toggle**
- [ ] **Notification peek** — notifications surface here instead of the corner.
- [ ] **Laptop temperature & thermals** — real-time CPU/GPU temperatures alongside memory and battery in the System Glance panel.
- [x] **Companion** — a bot (or the user's photo) with something to show, each thing a mode with its own control: focus (a small timer in the companion's own colour: ‹ › picks a length from 1 minute to an hour, or tap the card for every length and a custom one; one pill starts, pauses, resumes; reset beside it; while it runs a breathing dotted ring around the bot lights up clockwise and the bot watches its lit edge), the next task (tick to finish), the time, an AI limit. Cycles through whichever settings picks (any mix; AI works even with the AI card off), holding on a live session. Tap to open it into a hub with the next tasks and an add field. Reacts to moments — a task done, a session starting or ending, a new track — and otherwise keeps still. Sleeps 23:00–06:00, when idle, or never; a setting. A small one sits in the collapsed bar.
- [~] **AI usage monitor** — one card per tool (Claude, Codex), each window a globe filled by % used; hover shows used, left and reset time; settings picks which windows. Provider API spend and local NPU/GPU load are not.

## Behaviour

All of these are settings, not hardcoded behaviour.

- [x] **Views** — glance (a row of up to 4 glass cards — thin panes for the readings, a fuller tinted glass for the companion: companion, now playing or the time, next task, focus, AI limits per tool), desk and settings, on the same glass. Tabs at the left of the top bar; a gear and a lock at the right.
- [x] **Desk** — one scene: the companion on its own card, lit by its colour, with the session's arc around it and the numerals beneath; the task list as plain text beside it (add, tick, delete, done folded away behind a word); a dock of every app with a window open (hover names it, click brings it forward); a line of facts underneath — the week's focus minutes and every AI window with its reset.
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
- [x] **Settings panel** — a plain page, like the desk: what the glance shows (up to 4 cards), the companion (which bot or photo, what it says, when it sleeps), notch style, ambient glow, album tint and start-on-boot.
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
| AI API token tracking | `fetch` against AI provider usage APIs / local Ollama endpoint |

### Needs native Windows access

| Feature | Needs |
|---|---|
| Now playing, media controls | SMTC |
| Volume slider | Core Audio, or a small npm package |
| Headphones connected | WinRT device enumeration |
| Hide on fullscreen | Win32 window query |
| Mic / camera in-use dot | Registry or WinRT — see caveat |
| Bluetooth device battery | WinRT — see caveat |
| Laptop temperature | WMI (`MSAcpi_ThermalZoneTemperature`), `systeminformation`, or LibreHardwareMonitor — see caveat |
| Local AI / NPU usage | Windows Performance Counters (PDH) / Task Manager NPU metrics — see caveat |

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

### Media controls

`@coooookies/windows-smtc-monitor` only *observes* SMTC, so the buttons send
the system media keys instead (`keybd_event` through user32, from one
PowerShell kept alive for the purpose). Every player honours those whether or
not it has focus, and SMTC reports the change back within a moment.

### Features that need caveats or special handling

**Bluetooth device battery.** UWP exposes no battery API for Bluetooth Classic
devices, which is what most headphones are. Web Bluetooth reads battery only
from BLE devices advertising the battery GATT service. No library choice fixes
this — expect partial coverage at best.

**Mic / camera in-use dot.** Windows has no supported API for this. It can be
read from the registry under `CapabilityAccessManager\ConsentStore`, but classic
apps can access the microphone without going through the privacy service and
will not appear there. Best-effort, not reliable.

**Laptop temperature.** Windows exposes no simple, unprivileged API for CPU core
temperatures. `MSAcpi_ThermalZoneTemperature` via WMI often returns static readings
or is unsupported on modern laptop hardware without OEM ACPI drivers; per-core
temperatures usually need ring-0 driver access (e.g. LibreHardwareMonitor or
WinRing0) or a helper tool like `systeminformation`. WMI queries are also
notoriously slow and synchronous, so reading thermals must run in a worker thread
to avoid hitching the notch animation.

**AI usage.** Has two distinct directions with different requirements:
- *Cloud API tokens / spend*: Polling provider usage endpoints (OpenAI, Anthropic,
  Gemini) or a local proxy to track daily tokens and cost limits.
- *Local model / NPU compute*: Querying Windows Performance Counters (PDH) or
  DirectML compute engines to measure active local LLM inference and NPU engine
  utilization.

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
