# Quality Guidelines

> Frontend quality bar and test strategy (`src/`).

---

## Test Strategy

| Layer | Tool | What |
|-------|------|------|
| Unit | Vitest | `ipc/client` normalize; command wrappers |
| E2E | Deferred | No Tauri driver required for scaffold |
| Manual | checklist | Settings save; copy for hotwords/context |

```bash
npm test
npm run typecheck
```

Evidence: `src/ipc/client.test.ts`, `src/ipc/commands/*.test.ts` (7 tests).

---

## Forbidden Patterns

- Raw `invoke` outside `src/ipc/`.
- Storing Doubao tokens in frontend state.
- Putting `context_text` on transcription invoke payloads.

---

## Required Patterns

- Typed wrappers in `src/ipc/commands/*`.
- Settings copy: 热词→转写, 上下文→摘要 (`SettingsHotwords.tsx` / settings page).

---

## Code Review Checklist

- [ ] IPC only via `src/ipc`
- [ ] Vitest covers new wrappers
- [ ] User-visible errors use `AppError.message`
