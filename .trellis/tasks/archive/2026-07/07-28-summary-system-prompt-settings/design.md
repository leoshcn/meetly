# Design: Configurable summary system prompts

## Architecture

```
SettingsHotwordsPanel（转写与摘要 Tab）
  → settings_get / settings_update
    → settings 表三列（可空 = 用默认）
    → settings_get 附带 summary_system_prompt_defaults（只读）

MeetingSummaryPanel「生成摘要」
  → summary_generate(language)
    → summary_service 读 settings + resolve(language)
    → qwen client 用 resolved system prompt 组装 messages
```

## Data model

SQLite `settings`（idempotent ADD COLUMN，DEFAULT `''`）：

| Column | Meaning |
|--------|---------|
| `summary_system_prompt_zh_cn` | 自定义 zh-CN system；空 = 内置 |
| `summary_system_prompt_en` | 自定义 en system；空 = 内置 |
| `summary_system_prompt_zh_en` | 自定义 zh-en system；空 = 内置 |

Migration：`007_summary_system_prompts.sql` 占位说明 + `pool.rs` 中 `ensure_summary_system_prompt_columns`（同 TOS / recording_dir 模式）。

## IPC / DTO

扩展 `Settings`：

```ts
summary_system_prompt_zh_cn: string; // stored; may be ""
summary_system_prompt_en: string;
summary_system_prompt_zh_en: string;
/** Read-only built-in defaults for UI prefill / compare. Always present. */
summary_system_prompt_defaults: {
  "zh-CN": string;
  en: string;
  "zh-en": string;
};
```

扩展 `SettingsUpdate`（均为 optional）：

```ts
summary_system_prompt_zh_cn?: string;
summary_system_prompt_en?: string;
summary_system_prompt_zh_en?: string;
```

`settings_update` 写入前：对每个提供的字段 `trim`；若等于对应内置默认（或为空），存 `""`。

不新增 command；不改 `summary_generate` 请求形状。

## Prompt resolution

```
resolve_system_prompt(language, settings) -> &str / String
  stored = match language { zh-CN | en | zh-en }
  if stored.trim().is_empty() -> built_in(language)
  else -> stored
```

`SummaryGenerateInput` 增加 `system_prompt: String`（或由 builder 接收已 resolve 的值），`build_summary_messages` 不再在内部按 language 选死硬编码（仍可用 language 选 user prompt 模板）。

内置三套文案保持与当前 `system_prompt_for_language` 完全一致，并作为 `summary_system_prompt_defaults` 的来源。

## UI

`SettingsHotwords.tsx`（或同 feature 内小节块）：

- 在「上下文（摘要）」下方增加「系统提示词（摘要）」区块。
- 三段 textarea：简体中文 / English / 中英双语。
- 加载：`stored || defaults[lang]` 写入编辑态。
- 每段「恢复默认」：本地设为 `defaults[lang]`（未点保存前不写库）。
- 与热词/上下文共用「保存设置」。
- Hint：说明空/等于默认会回退内置；改提示词影响之后生成的摘要。

## Compatibility

- 现有用户：三列默认空 → 行为与今日一致。
- 升级内置文案：未自定义用户自动获得新默认；已自定义不受影响。
- 不迁移旧摘要行；不强制重新生成。

## Tests

| Layer | Cases |
|-------|-------|
| qwen client | resolve 空→默认；非空→自定义；messages[0] 内容 |
| settings_service | update 等于默认 → DB `""`；get 回传 defaults |
| summary_service | stub generator 收到 resolved system（可选） |
| Vitest IPC | Settings / Update 字段透传 |
| pool | migrate 后三列存在 |

## Risks / rollbacks

- 用户改坏提示词导致 JSON 不合规 → 已有 `SUMMARY_PROVIDER_ERROR`；可用「恢复默认」自救。
- 超长提示词：MVP 不设硬上限（与 `context_text` 一致）；若后续需要再加 `SETTINGS_INVALID`。
