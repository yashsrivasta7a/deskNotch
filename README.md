# deskNotch

**The MacBook notch, reimagined for Windows.**

deskNotch sits at the top centre of your screen as a slim bar. Hover it, and it opens into your music, a focus timer with a small companion, your tasks, a shelf for files, your AI usage and the apps you use most. Move away, and it folds back out of your way.

> **Beta.** deskNotch is in public testing. Things may break; [feedback](#feedback) is very welcome.

---

## Highlights

### A notch that is always useful, even closed
- **Now playing**: album art and a live pulse while anything plays, from Spotify to a YouTube tab.
- **Focus countdown**: a tiny ring and the time left while a session runs.
- **Clock**: 12-hour time whenever nothing else needs the space.
- **AI usage**: your Claude and Codex limits as two small rings, 5-hour inside and weekly outside.
- **Privacy dots**: orange while any app uses the microphone, green for the camera.
- **Just connected**: headphones, Wi-Fi and Bluetooth devices get a brief moment of their own when they connect.

### Three views, one hover away
- **Glance**: up to four cards: your companion, now playing with controls, your next tasks, and AI usage.
- **Desk**: a focus timer beside your whole task list.
- **Shelf**: drop files anywhere on the notch to park them, with thumbnails; drag them back out one at a time, or all at once.

### A companion with a job
- **One mode at a time**: Focus, Tasks, Time or AI, each with its own look and body language.
- **Focus timer**: 1 to 60 minutes, or any custom length down to the second.
- **Tasks**: tick the next one from the notch, or open the whole list.
- **It reacts**: watches what it is working on, celebrates a finished task, and sleeps at night.

### Moments that come to you
- **Screenshot catcher**: take a screenshot and the notch opens on it: drag it into any app, keep it on the Shelf, open it, or discard it.
- **Focus complete**: when a session ends, the notch opens and your companion tells you.

### Your apps, your way
- **Apps bar**: Windows' own most-used apps, or your favourites, one tap to open. Four in view, the rest a scroll away.

### Looks that fit your desktop
- **Three styles**: Default (a soft charcoal), Mica (your wallpaper, frosted) and Glass (a live blur of whatever is behind it).
- **Your layout**: put the tabs dock and the apps bar left, right or below the notch; hide the tabs you don't use.
- **Settings that read like System Settings**: one section at a time, every option explained in a line.

---

## Install

1. Download the latest `deskNotch Setup.exe` from [**Releases**](https://github.com/yashsrivasta7a/deskNotch/releases).
2. Run it. The beta is not code-signed yet, so Windows may show **"Windows protected your PC"**: click **More info**, then **Run anyway**.
3. A slim bar appears at the top centre of your screen. Hover it to open; Settings is the sliders icon on the dock.

**Requires** Windows 10 or 11.

## Build from source

Requires Node.js 20+.

```bash
npm install     # install dependencies
npm run dev     # run in development, with hot reload
npm run build   # build the Windows installer into dist/
```

## Privacy

Everything stays on your PC. Media, microphone and camera state, Wi-Fi, Bluetooth, screenshots and app usage are read from Windows locally and never leave it. AI usage is read with the logins Claude Code and Codex already keep on your machine, and those tokens are sent only to their own providers (Anthropic and OpenAI).

## Known limits (beta)

- **Start with Windows** is not available yet.
- **Glass** hides the notch from screenshots and screen sharing while it is on; that is how Windows lets an app capture what is behind it.
- **Screenshots** are caught when Snipping Tool saves them, which is its default.
- **AI usage** appears only if you use Claude Code or Codex on the same PC.

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/yashsrivasta7a/deskNotch/issues) with what you did, what happened, and a screenshot if something looked off.

---

Copyright © 2026 Devezio.tech · App ID `com.devezio.desknotch`
