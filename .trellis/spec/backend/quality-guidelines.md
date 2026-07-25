# Quality Guidelines

> Backend quality bar and test strategy (`src-tauri`).

---

## Test Strategy

| Layer | Tool | What |
|-------|------|------|
| Unit / service | `cargo test` | validation, persist, error mapping |
| Provider (later) | `cargo test` + stub HTTP | hotwords in ASR body; exclude `context_text` |
| Manual | README checklist | `tauri dev` window |

```bash
cd src-tauri && cargo test
cd src-tauri && cargo clippy -- -D warnings
```

Evidence: settings + error + transcription dual-path (flash / TOS+async / timeout) + TOS stub + summary stubs under `cargo test`.

---

## Forbidden Patterns

- `unwrap()` on fallible IO in command handlers.
- Unstructured `String` command errors.
- Forwarding rusqlite Display to IPC (path leak).
- Logging TOS AK/SK or pre-signed URL signatures.

---

## Required Patterns

- `CmdResult<T>` on all commands.
- Migrations under `src-tauri/src/db/migrations/`.
- Dual-path caps: `FLASH_MAX_AUDIO_BYTES` (20 MiB) vs `ASYNC_MAX_AUDIO_BYTES` (512 MiB).

---

## Code Review Checklist

- [ ] Stable error codes (incl. `TOS_*` / `ASR_TIMEOUT`)
- [ ] Hotwords vs context consumers correct (flash + async)
- [ ] Tests for invalid settings + DB mapping + dual-path branches
- [ ] No credentials in source / `settings_get`
