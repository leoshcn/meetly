# Error Handling

> How errors cross the Tauri IPC boundary and surface in the Meetly UI.

---

## Scope / Trigger

All Rust command handlers, SQLite access, provider calls, and frontend `invoke` wrappers.

---

## Signatures

```rust
// src-tauri/src/error.rs
pub struct AppErrorDto {
    pub code: String,
    pub message: String,
    pub details: Option<serde_json::Value>,
}
pub type CmdResult<T> = Result<T, AppErrorDto>;
```

```ts
// src/ipc/client.ts
export type AppError = { code: string; message: string; details?: unknown };
export function normalizeError(err: unknown): AppError;
```

Helpers: `settings_invalid`, `db_error`, `internal`, `not_found`, `asr_not_configured`, `asr_payload_too_large`, `asr_provider_error`, `io_error`.

---

## Contracts

1. Commands return `CmdResult<T>`.
2. `message` is user-safe; never tokens, base64 audio, or absolute secret paths.
3. `From<rusqlite::Error>` / `From<serde_json::Error>` → `DB_ERROR` with **fixed** messages (do not forward Display).
4. Frontend normalizes unknown rejects to `{ code: "INTERNAL", message: "Unexpected error" }`.
5. Transcription jobs persist terminal failures as `status=failed` with `error_code` / `error_message` for UI polling.

---

## Validation & Error Matrix

| Fault | Code | UI |
|-------|------|-----|
| Validation | `SETTINGS_INVALID` | Inline / form |
| SQLite | `DB_ERROR` | Toast |
| Missing ASR credentials | `ASR_NOT_CONFIGURED` | Prompt to settings |
| File too large (> 20 MiB) | `ASR_PAYLOAD_TOO_LARGE` | Inline / job error |
| File read failure | `IO_ERROR` | Inline / job error |
| Doubao API failure | `ASR_PROVIDER_ERROR` | Job error |
| Unknown id | `NOT_FOUND` | Inline |
| Unexpected | `INTERNAL` | Generic toast |

---

## Good / Base / Bad Cases

| Case | Behavior |
|------|----------|
| Good | `SETTINGS_INVALID` / `ASR_*` codes preserved through `normalizeError` |
| Base | `app_health` → `Ok` |
| Bad | String-only rejects without `code` — client maps to `INTERNAL` |

---

## Tests Required

- `error.rs`: rusqlite mapping has no path separators in message.
- `client.test.ts`: preserves `{ code, message }`; string → `INTERNAL`.
- Job / provider tests assert stable ASR codes without leaking payloads.

---

## Wrong vs Correct

Wrong: `Err(e.to_string())` from commands; logging access tokens or base64 audio.

Correct: typed `AppErrorDto`; UI branches on `code`.
