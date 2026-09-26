# deskNotch — functionality

Every feature, built or planned. Status marks what exists today, not what is intended.

**Status:** `[ ]` planned · `[~]` in progress · `[x]` done

Anything under Behaviour is togglable from the settings panel. None of it is
fixed — the user decides what runs.

---

## Collapsed bar

The always-visible strip, a fixed 240px. Space is tight, so these are glanceable indicators rather than controls. One thing at a time on the left, most urgent first.

- [x] **Focus countdown**: a tiny ring and the time left, while a session runs.
- [x] **Now playing**: album art and a pulse (no title: too much for the bar); the glance card shows art, title, a live progress line and controls. Tap the art to bring the player forward, maximised.
- [x] **Time**: 12-hour, on the left whenever no session or music is running.
- [x] **Task count**: pending tasks, beside the time when any exist.
- [x] **Right of the bar**: the time, or the AI limits as two rings (weekly outside, 5-hour inside) and `5h% / 7d%`, orange past 80%. Settings → Closed notch picks which; the time is not shown twice.
- [x] **Privacy dots**: orange while any app uses the microphone, green for the camera, from Windows' own ConsentStore records.
- [x] **Just connected moments**: headphones, a Wi-Fi network or a Bluetooth device connecting takes the bar for about a second and a half (icon, name, "Connected"), then it returns. No permanent Wi-Fi or Bluetooth icons.
- [x] **AI usage**: plan limits for Claude (session, week) and Codex (its plan's windows), % used, from the same endpoints as `/usage` and `/status`. A failed read keeps the last good one (saved across restarts) and backs off after a rate limit.
- [ ] **Weather icon**: current conditions at the user's location.
- [ ] **Battery**: charge level and charging state.
- [ ] **Bluetooth device battery**: headphones, mouse, controller.
- [ ] **Laptop temperature**: glanceable CPU/chassis thermal readout or warning icon when running hot.

## Expanded

Shown when the notch opens. Room for real controls.

- [x] **Companion**: a bot (or the user's photo) in one mode at a time, each with its own look and body language:
  - **Focus**: a timer in the companion's colour. `›` opens every length (1 to 60 minutes) and a custom one in minutes and seconds (5 s to 3 h, then Set). One pill starts, pauses, resumes; reset beside it. While it runs, a breathing dotted ring around the bot lights up clockwise and the bot watches its lit edge.
  - **Tasks**: the next task, tickable; tap the header to open the whole list, scrollable, with a New task line. Clicking anywhere on a row ticks it.
  - **Time**: clock and date; tap to open the day as a wave with the sun (or moon) riding it and the daylight left.
  - **AI**: the tightest limit as a counting number and a meter.
  - Still unless hovered; then it looks at and leans toward what its mode is about. Reacts to moments (a task done, a session starting or ending, a new track). Sleeps 23:00 to 06:00, when idle, or never; in Time mode it keeps the clock's night.
- [x] **Media controls**: play, pause and skip from the glance card, sent as the system media keys; the card glows with the artwork's colour.
- [x] **Todos**: add, tick, delete and clear on the desk (clicking a row ticks it); the next one on the glance, as a Reminders-style card with round checkboxes. Persisted to disk.
- [x] **AI usage monitor**: one card per tool (Claude, Codex), each window a globe filled by % used; hover shows what is left and when it resets; settings picks which windows. A card that cannot be read becomes a retry button.
- [x] **Screenshot catcher**: every capture Windows saves opens the closed notch on it for a few seconds, with a shutter flash: drag it anywhere, Keep it on the Shelf, Open it, or Discard it (to the Recycle Bin). A setting.
- [x] **Focus done**: when a session ends, the notch opens on its own card: the bot says "Done!" in a speech bubble, with how long you went and Again / Done.
- [x] **Apps bar**: a tray of apps, one tap to open: Windows' most used (by time in focus, top 12) or any number of favourites picked from every installed app. Four in view under the notch, two beside it; the rest scroll. Position: Auto, Left, Bottom or Right, never the same side as the tabs dock (Auto puts it on the right when the dock is below, else under the notch). On the views chosen in Settings (the Shelf by default).
- [~] **Calendar**: the date leads the time card. No events source yet.
- [ ] **Volume slider**
- [ ] **Stopwatch**
- [ ] **Clipboard history**
- [ ] **Weather**: fuller forecast than the collapsed icon.
- [ ] **Focus / DND toggle**
- [ ] **Notification peek**: notifications surface here instead of the corner.
- [ ] **Laptop temperature & thermals**

## Behaviour

All of these are settings, not hardcoded behaviour.

- [x] **Views**: Glance (up to 4 cards), Desk and Shelf, plus Settings. No top bar when open: the views, settings and the lock are circles on a small dock right against the notch, on the left, right or bottom (Settings → Controls), each naming itself on hover. Every view has the same tight 12px padding. The notch closes only once the pointer is clearly away and still heading away, so a view shrinking under the cursor never closes it.
- [x] **Shelf**: after the Mac notch shelves: drop files anywhere on the notch (even closed, which then opens and locks; a drop on the bar, or while it is still opening, still lands), they sit left to right with thumbnails inside a dashed well, the notch widens per file up to a limit and then scrolls. Drag one out and drop it elsewhere and it leaves the shelf. Clear all sits at the row's end. Recent and Pinned are built but parked (commented out).
- [x] **Desk**: the same companion card as the glance, always in Focus, beside the whole task list; as tall as the glance.
- [x] **Styles**: Default (a soft charcoal), Mica (the wallpaper, blurred and darkened, lined up with the notch, like Windows 11) and Glass (a live blur of whatever is behind, open or closed). The notch, the dock and the apps tray all wear the chosen material; only the background changes, never the content's colours. Glass hides the notch from screenshots and screen sharing while it is on.
- [x] **Hide tabs**: Glance, Desk and Shelf can each be taken off the dock; Settings and the lock always stay.
- [x] **Pin open** — clicking the collapsed bar holds the notch open, so it does
  not close while typing or reading.
- [x] **Click-through** — the strip only takes clicks over the notch itself;
  everything else passes through to the window underneath.
- [x] **Ambient glow** — a looping light along the bottom edge while music plays.
- [x] **Album tint** — the shell picks up colour from the current artwork.

- [x] **Auto-expand on event**: opens by itself on a finished focus session and on a new screenshot, then folds away (hovering keeps it; using it closes it).
- [ ] **Multi-monitor support** — the notch is pinned to the primary display
  and does not follow a change of monitor.
- [x] **Startup on boot** — registers with Windows via `setLoginItemSettings`.
- [ ] **Hide on fullscreen** — stays out of the way during video and games.
- [ ] **Tray icon + quit** — the app is frameless, so this is the only way out.
- [x] **Settings panel**: laid out like System Settings: a sidebar of sections (Glance, Companion, Closed notch, Apps, Tabs & dock, Appearance, General), one section at a time as grouped rows, each with a one-line explanation and one control. A side taken by the dock or the apps bar is greyed out for the other.
- [ ] **Keyboard shortcut to open** — the notch is hover-only otherwise, so there
  is no way to reach it without the mouse.

---

## What each feature needs

How the built ones reach Windows (media, the player, the shelf, screenshots, privacy dots, Wi-Fi and Bluetooth, most used apps) is drawn out in [HowItWorks.md](HowItWorks.md).

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
| Headphones connected | Done without native code: the browser's `devicechange` over Windows' audio devices |
| Hide on fullscreen | Win32 window query |
| Mic / camera in-use dot | Done: the ConsentStore registry, read by PowerShell (see caveat) |
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

### Announce, then settle (partly built)

When a device connects, show its icon briefly, then let it shrink into a small
persistent dot. The icon says what happened; the dot says it is still true.

The collapsed bar has very little room, so a permanent icon per device does not
scale. An icon that announces itself and then settles into a dot costs almost no
space once the moment has passed.

Bluetooth is the first case. The same shape fits anything that connects,
finishes or changes state — headphones, chargers, a finished timer, a completed
download. Worth building once as a shared component rather than per feature.

Built so far: the announce half, for headphones, Wi-Fi and Bluetooth (the "just connected" moment). Undecided: whether it should settle into a persistent dot, whether dots stack, and what a click on one does.

### Lower priority

- ~~**Pomodoro**~~: built, as the companion's Focus mode.
- ~~**Quick launch**~~: built, as the apps bar's favourites.
- **Themes** — accent color, notch dimensions.
- **Idle auto-collapse** — closes itself after a period untouched.
