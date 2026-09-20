# deskNotch — design notes

Notes on the two decisions that shape this codebase, written down so they don't
have to be re-derived later.

---

## 1. Why the notch lives in the renderer, not the main process

### The change

The window used to *be* the notch: a 240×30 `BrowserWindow`, positioned at the
centre of the screen's top edge.

Now the window is an invisible strip spanning the full screen width, 400px tall,
and the notch is a `<div>` drawn inside it.

```
Before:                        After:
┌────┐  window = notch         ┌──────────────────────────┐ window (invisible)
│▓▓▓▓│  240×30                 │         ┌────┐           │ full width × 400
└────┘                         │         │▓▓▓▓│           │ notch = div
                               │         └────┘           │
                               └──────────────────────────┘
```

### Why

**Smooth expansion is otherwise impossible.** `setBounds` resizes a window in
discrete steps on the compositor's schedule — no easing, and it tears against a
transparent window. There is no version of window-resizing that looks like the
Apple notch. A CSS transition runs on the GPU with real easing. This is the
reason that matters; the rest are bonuses.

**The main process can't hot-reload.** A `BrowserWindow` is constructed once
with its options; editing the source doesn't change a live window, so every
tweak costs a full Electron restart. CSS hot-reloads. Since the notch's size,
shape and animation are now CSS, they hot-reload too — `main.ts` is set once and
then left alone.

**A renderer crash doesn't kill the app.** Main-process errors take the whole
process down. Keeping the frequently-edited, experimental code in the renderer
means a mistake costs one window, not the app.

### What goes where now

| Thing | Where | Restart needed? |
|---|---|---|
| Notch width, height, radius | `NotchChassis.tsx` | No |
| Expand size and animation | `NotchChassis.tsx` | No |
| Centering | `home.tsx` | No |
| Strip height (`STRIP_HEIGHT`) | `main.ts` | Yes |
| Click-through, always-on-top | `main.ts` | Yes |

**The one constraint:** the notch can only animate *within* the strip. It is
400px tall, so an expanded height of 380 is fine and 420 gets clipped. Raising
that limit is the one visual change that still needs a `main.ts` edit.

### The cost

An invisible full-width window sitting over the top of the screen would swallow
every click meant for the windows underneath. `setIgnoreMouseEvents(true,
{ forward: true })` makes it click-through; the renderer then tells the main
process when the cursor is actually over the notch, and clicks are handed back
for as long as it stays there.

`forward: true` is load-bearing. It keeps delivering mouse-move events to the
renderer while click-through is on, which is what lets `onMouseEnter` fire at
all. Without it the notch is permanently dead.

---

## 2. `setAlwaysOnTop(flag, level)`

### The levels

Lowest to highest:

| Level | What it means |
|---|---|
| `normal` | Not on top — ordinary stacking. The default when `flag` is false. |
| `floating` | Above normal windows. What a plain `alwaysOnTop: true` gives you. |
| `torn-off-menu` | Above floating — for menus dragged off a menu bar. |
| `modal-panel` | Above torn-off menus — for modal dialogs. |
| `main-menu` | Above modal panels — the level of the system menu bar. |
| `status` | Above the main menu — status-bar items. |
| `pop-up-menu` | Above status items — open dropdown menus. |
| `screen-saver` | The top of the stack. What deskNotch uses. |

A third argument, `relativeLevel`, shifts a window N levels above the one named.
macOS only.

### The catch on Windows

**These are macOS window levels.** Windows has no equivalent ladder — it has
roughly two states, topmost or not. Electron collapses the whole list onto that,
so `floating` and `screen-saver` behave identically here.

`screen-saver` is used anyway: it costs nothing, and it is the correct level if
this ever runs on macOS.

What this does *not* fix: a game in exclusive fullscreen bypasses the compositor
entirely and will cover the notch no matter what level is set. That needs a
different approach, not a higher level.

---

## 3. Main, renderer, and talking between them

### Two processes

Electron runs two separate OS processes, and most confusion here comes from
forgetting which one a piece of code is in.

```
MAIN PROCESS                    RENDERER PROCESS
Node.js                         Chromium (a browser tab)

fs, os, child_process           React, DOM, CSS
BrowserWindow, Tray, Menu       window, document

no DOM                          no fs, no os

main/main.ts                    renderer/**
```

**Main** is Node: files, OS access, and window management. It has no DOM.
**Renderer** is a browser tab: React runs here. It has no Node APIs.

They share no memory. The only way across is a message.

The split is for security — the renderer runs web content, so handing it `fs`
would let any script loaded there read the disk.

### The preload bridge

The renderer sometimes needs the main process to do something for it, without
being handed everything. That is what `main/preload.ts` is for: it runs before
the renderer and can see both sides.

```ts
// main/preload.ts
contextBridge.exposeInMainWorld('ipc', handler)
```

This puts `window.ipc` in the renderer, exposing only what `handler` contains —
not `ipcRenderer` itself, and not `fs`. Whatever is added there is the entire
surface the renderer gets.

### One-way: `send` / `on`

Fire a message, expect nothing back. The hover handling already in this codebase
works this way — the renderer cannot call `setIgnoreMouseEvents` itself, because
that is a window API and windows live in main.

```ts
// renderer — NotchChassis.tsx
window.ipc?.send('notch:hover', over)

// main — main.ts
ipcMain.on('notch:hover', (_event, isOver: boolean) => {
  mainWindow.setIgnoreMouseEvents(!isOver, { forward: true })
})
```

`'notch:hover'` is just a channel name. It only has to match on both sides.

### Two-way: `invoke` / `handle`

When the renderer needs an answer, `invoke` returns a promise and `handle`'s
return value resolves it.

```ts
// renderer
const battery = await window.ipc.invoke('battery:get')

// main
ipcMain.handle('battery:get', async () => {
  return { level: 80, charging: true }
})
```

All three are exposed by the preload. Anything not listed in that handler is
unavailable to the renderer, so a new pattern means adding it there first.

### Which one to reach for

| Need | Pattern |
|---|---|
| Tell main to do something | `send` / `on` |
| Ask main for a value | `invoke` / `handle` |
| Main pushes an update to the renderer | `webContents.send` / `on` |

---

## 4. Why SMTC runs in a worker thread

`SMTCMonitor` blocks whatever thread it runs on. The main thread owns the
window, so blocking it freezes the notch — and the renderer with it, since its
messages arrive through main. The library's own docs are explicit about this.

A worker does not make the blocking go away; it puts it somewhere nothing else
is waiting.

```
WORKER THREAD           MAIN PROCESS            RENDERER
smtc-worker.ts          smtc.ts                 useNowPlaying.ts

SMTCMonitor             spawns the worker       useState
parentPort              holds current track     listens
                        webContents.send
```

This applies to every native feature still on the list — volume, Bluetooth,
mic/camera. The question to ask each time is whether it blocks; if it does, it
belongs in a worker.

### Messages carry their own type

Everything between worker and main travels on one `message` channel, so each
payload names itself.

**Request and reply** — main asks, worker answers:

```
main   → { type: 'getCurrentMediaSession', requestId: 7 }
worker → { type: 'response', requestId: 7, result: {...} }
```

`requestId` is what makes replies matchable. They arrive on the same channel as
everything else, so without an id there is no way to tell which answer belongs
to which question. The `pending` Map in `smtc.ts` holds a resolver per id.

**Push** — the worker reports a change nobody asked about:

```
worker → { type: 'session-media-changed', sourceAppId: 'Spotify.exe', ... }
```

No `requestId`, because there was no request.

### Change events are a trigger, not a payload

`smtc.ts` reads the `type` to separate replies from events, then ignores the
event's contents and re-reads the whole session.

That looks wasteful, and it is one extra round trip. But an event only carries
what changed — `session-media-changed` brings title and artist, not playback
state or timeline. Assembling state from partial events means getting the
stitching right for every combination and ordering. Asking once for the
complete session cannot drift.

Track changes happen seconds apart at worst, so the extra trip costs nothing.

### Album art is converted in the worker

Thumbnails arrive as a raw `Buffer` with no media type. The worker sniffs PNG
from the magic number, falls back to JPEG, and base64-encodes it into a data
URL.

Both halves of that belong there: encoding a few hundred KB is synchronous work
this thread exists to absorb, and the renderer gets something it can put
straight into an `<img src>` rather than a Buffer it would have to convert.

### Two files, not one

A worker is always two pieces, and naming them badly is the easiest way to get
confused:

- `main/smtc-worker.ts` — runs *inside* the worker. Imports `SMTCMonitor`,
  talks through `parentPort`.
- `main/smtc.ts` — runs in main. Spawns the worker, talks through the `Worker`
  object.

`parentPort` and the `Worker` object are two ends of one connection. In main,
`parentPort` is `null`, which is why the worker file guards on it: if it is
missing, the file is being run somewhere it makes no sense.

### The worker is not bundled

Nextron's webpack knows about `main.ts` and `preload.ts` only, so a third entry
point would compile to nothing. The file is copied to `app/` verbatim by
`scripts/patch-nextron.cjs` and run directly — Electron 43 ships Node 24, which
strips type annotations at runtime.

The cost is that only erasable syntax works there: no enums, no parameter
properties, no namespaces.

---

## 5. Hit testing, because the window is not the notch

The strip spans the whole width of the screen, so what it does with clicks
matters more than it would for an ordinary window.

`setIgnoreMouseEvents(false)` hands clicks to the **entire window**, not to
whatever is currently drawn. Toggling it on hover therefore made the full
strip swallow clicks meant for the title bars and menus underneath — a bug
that only shows up once the notch is pinned open and the user tries to click
somewhere else.

So the window now stays click-through permanently. The renderer reports the
notch's rectangle with a `ResizeObserver` — the shell springs between sizes, so
its bounds are only final once the animation settles — and the main process
polls the cursor against it every 60ms, taking clicks only while the pointer is
actually over the notch.

60ms is under the threshold where a click feels like it missed, and cheap
enough to leave running.

### Keyboard focus follows the pin, not the hover

The window has to be focusable for text fields inside it to accept typing.
Focusing on hover would then steal focus from whatever the user was typing in
elsewhere, so focus is taken only when the notch is pinned — which is also the
only time there is anything to type into.

---

## 6. Views

Everything cannot share one row. Music, tasks, the calendar, a photo and
settings would each be a sliver.

The notch holds several views instead, with a rail to switch between them, and
each view sets the shell size it needs. The rail is fixed to the right of the
expanded panel rather than the collapsed bar, so the button just used does not
move when the view changes.

Settings sits below the rail, separated from it: it opens a panel, it is not a
place to be, and grouping it with the views would say otherwise.

### What the glance row shows is a setting

The zones are built from a list rather than fixed grid columns, so switching
one off closes its column and the shell shrinks to fit. A hidden panel leaves
no gap.

### One list, one copy

Tasks appear in both the glance row and the Tasks view. Both read and write the
same `useTasks` hook — two components each loading their own copy drift apart
the moment either changes.

---

## 7. Where main-process code lives

```
main/
  main.ts           window, hit testing, lifecycle
  preload.ts        the renderer's bridge
  store.ts          the JSON file, and nothing else
  smtc.ts           media host
  smtc-worker.ts    media worker
  ipc/
    index.ts        registers every handler
    store.ts        get/set
    photo.ts        the file picker
    system.ts       memory and uptime
    settings.ts     start-on-boot
```

`store.ts` had grown to hold the file, a photo picker, system stats and a login
item — four unrelated things behind one name. It now owns only the file, and
exports `readStore`/`writeStore` for features that happen to persist something.

A new handler means a new file in `ipc/` and one line in its index. Nothing
else is touched, and no file grows because a feature had nowhere else to go.

---

## Quick reference

- **Notch appearance and animation** → `renderer/components/notch/NotchChassis.tsx`, hot-reloads.
- **Now playing** → `main/smtc-worker.ts` (worker), `main/smtc.ts` (main),
  `renderer/hooks/useNowPlaying.ts` (renderer).
- **A new IPC handler** → a file in `main/ipc/`, plus one line in its index.
- **Corner radius** → the tokens at the top of `renderer/styles/globals.css`.
- **Glass surfaces** → the `.glass` and `.glass-control` classes in the same file.
- **Strip height, always-on-top, click-through** → `main/main.ts`, needs a restart.
- **`npm run dev:norestart`** → rebuilds `main/` on save without relaunching Electron.
- **App won't start, `Cannot read properties of undefined (reading 'whenReady')`** →
  `ELECTRON_RUN_AS_NODE=1` is set in the environment. It makes Electron run as
  plain Node, so `require('electron')` returns a path string instead of the API.
  Unset it.
