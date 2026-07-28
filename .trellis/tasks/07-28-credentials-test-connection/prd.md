# PRD: 凭证测试连接

## Goal

在设置「凭证」三块各提供「测试连接」：用真实轻量 API 验证凭证；**表单优先、字段级与已保存合并**；未保存密钥只经本地测试 IPC，**成功不自动保存**。用户可在导入/转写前确认配置有效。

## Background

- 密钥在 OS keyring；TOS region/bucket/endpoint 在 SQLite；`settings_get` 不回传明文。
- 无现成测试 IPC；`app_health` 仅本地。
- UI：`SettingsCredentials` 三块（豆包 / TOS / DashScope），含掩码与保存/清除。
- TOS SDK（`ve-tos-rust-sdk`）已有 `head_bucket`；豆包 flash 与 DashScope HTTP 客户端已存在。

## Decisions

| ID | Decision |
|----|----------|
| D1 | 三组各一枚「测试连接」。 |
| D2 | 表单优先；测试 IPC 收可选 write-only 覆盖字段；成功不自动保存。 |
| D3 | 字段级合并：掩码/空且已配置 → keyring（或 SQLite 非密钥）；已编辑 → 表单。合并后不完整 → 不可测。 |
| D4 | 探测：豆包 flash + 内置极短探针音频；TOS `HeadBucket`；DashScope `GET …/compatible-mode/v1/models`。 |
| D5 | 结果 UX：区块内联「测试中…」/「连接正常」/ error 行；测试中禁用该组测试钮；无 Toast/模态。 |

## Requirements

- **R1**（← D1, D5）：豆包 / TOS / DashScope 各增加次要按钮「测试连接」；测试中显示「测试中…」并禁用该钮；成功「连接正常」；失败写入该块既有 error 行（`friendlyErrorMessage`）。
- **R2**（← D2, D3）：前端按掩码状态组装覆盖字段：仅非掩码、非空的密钥/TOS 非密钥作为 override；其余由后端用已保存补齐。
- **R3**（← D3）：合并后仍缺必填（豆包缺 App Id 或 Token；DashScope 缺 Key；TOS 缺 AK/SK/region/bucket）时：按钮 disabled，或点击返回明确 `SETTINGS_INVALID` 中文提示（推荐 disabled + title 说明）。
- **R4**：新增 IPC（命名可微调）：`settings_test_doubao` / `settings_test_tos` / `settings_test_dashscope`；请求为可选覆盖字段；成功返回简洁结果（如 `{ ok: true }` 或空对象）；失败 `AppErrorDto`；**不写 keyring/SQLite**。
- **R5**（← D4）：后端合并 override + 已保存后执行探测；认证/权限失败映射为可读错误；不在日志中打印密钥。
- **R6**：豆包探针音频内置（极短静音/最小合法容器）；仅用于连通性；flash 业务失败若可区分「认证失败」与「空音频无文本」——认证失败算失败，纯空识别可视为连接成功（设计落地时写清判定）。
- **R7**：前端 `ipc` 包装 + Vitest；Rust 对合并/未配置路径单测；`typecheck` + `npm test` + `cargo test`（相关包）通过。
- **R8**：更新 `.trellis/spec/backend/api-shape.md` 登记新命令。

## Acceptance Criteria

- [ ] **AC1**：三块均有「测试连接」；测试中禁用并显示进行中文案。← R1
- [ ] **AC2**：仅改表单某一密钥字段（其余掩码）时，测试使用「新字段 + 已存其余」且不落盘。← R2, R4
- [ ] **AC3**：未配置且表单不完整时无法成功测试（disabled 或明确错误）。← R3
- [ ] **AC4**：有效已保存凭证（或有效表单合并）测试成功显示「连接正常」。← R1, R5
- [ ] **AC5**：故意错误密钥测试失败，错误可见且不含密钥明文。← R1, R5
- [ ] **AC6**：成功测试后未点保存，重启/`settings_get` 仍为测试前配置（未自动保存）。← R4
- [ ] **AC7**：api-shape 已更新；typecheck / 前端测试 / 相关 cargo test 通过。← R7, R8

## Out of Scope

- `settings_get` 回传明文；测试成功自动保存
- Toast / 模态结果；定时探测；onboarding
- TOS put/delete 探针；DashScope chat 探测（除非 models 不可用再降级，需记入 design）

## Technical Notes

- 命令落点：`commands/settings.rs` + `settings_service` 或新建 `settings_test` 辅助；providers 增加 `head_bucket` / `list_models` / flash probe helper。
- 前端：`SettingsCredentials` 每块独立 busy/ok/error；override 构造复用掩码标志。
- 错误码：复用 `ASR_NOT_CONFIGURED` / `SETTINGS_INVALID` / 现有 TOS/ASR 类，或新增 `CREDENTIALS_TEST_FAILED`（design 定一种，保持友好 message）。
