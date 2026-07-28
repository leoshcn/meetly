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

Provider credentials are entered in **Settings** and stored in the OS keyring via the `keyring` crate with native backends (`windows-native` / `apple-native` / Secret Service). They are not written to SQLite and are never returned by `settings_get`. Do not commit real secrets.

- **Doubao** (transcription): App Id + Access Token
- **Volcengine TOS** (large-file transcription): Access Key + Secret Key in keyring; region / bucket / optional endpoint in SQLite
- **DashScope / 通义千问** (summary): API Key — model `qwen3.7-plus`

## Run (desktop)

```bash
npm run tauri dev
```

This starts Vite on `http://localhost:1420` and opens the Meetly window.

## Transcription notes

- Dual path by file size:
  - **≤ 20 MiB**: Doubao **flash** recognize (`audio.data` base64). TOS not required.
  - **20 MiB < size ≤ 512 MiB**: upload to user-configured TOS → pre-signed GET URL → Doubao **standard async** submit/query (`volc.bigasr.auc`). Poll window **45 minutes**.
  - **> 512 MiB**: `ASR_PAYLOAD_TOO_LARGE`.
- Missing TOS for a large file → `TOS_NOT_CONFIGURED`. Upload/pre-sign failures → `TOS_UPLOAD_ERROR`. Poll deadline → `ASR_TIMEOUT`.
- Hotwords from settings are sent to ASR; `context_text` is used for summary and is **not** sent to Doubao ASR.
- Configure Doubao (and TOS for large files) under Settings before importing audio.

## Recording notes

- Home empty stage: **开始录音** (selectable mic + system speaker loopback mix) or **导入音频并转写**.
- Stop recording → mixed **M4A (AAC)** under `Documents/Meetly/Recordings` (or custom folder) → auto-create meeting → start transcription.
- Capture mixes to PCM; if FFmpeg is already available, encode to **M4A (AAC)**. Otherwise save **WAV** immediately (Doubao accepts both) and prefetch FFmpeg in the background for later recordings — never block stop on a first-time ~80–100 MiB download.
- System audio uses the default playback device via WASAPI loopback (Windows). Loopback or mic failure aborts start (no silent mic-only).

## Windows installers (lean + offline)

Meetly ships **two Windows NSIS installers** (same app id; installing one replaces the other):

| Artifact | Contents | When to use |
|----------|----------|-------------|
| `Meetly_<ver>_x64-setup.exe` (**lean**, default) | App only | Normal installs; FFmpeg downloads on first need (~80–100 MiB from the pinned essentials build) |
| `Meetly_<ver>_x64-offline-setup.exe` | App + bundled FFmpeg | Slow/offline networks; no first-run FFmpeg download |

Build (Windows + MSVC env, same as `tauri build`):

```bash
# Cache FFmpeg essentials once (pinned URL in scripts/ffmpeg-pin.json)
npm run ffmpeg:prepare

# Lean only / offline only / both → outputs under dist-installers/
npm run pack:lean
npm run pack:offline
npm run pack:all
```

- Cache directory: `third_party/ffmpeg-cache/` (gitignored). Local cache hits skip the download; CI uses the same path with `actions/cache` (see `.github/workflows/release.yml`).
- Offline build stages `src-tauri/binaries/ffmpeg-<triple>.exe` (gitignored) and merges `src-tauri/tauri.offline.conf.json` (`bundle.externalBin`).
- Bundled FFmpeg is the Gyan **essentials** build (GPLv3). See [GyanD/codexffmpeg](https://github.com/GyanD/codexffmpeg) / [gyan.dev/ffmpeg](https://www.gyan.dev/ffmpeg/builds/).

### GitHub Actions release

Push a version tag (or run **Actions → Release → Run workflow**):

```bash
# Ensure package.json / tauri.conf.json version match the tag you want on artifacts
git tag v0.1.0
git push origin v0.1.0
```

- Runner: `windows-latest` → `npm run pack:all` → uploads both NSIS installers.
- Tag pushes also create a GitHub Release with the two `.exe` files attached.
- `workflow_dispatch` builds and uploads workflow artifacts only (no Release unless you push a tag).
- Code signing is not configured yet.

## Summary notes

- After a successful transcript, click **生成摘要** on the home panel.
- Provider: Qwen via DashScope OpenAI-compatible Chat Completions (`qwen3.7-plus`).
- Output: 要点 / 待办 / 决策 (zh-CN). Empty `context_text` still works.
- Configure DashScope API Key under Settings (`dashscope_configured` flag only; key never returned).

## Tests

```bash
# Frontend (IPC error normalization + command wrappers)
npm test

# Typecheck
npm run typecheck

# Rust (settings, hotwords, jobs, credentials, summary, TOS/async stubs)
cd src-tauri
cargo test
```

## Project layout

- `src/` — React UI (`app/`, `pages/`, `features/`, `ipc/`, `shared/`, `styles/`)
- `src-tauri/` — Tauri commands, services, providers, SQLite (`db/`, `commands/`, `services/`, `providers/`, `models/`)

Settings (`hotwords`, `context_text`, TOS region/bucket/endpoint) persist in the app data SQLite file (`meetly.db`). Secrets live only in the OS credential store; `settings_get` exposes `doubao_configured`, `dashscope_configured`, and `tos_configured` booleans (plus non-secret TOS fields) only.
