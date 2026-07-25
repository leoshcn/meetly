# Implement: Doubao flash transcription

## Ordered checklist

1. Research note refresh for flash + base64 + headers (task `research/`).
2. Update `.trellis/spec/backend/api-shape.md` (+ error-handling codes) for meetings/jobs/credentials.
3. DB migration: meetings, jobs, transcripts.
4. Keyring credential commands + settings UI fields (write-only) + `doubao_configured`.
5. `providers/doubao` flash client + hotwords mapping.
6. `transcription_service` job lifecycle + file read/base64.
7. IPC commands + `src/ipc` wrappers + Vitest mocks.
8. UI: import file → start job → poll → show transcript / errors.
9. README: credentials via settings, size cap, flash limits.
10. `cargo test` + `npm test` + typecheck.

## Validation

```bash
cd src-tauri && cargo test
npm test
npm run typecheck
```

Manual: configure fake/real keys in settings, import short wav/mp3, see transcript or provider error.

## Risks

- Flash body size / timeout on long audio → enforce 20 MiB and clear error.
- Keyring crate Windows behavior → verify store/retrieve in smoke test.
- Do not log base64 audio or tokens.
