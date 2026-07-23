# Directory Structure

> How Rust / Tauri backend code is organized in Meetly.

---

## Overview

Backend logic lives in `src-tauri/src/`. Commands are thin; services own business rules; `db` owns SQLite.

---

## Directory Layout

```
src-tauri/src/
├── main.rs
├── lib.rs
├── error.rs
├── commands/
│   ├── health.rs
│   └── settings.rs
├── services/
│   └── settings_service.rs
├── db/
│   ├── pool.rs
│   └── migrations/001_settings.sql
└── models/
    └── settings.rs
```

Evidence: `src-tauri/src/commands/settings.rs`, `src-tauri/src/services/settings_service.rs`, `src-tauri/src/error.rs`.

Future (not yet present): `providers/doubao/`, `commands/meetings.rs`, `commands/jobs.rs`.

---

## Module Organization

- **commands/** — IPC edge only.
- **services/** — validation + persistence policy.
- **db/** — migrations + connection.
- **models/** — serde DTOs shared across IPC.

---

## Anti-Patterns

- Doubao calls inside command handlers (when provider lands, keep under `providers/`).
- Returning unstructured `String` errors from commands.
