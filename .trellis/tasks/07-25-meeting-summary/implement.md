# Implement: Structured meeting summary

## Ordered checklist

1. Research DashScope/Qwen chat API for `qwen3.7-plus` structured JSON; write `research/`.
2. Update `.trellis/spec/backend/api-shape.md` and `error-handling.md` for summary + dashscope credentials.
3. DB migration: `summaries` table.
4. Keyring account for DashScope API key; settings UI field + `dashscope_configured`.
5. `providers/qwen` client + JSON schema/prompt for 要点/待办/决策.
6. `summary_service` + `summary_generate` / `summary_get` commands.
7. Frontend IPC wrappers + Vitest.
8. UI: on transcript-ready meeting,「生成摘要」button + three-block display.
9. README: DashScope key via settings.
10. `cargo test` + `npm test` + typecheck.

## Validation

```bash
cd src-tauri && cargo test
npm test
npm run typecheck
```

Manual: after a succeeded transcript, set context, click generate, see three blocks.

## Risks

- Model may return non-JSON → validate/parse with clear `SUMMARY_PROVIDER_ERROR`.
- Do not log API keys or full prompts containing secrets.
- Confirm exact DashScope model id string `qwen3.7-plus` against current console naming during research.
