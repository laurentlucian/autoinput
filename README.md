# AutoInput

A free, open-source mouse and keyboard automation tool for Windows.

## Features

- **Auto-click** — repeated left, right, or middle mouse clicks (single or double) at a configurable interval
- **Mouse hold** — hold a mouse button continuously, with optional drag in any direction via a virtual joystick
- **Key repeat** — tap any key at a configurable interval
- **Key hold** — press and hold any key until stopped
- **Multiple setups** — create and manage multiple named configurations, each with its own action, timing, and hotkeys
- **Configurable interval** — hours, minutes, seconds, and milliseconds
- **Repeat modes** — run infinitely or for a specific count
- **Global hotkeys** — system-wide start, stop, and toggle keybinds (default: F6 / F7 / F8) that work even when the app is not focused
- **Fixed or current cursor position** — click wherever the cursor is, or at specific X/Y coordinates
- **Always-on-top** — pin the window above other apps
- **System tray** — minimize to tray with show/hide/exit menu
- **Persistent settings** — all configurations saved automatically

## Download

Get the latest Windows installer from the [Releases](https://github.com/laurentlucian/autoinput/releases) page.

## Build from Source

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Bun](https://bun.sh/)
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) (WebView2, MSVC build tools on Windows)

### Run

```sh
bun install
bun run tauri dev
```

### Build

```sh
bun install
bun run tauri build
```

## Tech Stack

- [Tauri v2](https://v2.tauri.app/) — desktop framework (Rust backend, webview frontend)
- [React](https://react.dev/) + TypeScript — UI
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) — styling
- [TanStack Router](https://tanstack.com/router) + [TanStack Query](https://tanstack.com/query) — routing and state
- Win32 `SendInput` API via the [windows](https://crates.io/crates/windows) crate — input simulation

## License

[MIT](LICENSE)
