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
| `settings_clear_doubao_credentials` | (none) | `Settings` | same |
| `meetings_create_from_file` | `{ path: string }` | `Meeting` | `src-tauri/src/commands/meetings.rs` |
| `meetings_get` | `{ meeting_id: string }` | `Meeting` | same |
| `meetings_get_transcript` | `{ meeting_id: string }` | `Transcript` | same |
| `jobs_start_transcription` | `{ meeting_id: string }` | `Job` | `src-tauri/src/commands/jobs.rs` |
| `jobs_get` | `{ job_id: string }` | `Job` | same |

### Envelope

Rust: `CmdResult<T> = Result<T, AppErrorDto>` in `src-tauri/src/error.rs`.  
TS: `AppError` + `normalizeError` in `src/ipc/client.ts`. Success is bare `T` (no `{ ok: true }` wrap).

```ts
// src/ipc/types.ts
type Settings = {
  hotwords: string[];
  context_text: string;
  doubao_configured: boolean;
};
type SettingsUpdate = {
  hotwords?: string[];
  context_text?: string;
  /** Write-only; never returned by settings_get. */
  doubao_app_id?: string;
  /** Write-only; never returned by settings_get. */
  doubao_access_token?: string;
};
type Meeting = {
  id: string;
  source_path: string;
  title: string | null;
  created_at: string;
};
type Transcript = {
  meeting_id: string;
  text: string;
};
type Job = {
  id: string;
  meeting_id: string;
  kind: "transcription" | string;
  status: "running" | "succeeded" | "failed" | string;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};
```

### Planned (stable names, not implemented)

| Command | Notes |
|---------|-------|
| `summary_generate` | uses `context_text` |

---

## Contracts

| Field | Consumer | Must NOT |
|-------|----------|----------|
| `hotwords` | Doubao flash ASR (`request.corpus.context`) | Be required for summary |
| `context_text` | Future summarizer | Be sent to Doubao ASR |
| `doubao_app_id` / `doubao_access_token` | OS keyring via `settings_update` | Appear in any `settings_get` / logs |
| `doubao_configured` | UI status only | Imply returning secret material |

### Credentials

| Store | Rule |
|-------|------|
| OS keyring (`meetly` / `doubao_app_id`, `doubao_access_token`) | Write via settings; read only inside provider |
| SQLite `settings` | Never stores Doubao secrets |

### DB

- `settings` singleton (`id = 1`): `hotwords`, `context_text` — `001_settings.sql`
- `meetings`, `jobs`, `transcripts` — `002_meetings_jobs.sql`

### Size cap

Local audio for flash ASR: reject files larger than **20 MiB** with `ASR_PAYLOAD_TOO_LARGE`.

---

## Validation & Error Matrix

| Condition | Code | Behavior |
|-----------|------|----------|
| Empty / whitespace hotword | `SETTINGS_INVALID` | No DB write |
| SQLite failure | `DB_ERROR` | Generic message (no filesystem paths) |
| Missing Doubao credentials | `ASR_NOT_CONFIGURED` | No provider call |
| Audio file > 20 MiB | `ASR_PAYLOAD_TOO_LARGE` | Reject before read/encode |
| Cannot read audio file | `IO_ERROR` | Safe message |
| Provider non-success | `ASR_PROVIDER_ERROR` | Job → `failed` |
| Unknown meeting/job id | `NOT_FOUND` | — |
| Lock poisoned / unknown | `INTERNAL` | Safe message |

---

## Good / Base / Bad Cases

| Case | Expect |
|------|--------|
| Good | Import file → `jobs_start_transcription` → poll → transcript text |
| Base | Empty DB → settings defaults + `doubao_configured: false` |
| Bad | `hotwords: [""]` → `SETTINGS_INVALID`; no creds → `ASR_NOT_CONFIGURED` |

---

## Tests Required

- Rust: settings (incl. configured flag), hotwords builder, mocked flash provider job transitions.
- TS: ipc wrappers for settings / meetings / jobs.

---

## Wrong vs Correct

Wrong: UI `invoke` outside `src/ipc`; `context_text` on ASR submit; secrets in SQLite or `settings_get`; rusqlite Display leaked to UI.

Correct: wrappers in `src/ipc/commands/*`; hotwords→ASR / context→summary; keyring secrets; sanitized errors.
