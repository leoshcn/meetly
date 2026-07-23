# Meetly

Desktop meeting assistant scaffold (Tauri 2 + React + TypeScript + Vite + SQLite).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (npm)
- [Rust](https://rustup.rs/) stable (**MSVC toolchain** on Windows: `rustup default stable-x86_64-pc-windows-msvc`)
- Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the “Desktop development with C++” workload (or VC++ tools), plus WebView2 (usually preinstalled on Windows 10/11)

Open a “x64 Native Tools” / Developer Command Prompt, or ensure `vcvars64.bat` has been applied, before `cargo` / `tauri` builds if `link.exe` is not on your PATH.

## Setup

```bash
npm install
```

No API keys are required for this scaffold. Future Doubao ASR credentials will use local env vars such as `MEETLY_DOUBAO_APP_ID` / `MEETLY_DOUBAO_ACCESS_TOKEN` — never commit real secrets.

## Run (desktop)

```bash
npm run tauri dev
```

This starts Vite on `http://localhost:1420` and opens the Meetly window.

## Tests

```bash
# Frontend (IPC error normalization + command wrappers)
npm test

# Typecheck
npm run typecheck

# Rust (settings validation + SQLite persist)
cd src-tauri
cargo test
```

## Project layout

- `src/` — React UI (`app/`, `pages/`, `features/`, `ipc/`, `shared/`, `styles/`)
- `src-tauri/` — Tauri commands, services, SQLite (`db/`, `commands/`, `services/`, `models/`)

Settings (`hotwords`, `context_text`) persist in the app data SQLite file (`meetly.db`). Hotwords are for transcription; context text is for summary — neither is sent to any provider in this scaffold.
