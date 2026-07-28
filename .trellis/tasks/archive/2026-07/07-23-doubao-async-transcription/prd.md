# Async Doubao transcription from local audio

## Goal

个人用户在桌面端导入本地音频，经设置页配置的豆包凭证调用**极速版 base64 识别**，完成后查看转写全文；请求携带已保存热词。不做摘要、不做应用内录音。

## Background

- 脚手架：`settings_*`、热词/上下文 UI、`AppErrorDto`、SQLite。
- 父决策：热词→ASR；`context_text`→摘要（本任务不消费）；非实时流式。
- Doubao 极速版：`POST .../api/v3/auc/bigmodel/recognize/flash`，`audio.url` 与 `audio.data` 二选一；本任务用 `data`（base64）。

## Requirements

- R1: 首页/会议流可选择本地音频文件并创建 `meeting` 记录（存本地路径或应用数据目录副本）。
- R2: `jobs_start_transcription` 启动转写；UI 轮询 `jobs_get`（或等价刷新）至 succeeded/failed。
- R3: 成功展示转写全文；失败展示稳定 `AppError.code`。
- R4: ASR 请求注入 `hotwords`；**禁止**发送 `context_text`。
- R5: 设置页可填写/更新/清除豆包 AppId 与 Access Token；持久化到**本机密钥存储**（非 SQLite 明文）；`settings_get` 仅返回 `doubao_configured: boolean`（及非密钥字段），永不回传明文。
- R6: 未配置凭证 → `ASR_NOT_CONFIGURED`；超大小/读文件失败 → 明确错误码（如 `IO_ERROR` / `ASR_PAYLOAD_TOO_LARGE`）。
- R7: Provider 与 job 服务有 stub/单元测试；无真实密钥入库或进测试夹具。

## Product / Tech Decisions

| Item | Choice |
|------|--------|
| Audio intake | 仅导入本地文件 |
| Doubao API | 极速版 flash + base64 |
| Credentials UX | 设置页填写 |
| Credential storage | OS 凭据库 / keyring（推荐实现）；禁止 SQLite/日志明文 |
| Summary | 本任务不做 |
| Recording | 本任务不做 |

## Suggested limits (document in UI/README)

- 单文件建议上限：以极速版文档与实战为准，首版默认拒绝过大文件（实现时在 `design.md` 定具体 MB；超限 `ASR_PAYLOAD_TOO_LARGE`）。

## Out of Scope

- 摘要、`context_text` 消费、麦克风录音、TOS、标准异步 submit/query、实时流式、平台热词表。

## Acceptance Criteria

- [x] 导入音频 → 启动转写 → 看到成功全文或失败错误。
- [x] 设置页可配置凭证；重启后仍可用；`settings_get` 无明文密钥。
- [x] 热词进入 provider 请求体；`context_text` 不出现。
- [x] 未配置凭证时 `ASR_NOT_CONFIGURED`。
- [x] `cargo test` + 相关 Vitest 通过。

## Open Questions

（无）
