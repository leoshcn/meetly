# Configurable summary system prompt in settings

## Status

**Cancelled / reverted (2026-07-28).** Product code and spec edits from this task were fully rolled back.

## Why cancelled

System prompts already fix the JSON contract (`key_points` / `action_items` / `decisions`) and per-language output rules. Exposing the full system prompt in settings adds little value and risks breaking parsing or language constraints. Prefer keeping built-ins hard-coded; user-facing summary customization remains `context_text`.

## Original Goal (historical)

让用户在设置「转写与摘要」页按语言自定义会议摘要 LLM 系统提示词；未自定义时使用内置默认。

## Decisions (historical)

| ID | Decision |
|----|----------|
| D1 | 按语言各一套：`zh-CN` / `en` / `zh-en` |
| D2–D5 | 空=内置、预填、等于默认存空、放在转写与摘要 Tab |
| D6 | **整段撤回实现**（用户确认） |

## Out of Scope / Follow-ups

- 若将来需要可配，优先考虑 **append-only 附加指令**，而不是开放整段 system prompt。
- 可配置 user prompt、按会议覆盖等仍不在范围内。
