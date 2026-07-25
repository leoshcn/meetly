# Design: Doubao URL/async + TOS dual-path

## Architecture

```
Import file
  → meetings_create_from_file (cap: 512 MiB)
  → jobs_start_transcription
       ├─ size ≤ 20 MiB  → flash/base64 (existing HttpFlashClient)
       └─ size > 20 MiB  → require TOS + Doubao
              → TOS put object
              → pre-signed GET URL (TTL ≥ poll window)
              → async submit → poll query (≤ 45 min)
              → upsert transcript → job succeeded
              → best-effort delete object (non-fatal if delete fails)
```

UI continues polling `jobs_get`; no new job status enum required for MVP.

## Boundaries

| Layer | Owns |
|-------|------|
| `credentials` / settings | TOS AK/SK in keyring; bucket/region in SQLite; `tos_configured` |
| `providers/tos` | Put object, pre-sign GET, delete; never logs secrets or object bodies |
| `providers/doubao` | Existing flash client + new async submit/query client |
| `transcription_service` | Path selection, job lifecycle, store `provider_task_id` on submit |
| Frontend settings / import | TOS form; copy for 20 / 512 MiB |

## Constants

| Name | Value | Role |
|------|-------|------|
| `FLASH_MAX_AUDIO_BYTES` | 20 MiB | Flash/base64 path (rename from today's `MAX_AUDIO_BYTES`) |
| `ASYNC_MAX_AUDIO_BYTES` | 512 MiB | Hard reject before create/start |
| `ASYNC_POLL_TIMEOUT` | 45 minutes | Client-side query loop budget |
| `ASYNC_POLL_INTERVAL` | ~2–5 s | Backoff optional later |
| Pre-signed URL TTL | ≥ 45 min (e.g. 2 h) | Must outlive poll window |

## TOS config contract

**Keyring (secrets):** `tos_access_key_id`, `tos_secret_access_key` (service `meetly`).

**SQLite `settings` (non-secret):** `tos_region`, `tos_bucket`, optional `tos_endpoint` (custom endpoint if needed).

**IPC:**
- Extend `Settings` / `SettingsUpdate` with non-secret TOS fields + `tos_configured: bool`.
- `settings_clear_tos_credentials` (or clear both secrets + wipe region/bucket — prefer clear secrets + optional clear non-secrets in one command for UX parity with Doubao/DashScope).
- `tos_configured` true only when AK, SK, region, and bucket are all present.

Object key: `meetly/{meeting_id}/{uuid}{ext}` under the user bucket.

URL strategy: **pre-signed GET** (not permanent public ACL) so Doubao can download without making the bucket world-readable.

## Doubao async contract

| Item | Value |
|------|--------|
| Submit | `POST https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit` |
| Query | `POST https://openspeech.bytedance.com/api/v3/auc/bigmodel/query` |
| Resource-Id | `volc.bigasr.auc` (standard; confirm against console during implement; not idle / not flash turbo) |
| Request-Id | Client UUID; persist as `jobs.provider_task_id` |
| Audio | `audio.url` + format from path (reuse `audio_format_from_path`) |
| Hotwords | Same `corpus.context` builder as flash; no `context_text` |

Status handling: map provider header/body success vs processing vs failure into job succeeded / continue poll / failed. Do not log full raw audio URLs with signatures at info level if avoidable; never log AK/SK.

## Meeting create change

Today `create_from_file` rejects &gt;20 MiB. Change to reject only &gt;512 MiB so large files can be stored as meetings; path selection happens at `jobs_start_transcription` / execute.

`jobs_start_transcription` fail-fast:
- &gt;512 MiB → `ASR_PAYLOAD_TOO_LARGE`
- &gt;20 MiB and not `tos_configured` → `TOS_NOT_CONFIGURED`
- missing Doubao → `ASR_NOT_CONFIGURED` (both paths)

## Errors (new / extended)

| Code | When |
|------|------|
| `TOS_NOT_CONFIGURED` | Large file path without complete TOS config |
| `TOS_UPLOAD_ERROR` | Put/pre-sign failure |
| `ASR_PAYLOAD_TOO_LARGE` | &gt;512 MiB (message should reflect async cap) |
| `ASR_PROVIDER_ERROR` | Submit/query non-success |
| `ASR_TIMEOUT` | Exceeded 45 min poll window |

## Compatibility

- Existing flash callers and ≤20 MiB UX unchanged.
- Settings UI gains TOS section; DashScope/Doubao sections unchanged in spirit.
- Spec updates required post-implement: `api-shape.md`, `error-handling.md`, README.

## Trade-offs

| Choice | Why | Alternative rejected |
|--------|-----|----------------------|
| Dual path | Preserve short-file UX without TOS | Always-async forces TOS for everyone |
| Pre-signed URL | Safer than public-read bucket | Permanent public objects |
| No duration probe | Avoid ffmpeg dependency in MVP | Local duration gate |
| Best-effort delete | Reduce retention; delete failure must not fail a successful transcript | Mandatory delete |

## Rollback

- Feature-flag not required: dual-path is size-gated; reverting constants + routing restores flash-only behavior.
- TOS settings columns/keyring accounts can remain unused if rolled back.
