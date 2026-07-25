# Design: Structured meeting summary (Qwen)

## Architecture

```
UI (meeting detail: transcript +「生成摘要」按钮 + summary blocks)
  → ipc summary_generate / summary_get / settings_*
    → services/summary_service
      → providers/qwen (DashScope OpenAI-compatible or native)
      → keyring (dashscope_api_key)
      → SQLite (summaries)
```

## Data flow

1. User has a meeting with successful transcript.
2. User clicks「生成摘要」.
3. Backend loads transcript text + `settings.context_text`.
4. Call Qwen `qwen3.7-plus` with structured JSON schema / strict JSON prompt.
5. Persist and return `{ key_points, action_items, decisions, language: "zh-CN" }`.

## IPC

| Command | Request | Response |
|---------|---------|----------|
| `summary_generate` | `{ meeting_id: string }` | `Summary` |
| `summary_get` | `{ meeting_id: string }` | `Summary` |
| `settings_update` | write-only `dashscope_api_key?` | `Settings` (with `dashscope_configured`) |
| `settings_clear_dashscope_credentials` | none | `Settings` |

## Summary DTO

```ts
type Summary = {
  meeting_id: string;
  key_points: string[];
  action_items: string[];
  decisions: string[];
  language: "zh-CN";
  created_at: string;
};
```

## Settings extension

| Field | Storage | Returned by settings_get |
|-------|---------|--------------------------|
| `dashscope_api_key` | OS keyring (write-only via settings_update) | never |
| `dashscope_configured` | derived | boolean |

Reuse the same settings page pattern as Doubao credentials.

## Provider

- Prefer DashScope OpenAI-compatible Chat Completions endpoint if available for simpler JSON mode; otherwise native DashScope generation API.
- Model: `qwen3.7-plus`
- Require JSON object matching Summary fields (minus meeting_id/created_at which are local).

## Errors

| Code | When |
|------|------|
| `SUMMARY_NOT_READY` | transcript missing / job not succeeded |
| `SUMMARY_NOT_CONFIGURED` | DashScope key missing |
| `SUMMARY_PROVIDER_ERROR` | API / parse failure |
| `NOT_FOUND` | meeting missing |

## Tests

- Prompt/builder includes context_text when present; still works when empty
- JSON parse failure → `SUMMARY_PROVIDER_ERROR`
- settings configured flag without leaking key
- Vitest wrappers for summary commands
