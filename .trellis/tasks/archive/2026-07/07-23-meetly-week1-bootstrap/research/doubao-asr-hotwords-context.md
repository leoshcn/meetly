# Doubao (ByteDance) speech bigmodel — file ASR notes

Source: Volcengine docs for 大模型录音文件识别 (submit + query), hotword / context fields.

## Pipeline

1. Submit audio job → task id.
2. Query until complete.
3. Meetly week-1 uses async file ASR (no streaming).

## Hotwords (transcription)

- Request-level via `request.corpus.context` JSON, e.g. `{"hotwords":[{"word":"..."}]}`.
- Meetly mapping: local hotword CRUD → request-level hotwords on submit.
- Platform `boosting_table_id` deferred.

## Context

- **Product decision:** Meetly user `context_text` is for **summary**, not ASR.
- Do not send `context_text` to Doubao ASR by default.

## Credentials

- Store in local env / OS config; never commit. See `.env.example`.

## Links

- https://www.volcengine.com/docs/6561/1354868
- https://www.volcengine.com/docs/6561/155739
