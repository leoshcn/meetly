# Directory Structure

> How Rust / Tauri backend code is organized in Meetly.

---

## Overview

Backend logic lives in `src-tauri/src/`. Commands are thin; services own business rules; `db` owns SQLite; `providers` own external HTTP.

---

## Directory Layout

```
src-tauri/src/
├── main.rs
├── lib.rs
├── error.rs
├── commands/
│   ├── health.rs
│   ├── settings.rs
│   ├── meetings.rs
│   └── jobs.rs
├── services/
│   ├── settings_service.rs
│   ├── meeting_service.rs
│   ├── transcription_service.rs
│   └── credentials.rs
├── providers/
│   └── doubao/
│       ├── mod.rs
│       ├── flash_client.rs
│       └── hotwords.rs
├── db/
│   ├── pool.rs
│   └── migrations/
│       ├── 001_settings.sql
│       └── 002_meetings_jobs.sql
└── models/
    ├── settings.rs
    ├── meeting.rs
    └── job.rs
```

---

## Module Organization

- **commands/** — IPC edge only.
- **services/** — validation + persistence + job orchestration.
- **providers/** — Doubao (and future) HTTP clients; no SQLite.
- **db/** — migrations + connection.
- **models/** — serde DTOs shared across IPC.

---

## Anti-Patterns

- Doubao HTTP calls inside command handlers (keep under `providers/`).
- Returning unstructured `String` errors from commands.
- Storing Doubao secrets in SQLite.
