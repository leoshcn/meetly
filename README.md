# Meetly

Desktop meeting assistant (Tauri 2 + React + TypeScript + Vite + SQLite).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (npm)
- [Rust](https://rustup.rs/) stable (**MSVC toolchain** on Windows: `rustup default stable-x86_64-pc-windows-msvc`)
- Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the “Desktop development with C++” workload (or VC++ tools), plus WebView2 (usually preinstalled on Windows 10/11)

Open a “x64 Native Tools” / Developer Command Prompt, or ensure `vcvars64.bat` has been applied, before `cargo` / `tauri` builds if `link.exe` is not on your PATH.

## Setup

```bash
npm install
```

Doubao ASR credentials are entered in **Settings** and stored in the OS keyring (not SQLite, never returned by `settings_get`). Do not commit real secrets.

## Run (desktop)

```bash
npm run tauri dev
```

This starts Vite on `http://localhost:1420` and opens the Meetly window.

## Transcription notes

- Provider: Doubao **flash** recognize (`audio.data` base64).
- Single-file size cap: **20 MiB** (`ASR_PAYLOAD_TOO_LARGE` if larger).
- Hotwords from settings are sent to ASR; `context_text` is reserved for summary and is **not** sent to Doubao ASR.
- Configure App Id + Access Token under Settings before importing audio.

## Tests

```bash
# Frontend (IPC error normalization + command wrappers)
npm test

# Typecheck
npm run typecheck

# Rust (settings, hotwords, jobs, credentials)
cd src-tauri
cargo test
```

## Project layout

- `src/` — React UI (`app/`, `pages/`, `features/`, `ipc/`, `shared/`, `styles/`)
- `src-tauri/` — Tauri commands, services, providers, SQLite (`db/`, `commands/`, `services/`, `providers/`, `models/`)

Settings (`hotwords`, `context_text`) persist in the app data SQLite file (`meetly.db`). Doubao secrets live only in the OS credential store; `settings_get` exposes `doubao_configured: boolean` only.
