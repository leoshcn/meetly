# Design: Doubao flash transcription (import)

## Architecture

```
UI (import + job status + transcript)
  → ipc meetings_* / jobs_* / settings_*
    → services (meeting, transcription job)
      → providers/doubao/flash_client (HTTP)
      → keyring (credentials)
      → SQLite (meetings, jobs, transcript text)
```

## Data model (SQLite additions)

- `meetings`: id, source_path, created_at, title optional
- `jobs`: id, meeting_id, kind=`transcription`, status, provider_task_id optional, error_code/message, created_at, updated_at
- `transcripts`: meeting_id PK/FK, text, raw_json optional

Settings table stays free of secrets. Extend settings DTO with `doubao_configured: bool` only.

## IPC (align api-shape.md)

| Command | Behavior |
|---------|----------|
| `meetings_create_from_file` | `{ path }` → copy or record path → `Meeting` |
| `jobs_start_transcription` | `{ meeting_id }` → enqueue/run flash recognize |
| `jobs_get` | `{ job_id }` → status + error |
| `meetings_get` / `meetings_get_transcript` | meeting + transcript text when ready |
| `settings_update` | may accept `doubao_app_id` / `doubao_access_token` write-only fields; never echoed back |
| `settings_clear_doubao_credentials` | optional explicit clear |

## Doubao flash contract

- URL: `https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash`
- Headers: `X-Api-App-Key`, `X-Api-Access-Key`, `X-Api-Resource-Id`=`volc.bigasr.auc_turbo`, `X-Api-Request-Id`
- Body: `audio.data` = base64; `request.corpus.context` = hotwords JSON string when non-empty
- Do **not** put Meetly `context_text` in corpus

## Job execution

Flash is one-shot HTTP. Still expose async-looking jobs:

1. `jobs_start_transcription` creates job `running`, spawns async work (Tauri async runtime)
2. On finish: persist transcript, set `succeeded` / `failed`
3. UI polls `jobs_get` every N ms until terminal

## Credentials

- Write path: settings form → Rust command → `keyring` (service `meetly`, accounts `doubao_app_id` / `doubao_access_token`)
- Read path: provider only
- `settings_get`: `doubao_configured = both present`

## Errors

| Code | When |
|------|------|
| `ASR_NOT_CONFIGURED` | missing keyring secrets |
| `ASR_PROVIDER_ERROR` | non-success API status |
| `ASR_PAYLOAD_TOO_LARGE` | over size cap |
| `IO_ERROR` | cannot read file |
| `NOT_FOUND` | bad meeting/job id |

## Size cap

Default reject if file size > **20 MiB** (adjustable constant); document in README. Long meetings deferred to TOS+async later.

## Tests

- Hotwords serializer includes words; excludes context_text
- settings configured flag true/false without leaking secrets
- job transitions with mocked HTTP
- frontend ipc wrappers for new commands
