# Doubao standard async + TOS

## Async ASR

| Step | URL |
|------|-----|
| Submit | `POST https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit` |
| Query | `POST https://openspeech.bytedance.com/api/v3/auc/bigmodel/query` |

Headers (same family as flash): `X-Api-App-Key`, `X-Api-Access-Key`, `X-Api-Resource-Id`, `X-Api-Request-Id`, plus `X-Api-Sequence: -1` on submit. Pass `X-Tt-Logid` from submit on subsequent queries when present.

- Standard resource id (MVP): `volc.bigasr.auc`
- Flash turbo (existing): `volc.bigasr.auc_turbo` — do not reuse for async
- Idle endpoints are out of scope

Body: `audio.url` (not base64). Hotwords via `request.corpus.context` JSON string — reuse Meetly builder; never send `context_text`.

Query status codes (`X-Api-Status-Code`):

| Code | Meaning |
|------|---------|
| `20000000` | Success (submit accepted / query finished) |
| `20000001` | Queued — keep polling |
| `20000002` | Processing — keep polling |
| other | Failure |

Provider file limits (document-backed): &lt;512MB and &lt;5h; Meetly enforces 512 MiB only.

Persist submit `X-Api-Request-Id` as `jobs.provider_task_id`. Poll until success/failure or **45 min** client timeout (`ASR_TIMEOUT`).

Official docs:
- https://www.volcengine.com/docs/6561/1354868 (submit family)
- https://www.volcengine.com/docs/6561/1354871 (product limits)

## TOS

User-owned bucket. Meetly needs AK/SK (keyring) + region + bucket (+ optional endpoint in SQLite).

Default endpoint when empty: `https://tos-{region}.volces.com`.

Flow: PUT object (`ve-tos-rust-sdk`) → pre-signed GET (TTL **2 h**) → pass URL to submit → after transcript success, best-effort DELETE (delete failure must not fail the job).

Object key: `meetly/{meeting_id}/{uuid}{ext}`.

Do not make bucket public-read for MVP.

## Meetly mapping

| Size | Path |
|------|------|
| ≤20 MiB | Existing flash + `audio.data` |
| 20 MiB &lt; s ≤ 512 MiB | TOS + async URL |
| &gt;512 MiB | `ASR_PAYLOAD_TOO_LARGE` |
