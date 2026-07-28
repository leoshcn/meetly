# Doubao flash recognize (base64)

## Endpoint

`POST https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash`

One-shot result (no submit/query poll at provider). Meetly still uses local job rows for UI.

## Headers

| Header | Value |
|--------|--------|
| `X-Api-App-Key` | App Id |
| `X-Api-Access-Key` | Access Token |
| `X-Api-Resource-Id` | `volc.bigasr.auc_turbo` |
| `X-Api-Request-Id` | UUID |

## Body

- `audio.data`: base64 file bytes **or** `audio.url` (we use data only)
- `request.model_name`: `bigmodel`
- Hotwords: `request.corpus.context` JSON string `{"hotwords":[{"word":"..."}]}`
- Meetly `context_text` must not be sent

## Product mapping

| Meetly | Doubao flash |
|--------|----------------|
| Local file import | Read → base64 → `audio.data` |
| Settings hotwords | corpus.context hotwords |
| Settings context_text | unused here |
| Settings credentials | keyring → request headers |

## Docs

- https://www.volcengine.com/docs/6561/1631584 (flash)
- Standard async URL-only flow deferred (TOS).
