# Generate structured meeting summary

## Goal

在已有转写结果上，结合用户自定义上下文，生成简体中文结构化摘要（要点 / 待办 / 决策），并在桌面端展示。

## Background / Confirmed Facts

- 父任务：`07-23-meetly-week1-bootstrap`；前序已完成导入音频 + 豆包极速版转写 + 热词。
- 摘要默认简体中文，结构为要点 / 待办 / 决策。
- 用户 `context_text` **主要用于摘要**。
- 个人工具，无多用户。
- IPC：`summary_generate` / `summary_get`。
- 摘要 DTO：`{ meeting_id, key_points, action_items, decisions, language: "zh-CN", created_at }`。
- **摘要 LLM：通义千问 / DashScope，模型 `qwen3.7-plus`**。
- **触发方式：手动点击「生成摘要」**。
- **API Key：设置页 + OS keyring；`settings_get` 仅回传 `dashscope_configured`**。

## Requirements

- R1: 对已成功转写的会议，用户可手动触发生成摘要。
- R2: 生成时读取该会议转写全文 + 用户 `context_text`。
- R3: 输出固定三块结构（要点 / 待办 / 决策），语言为简体中文。
- R4: 摘要结果可持久化并在 UI 展示（含重新打开时加载已有摘要）。
- R5: 错误码：`SUMMARY_NOT_READY` / `SUMMARY_NOT_CONFIGURED` / `SUMMARY_PROVIDER_ERROR`。
- R6: DashScope API Key 本机 keyring 存储；设置页可配置；不回传明文。

## Out of Scope

- 多模板摘要、多语言切换、按发言人维度摘要。
- 转写成功后自动生成摘要。
- 实时边听边摘要。
- 导出 PDF/Markdown 等多格式。

## Acceptance Criteria

- [x] 转写成功后，用户可手动点击生成摘要。
- [x] 摘要包含要点、待办、决策三块（允许某块为空列表）。
- [x] 生成时使用用户上下文；上下文为空时仍能生成可用摘要。
- [x] 失败时有稳定错误码与可读信息。
- [x] 相关单元测试通过。

## Open Questions

（无）
