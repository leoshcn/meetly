# Qwen / DashScope for meeting summary

## Confirmed product choice

- Provider: 通义千问 via DashScope (not OpenAI)
- Model id: **`qwen3.7-plus`** (matches DashScope / QwenCloud OpenAI-compatible docs as of implement time)
- API Key: settings page + OS keyring (`meetly` / `dashscope_api_key`)
- Trigger: manual button after transcript success
- Output: zh-CN structured JSON with `key_points` / `action_items` / `decisions`

## Endpoint (implemented)

- Prefer OpenAI-compatible Chat Completions:
  - China (Beijing): `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
  - Auth: `Authorization: Bearer <DASHSCOPE_API_KEY>`
- Request extras for reliable JSON:
  - `response_format: { "type": "json_object" }`
  - Prompt must contain the word `JSON` (DashScope rejects otherwise)
  - `enable_thinking: false` (JSON mode incompatible with thinking)

## Integration notes

- Input: transcript text + optional `context_text` (empty still works).
- Persist summary locally after successful parse.
- Invalid / non-JSON model output → `SUMMARY_PROVIDER_ERROR`.

## Out of scope

- Streaming tokens in UI
- Tool calling / multi-agent critique loops
- Region auto-detection (intl / US base URLs); Beijing compatible-mode is the default for this zh-CN app
