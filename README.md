# deskNotch

A notch for Windows, after Apple's Dynamic Island. It sits at the top centre of the screen as a small black bar, and opens on hover into a few quiet views: what is playing, a companion that keeps your focus timer and tasks, AI plan limits, a shelf for files, and the apps you use most.

- **App ID**: `com.devezio.desknotch`
- **Product Name**: `deskNotch`
- **Copyright**: Copyright © 2026 Devezio.tech

## What it does

**Closed**, the bar shows one thing at a time: the album art while music plays, the focus countdown while a session runs, or the time (12-hour). On the right, the time or your AI limits as two rings, and privacy dots while an app uses the microphone (orange) or camera (green). When something connects (headphones, a Wi-Fi network, a Bluetooth device) it gets a brief moment of its own.

**Open**, it has three views, switched from a small dock beside or under the notch:

- **Glance**: a row of up to four cards. The companion (a bot, or your photo) in one mode at a time: Focus, Tasks, Time or AI. Now playing, with controls. Next task. AI limits for Claude and Codex.
- **Desk**: the companion's focus timer beside the whole task list.
- **Shelf**: drop files on it (even on the closed notch), drag them back out wherever they are needed.

**Moments**: the notch opens by itself, briefly, for a screenshot just taken (drag it anywhere, keep it, open it, or discard it) and for a finished focus session.

**Apps bar**: Windows' own most-used apps, or your favourites, in a small tray beside or under the notch on the views you choose; four in view (two beside it), the rest a scroll away.

Everything is a setting: what the glance shows, the companion and its mode, where the dock sits, the style (Default, a soft charcoal; Mica, your wallpaper frosted; Glass, a live blur of whatever is behind it), which tabs the dock shows, the closed bar's right side, the apps bar, screenshots, start on boot.

## Requirements

- Windows 10 or 11 (it reads Windows' media, registry and shell directly; nothing here runs on macOS or Linux)
- Node.js 20+

## Getting started

```bash
npm install     # install dependencies
npm run dev     # run in development, with hot reload for the notch
npm run build   # production build
```

## Docs

| File | What is in it |
|---|---|
| [Functionality.md](Functionality.md) | Every feature, built or planned, with its status |
| [HowItWorks.md](HowItWorks.md) | Every place deskNotch talks to Windows, with diagrams (Mermaid; in VS Code install **Markdown Preview Mermaid Support**) |
| [deskNotch.md](deskNotch.md) | Design notes: why the notch is drawn inside a full-width window, hit testing, the IPC bridge, where code lives |

## Privacy

Everything stays on the machine. The AI limits are read with the logins Claude Code and Codex already keep in your user folder, and those tokens go only to their own providers (Anthropic, OpenAI). Media, the microphone and camera state, Wi-Fi, Bluetooth and app usage are read from Windows locally and never leave it.
