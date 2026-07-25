# Implement: Doubao URL/async + TOS dual-path

## Checklist

1. Research note: refresh async submit/query + TOS put/pre-sign notes under `research/` (endpoints, resource id, status codes).
2. Constants: split `FLASH_MAX_AUDIO_BYTES` (20 MiB) vs `ASYNC_MAX_AUDIO_BYTES` (512 MiB); raise `create_from_file` to async cap.
3. Credentials/settings: TOS AK/SK keyring; region/bucket(/endpoint) SQLite migration; `tos_configured`; clear command; IPC + frontend settings form (no secret echo).
4. `providers/tos`: put + pre-sign GET + delete trait + HTTP/SDK impl; unit tests with stub.
5. `providers/doubao`: async client (submit/query/poll) sharing hotwords builder; mockable trait; store `provider_task_id`.
6. `transcription_service`: dual-path in start + spawn/execute; wire errors `TOS_NOT_CONFIGURED` / `TOS_UPLOAD_ERROR` / `ASR_TIMEOUT`.
7. Frontend: import/settings copy for 20 / 512 MiB; surface new errors.
8. README + prepare notes for later spec update (`api-shape`, `error-handling`).
9. Tests: flash regression; large-file without TOS; async mock success; poll timeout; settings configured flag.

## Validation

```bash
npm test
npm run typecheck
cargo test --manifest-path src-tauri/Cargo.toml
```

Manual (when credentials available): &gt;20 MiB file with TOS → succeeded transcript; without TOS → `TOS_NOT_CONFIGURED`.

## Risk / rollback points

- TOS SDK choice / signing correctness → isolate behind trait; fail closed with `TOS_UPLOAD_ERROR`.
- Resource id mismatch (`volc.bigasr.auc` vs seedasr) → verify in research before wiring; keep constant in one place.
- Pre-sign TTL &lt; poll window → use ≥2 h TTL.
- Delete-after-success must not flip job to failed.

## Before `task.py start`

- [x] `prd.md` converged
- [x] `design.md` present
- [x] `implement.md` present
- [ ] User approved final planning summary
- [x] Curate `implement.jsonl` / `check.jsonl` with real entries (not seed-only)
