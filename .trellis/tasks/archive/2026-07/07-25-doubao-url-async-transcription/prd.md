# Doubao URL/async transcription for large audio

## Goal

用户可导入最长约会议级的本地音频：小文件继续极速版 flash/base64；大文件经火山 TOS 上传后，用公网可拉取 URL 走豆包标准异步 submit/query 完成转写。

## Background

- 现状：仅 flash + `audio.data`；`MAX_AUDIO_BYTES = 20 MiB`；超限 `ASR_PAYLOAD_TOO_LARGE`（`meeting_service.rs`）。
- 先前任务将 TOS 与标准异步列为明确推迟项（`07-23-doubao-async-transcription`）。
- `jobs.provider_task_id` 列已存在但未使用；本地 job + UI 轮询已有。
- 凭证：Doubao / DashScope 在 keyring；`settings_get` 只回传 configured 标志。
- 热词走 ASR `corpus.context`；`context_text` 只给摘要。

## Decisions

| 决策 | 选择 |
|------|------|
| URL 来源 | 用户配置火山 TOS；Meetly 上传后提交 URL |
| 路径策略 | 双路径：≤20 MiB flash/base64（无需 TOS）；&gt;20 MiB 要求 TOS + 标准异步 |
| 上限 | 异步路径文件 ≤512 MiB；不做本地时长探测；客户端 query 总超时 45 分钟 |

## Requirements

- R1: ≤20 MiB 导入/转写行为与现网一致（flash/base64），不要求 TOS。
- R2: &gt;20 MiB 且 ≤512 MiB：校验 TOS 已配置 → 上传对象 → 生成 Doubao 可下载 URL → submit → 轮询 query → 写入 transcript；job 成功/失败状态与现网一致。
- R3: &gt;512 MiB → `ASR_PAYLOAD_TOO_LARGE`（上限按异步 cap）；&gt;20 MiB 但未配置 TOS → 专用错误（如 `TOS_NOT_CONFIGURED`），不得伪装成 IO。
- R4: Settings 可保存/更新/清除 TOS 配置。密钥（AK/SK）仅 keyring；bucket/region 等非密钥可进 SQLite；`settings_get` 不回传密钥，仅 `tos_configured`（及展示用非密钥字段）。
- R5: 异步路径热词注入与 flash 一致；永不向 ASR 发送 `context_text`。
- R6: submit 后客户端轮询总窗口 45 分钟，超时 job → failed，明确超时错误码；轮询期间 UI 可继续现有 job 轮询体验。
- R7: README / 导入页文案反映双路径与 20 MiB / 512 MiB 分界。

## Out of scope

- 应用内麦克风录音、实时流式 ASR
- 平台热词表 `boosting_table_id`
- 仅抬高 base64 上限、第三方临时托管、粘贴任意 URL 作为主路径
- 本地音频时长预检 / 解码依赖
- 闲时版（idle）队列 API
- 多 bucket 策略、跨云对象存储

## Acceptance Criteria

- [ ] AC1: ≤20 MiB 文件在无 TOS 时可完成 flash 转写（回归）。
- [ ] AC2: 20 MiB &lt; size ≤ 512 MiB 且 TOS+Doubao 已配置时，导入后 job 最终 succeeded 且可 `meetings_get_transcript`。
- [ ] AC3: &gt;20 MiB 无 TOS → `TOS_NOT_CONFIGURED`（或约定等价码），不创建成功转写。
- [ ] AC4: &gt;512 MiB → `ASR_PAYLOAD_TOO_LARGE`。
- [ ] AC5: `settings_get` 永不包含 TOS AK/SK；配置后 `tos_configured === true`，清除后为 false。
- [ ] AC6: 异步失败（上传/provider/45min 超时）→ job `failed` + 非空 `error_code` / `error_message`。
- [ ] AC7: 单元/集成测试覆盖：双路径分支、TOS 未配置、超限、异步客户端 mock 成功与超时；现有 flash 测试仍通过。
