# API Shape

> App-internal API is Tauri IPC (commands), not HTTP.

---

## Scope / Trigger

Applies when adding or changing any `#[tauri::command]`, frontend `invoke` wrapper, or shared DTO between `src/` and `src-tauri/`.

---

## Signatures

### Implemented commands

| Command | Request | Response | Source |
|---------|---------|----------|--------|
| `app_health` | (none) | `{ status, version }` | `src-tauri/src/commands/health.rs`, `src/ipc/commands/health.ts` |
| `settings_get` | (none) | `Settings` | `src-tauri/src/commands/settings.rs` |
| `settings_update` | `SettingsUpdate` | `Settings` | same |

### Envelope

Rust: `CmdResult<T> = Result<T, AppErrorDto>` in `src-tauri/src/error.rs`.  
TS: `AppError` + `normalizeError` in `src/ipc/client.ts`. Success is bare `T` (no `{ ok: true }` wrap).

```ts
// src/ipc/types.ts
type Settings = { hotwords: string[]; context_text: string };
type SettingsUpdate = { hotwords?: string[]; context_text?: string };
```

### Planned (stable names, not implemented)

| Command | Notes |
|---------|-------|
| `meetings_create_from_file` | later |
| `jobs_start_transcription` / `jobs_get` | Doubao async |
| `summary_generate` | uses `context_text` |

---

## Contracts

| Field | Consumer | Must NOT |
|-------|----------|----------|
| `hotwords` | Future Doubao ASR | Be required for summary |
| `context_text` | Future summarizer | Be sent to Doubao ASR by default |

### Env (Doubao, later)

| Key | Rule |
|-----|------|
| `MEETLY_DOUBAO_APP_ID` | Local only; never return via IPC |
| `MEETLY_DOUBAO_ACCESS_TOKEN` | Local only; never log raw |

See `.env.example`.

### DB

`settings` singleton row (`id = 1`): `hotwords` TEXT JSON array, `context_text` TEXT — `src-tauri/src/db/migrations/001_settings.sql`.

---

## Validation & Error Matrix

| Condition | Code | Behavior |
|-----------|------|----------|
| Empty / whitespace hotword | `SETTINGS_INVALID` | No DB write (`settings_service`) |
| SQLite failure | `DB_ERROR` | Generic message (no filesystem paths) |
| Lock poisoned / unknown | `INTERNAL` | Safe message |

---

## Good / Base / Bad Cases

| Case | Expect |
|------|--------|
| Good | `settings_update({ hotwords: ["Meetly"] })` persists |
| Base | Empty DB → `{ hotwords: [], context_text: "" }` |
| Bad | `hotwords: [""]` → `SETTINGS_INVALID` |

---

## Tests Required

- Rust: `src-tauri/src/services/settings_service.rs` tests (empty/whitespace reject, persist, partial update).
- TS: `src/ipc/client.test.ts`, `src/ipc/commands/settings.test.ts`, `health.test.ts`.

---

## Wrong vs Correct

Wrong: UI `invoke` outside `src/ipc`; `context_text` on ASR submit; rusqlite Display leaked to UI.

Correct: wrappers in `src/ipc/commands/*`; hotwords→ASR / context→summary; sanitized `DB_ERROR`.
