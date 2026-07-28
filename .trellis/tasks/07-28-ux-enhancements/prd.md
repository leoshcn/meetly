# PRD: 用户体验增强（交互抛光 + 设置页 + 工作区布局）

## Goal

降低日常使用中的「粗糙感」：危险操作有应用内确认、侧边栏更干净、设置页可扫读且已配置密钥可见掩码；并重做转写完成后的工作区——**宽屏左右对照、窄屏 Tab 切换（优先摘要）**——避免滚过长转写才能到达摘要。不扩展录音/转写/摘要能力本身，不回传密钥明文。

## Background

Meetly 桌面端工作区已可用。设置页长滚动、`window.confirm`、侧边栏选中常显操作、凭证 Clear 无确认、已配置密钥框留空、hint 偏实现细节、热词错误英文。

工作区现状：宽屏（≥960px）左右分栏「转写 | 摘要」；`<960px` 上下堆叠且转写在上，长转写易把摘要顶出首屏。

共享 UI：`Button` / `IconButton`。密钥 write-only，不回传明文。

## Decisions

| ID | Decision |
|----|----------|
| D1 | 本批 = 交互抛光（C）+ 设置页 UI + 转写后工作区布局；不做 onboarding / 进度 / 录音连续 / 转写编辑搜索 / 导出。 |
| D2 | 设置页 = **三个 Tab**。 |
| D3 | Tab：**凭证**（豆包 + TOS + DashScope）· **转写与摘要**（热词 + 上下文）· **录音与编码**（录音目录 + FFmpeg）。默认「凭证」。 |
| D4 | 危险操作 → 应用内 **`ConfirmDialog`**。 |
| D5 | 侧边栏行操作：仅 **hover / focus-within** 显现紧凑 **IconButton**。 |
| D6 | 空态：侧边栏 + 热词；不改首页 hero / 转写 / 摘要空态文案（布局除外）。 |
| D7 | 凭证 Clear：仅 **已配置** 时 Confirm。 |
| D8 | 设置 hint = **用户向短说明**。 |
| D9 | 已配置密钥框 = 前端固定掩码；聚焦/输入清空；掩码不提交；未改不可保存。 |
| D10 | 工作区：**宽屏左右分栏**；**窄屏「转写 \| 摘要」Tab**（取消上下堆叠）。 |
| D11 | 窄屏默认 Tab：转写进行中 →「转写」；否则（已有转写结果或可生成摘要）→「摘要」。不持久化上次选择。 |

## Requirements

- **R1**（← D4）：共享 `ConfirmDialog`（Esc/遮罩取消；danger；focus-visible；reduced-motion）。
- **R2**（← D4）：侧边栏删除用 ConfirmDialog；移除 `window.confirm`。
- **R3**（← D4, D7）：已配置凭证 Clear 先 Confirm。
- **R4**（← D5）：侧边栏重命名/删除 IconButton；仅 hover/focus-within。
- **R5**（← D6）：侧边栏空态引导新建；热词错误中文。
- **R6**（← D2, D3）：设置三 Tab；默认凭证。
- **R7**（← D8）：设置页头与各 hint 用户向。
- **R8**：设置视觉与 tokens 对齐；可抽共享 panel 样式。
- **R9**：typecheck + test；不改 Rust/IPC（密钥 write-only）。
- **R10**（← D9）：已配置密钥框填掩码；聚焦/输入清空；掩码不提交；清除后空；TOS 非密钥字段显示真值。
- **R11**（← D10）：宽屏左右分栏，两侧独立滚动；防止内容撑破导致整页长滚。
- **R12**（← D10, D11）：窄屏（约 960px）使用「转写 \| 摘要」Tab，不再上下堆叠；默认按 D11；用户可手动切换；切换会议时可按 D11 重算默认（不强制打断用户已选 Tab，若实现简单可在选会时重置为 D11）。

## Acceptance Criteria

- [ ] **AC1**：删除确认框：取消不删，确认后行为与现网一致。← R1, R2
- [ ] **AC2**：已配置 Clear → Confirm；取消保留；未配置不可点。← R1, R3
- [ ] **AC3**：侧边栏操作仅 hover/focus-within 可见且可用。← R4
- [ ] **AC4**：侧边栏空态含新建引导；热词空错误为中文。← R5
- [ ] **AC5**：设置三 Tab 内容正确；首次为「凭证」。← R6
- [ ] **AC6**：hint/页头无 `settings_get` /「写入 SQLite」类措辞。← R7
- [ ] **AC7**：无 `window.confirm`；typecheck + test 通过。← R2, R9
- [ ] **AC8**：已配置密钥框显示掩码；未改不可保存；保存后回掩码；清除后空；TOS 非密钥为真值。← R10
- [ ] **AC9**：宽屏长转写下摘要栏仍在首屏（栏内自滚）。← R11
- [ ] **AC10**：窄屏为 Tab 而非上下堆叠；转写中默认「转写」，否则默认「摘要」；可切换到另一页且无需滚过转写全文。← R12

## Out of Scope

- IPC / 后端 / keyring 回传明文
- Onboarding、转写进度阶段化、导出、录音暂停/回放、转写正文编辑/搜索
- Toast、设置抽屉、dirty 警告、侧边栏 ⋯ 菜单
- 转写/摘要文案空态大改（布局除外）
- 宽屏改为 Tab-only；记住上次窄屏 Tab

## Technical Notes

- ConfirmDialog → `shared/ui`；侧边栏 + 凭证 Clear 消费。
- 掩码：per-field `masked` 标志；常量展示串永不提交。
- 工作区：`HomePage` 用 CSS/`matchMedia`（或容器）在断点切换 split vs tabs；两模式共用既有 `TranscriptionImportPanel` / `MeetingSummaryPanel`。
- 窄屏默认：依赖已有 `transcribing` / `hasTranscript`（或等价）按 D11 设初始 tab。
- 回归：删会、清凭证、掩码、设置 Tab、宽/窄工作区、转写中 vs 完成后默认 tab。
