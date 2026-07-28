# Meetly

**Turn meetings into notes you can act on.**

[中文说明](./README.zh-CN.md)

<p align="center">
  <img src="docs/screenshots/home.png" alt="Meetly home" width="860" />
</p>

A local-first desktop meeting assistant: capture mic + system audio (or import a file), then go from **transcription → structured summary** (key points / action items / decisions).

## Why Meetly

| | |
|---|---|
| **One-click capture** | Mic + system speaker loopback; stop → auto-create meeting & transcribe |
| **Or import** | Drop in a local file — small files use a fast path; larger ones go async via TOS |
| **Notes you can share** | Qwen turns transcripts into key points, action items, and decisions |
| **Local-first** | Meetings & settings in SQLite; secrets stay in the OS keyring |
| **Hotwords** | Product names and jargon boost ASR accuracy |

<p align="center">
  <img src="docs/screenshots/workspace.png" alt="Transcript and summary workspace" width="860" />
</p>

## Features

- **Recording** — WASAPI loopback mix → M4A when FFmpeg is ready, otherwise WAV without blocking
- **Transcription** — Doubao ASR · flash for ≤20 MiB · TOS + async for larger files (45‑minute poll window)
- **Summary** — DashScope / Qwen `qwen3.7-plus` → key points / action items / decisions
- **Workspace** — meeting sidebar + split transcript/summary (tabs on narrow windows)
- **Settings** — credentials, hotwords, summary context, recording folder, FFmpeg status

<p align="center">
  <img src="docs/screenshots/settings.png" alt="Settings" width="860" />
</p>

## Quick start

**Prerequisites**

- [Node.js](https://nodejs.org/) 20+ (npm)
- [Rust](https://rustup.rs/) stable (**MSVC** on Windows: `rustup default stable-x86_64-pc-windows-msvc`)
- Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the “Desktop development with C++” workload, plus WebView2

```bash
npm install
npm run tauri dev
```

Vite serves at `http://localhost:1420` and opens the Meetly window.

Configure in **Settings**:

| Role | Provider | What you enter |
|------|----------|----------------|
| Transcription | Doubao | App Id + Access Token |
| Large-file ASR | Volcengine TOS | AK/SK in keyring + region / bucket |
| Summary | DashScope / Qwen | API Key |

Secrets live in the OS credential store only — never in SQLite, never returned by `settings_get`.

## Typical flow

1. Pick a mic → **Start recording** (or **Import audio & transcribe**)
2. Stop → meeting is created and transcription starts
3. When the transcript is ready → **Generate summary** and copy it out

## Windows installers

Two NSIS installers, same app id (installing one replaces the other):

| Artifact | Contents | When to use |
|----------|----------|-------------|
| `Meetly_<ver>_x64-setup.exe` (**lean**, default) | App only | Normal installs; FFmpeg downloads on first need (~80–100 MiB) |
| `Meetly_<ver>_x64-offline-setup.exe` | App + bundled FFmpeg | Slow / offline networks |

```bash
npm run ffmpeg:prepare
npm run pack:lean
npm run pack:offline
npm run pack:all        # → dist-installers/
```

Push a version tag (or run **Actions → Release**) to build and attach both `.exe` files. Code signing is not configured yet.

Bundled FFmpeg is the Gyan **essentials** build (GPLv3). See [GyanD/codexffmpeg](https://github.com/GyanD/codexffmpeg).

## Transcription notes

| Size | Path |
|------|------|
| ≤ 20 MiB | Doubao **flash** (`audio.data` base64) |
| 20 MiB–512 MiB | Upload to TOS → pre-signed GET → Doubao **async** (`volc.bigasr.auc`) |
| > 512 MiB | `ASR_PAYLOAD_TOO_LARGE` |

Hotwords go to ASR. `context_text` is for summaries only — **not** sent to Doubao.

## Develop & test

```bash
npm test
npm run typecheck
cd src-tauri && cargo test
```

```
src/          React UI (app / pages / features / ipc / shared)
src-tauri/    Tauri commands, services, SQLite, providers
```

## Stack

Tauri 2 · React 19 · TypeScript · Vite · SQLite · Doubao ASR · Qwen · OS keyring

---

<p align="center">
  <sub>UI previews in <code>docs/screenshots/</code> · v0.1.0</sub>
</p>
