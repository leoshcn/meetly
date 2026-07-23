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

Evidence: 8 tests in `settings_service` + `error` modules as of scaffold.

---

## Forbidden Patterns

- `unwrap()` on fallible IO in command handlers.
- Unstructured `String` command errors.
- Forwarding rusqlite Display to IPC (path leak).

---

## Required Patterns

- `CmdResult<T>` on all commands.
- Migrations under `src-tauri/src/db/migrations/`.

---

## Code Review Checklist

- [ ] Stable error codes
- [ ] Hotwords vs context consumers correct
- [ ] Tests for invalid settings + DB mapping
- [ ] No credentials in source
