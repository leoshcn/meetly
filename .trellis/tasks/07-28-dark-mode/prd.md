# Meetly 深色显示模式

## Goal

为 Meetly 桌面端提供深色显示模式，在低光环境下保持可读性与品牌一致的青绿/纸质视觉语言；用户可在「跟随系统 / 浅色 / 深色」间选择，偏好跨重启保留。

## Background

- 色板集中在 `src/styles/global.css` 的 `:root` CSS 变量；各 `.module.css` 几乎全部消费这些 tokens。
- 例外：`RecordingWaveform.tsx` 画布使用硬编码浅色 RGBA；`TranscriptionImport.tsx` 的 `SPEAKER_COLORS` 为固定十六进制。
- 无现有 theme / `prefers-color-scheme` 实现。
- 设置页三 Tab（凭证 / 转写与摘要 / 录音与编码）；设置经 Tauri IPC + SQLite 持久化，`Settings` 尚无主题字段。

## Decisions

| ID | Decision |
|----|----------|
| D1 | 主题三态：**跟随系统 / 浅色 / 深色**；默认「跟随系统」。 |
| D2 | 入口仅在设置页；顶栏不加主题快捷切换。 |
| D3 | 偏好写入现有 Settings（SQLite + `settings_get` / `settings_update`）。 |
| D4 | 设置页新建 **「外观」Tab**，放置主题三态选择。 |
| D5 | MVP 视觉完成度 = **全 UI / 全状态对比度正式达标**：以 **WCAG 2.2 AA** 为标准（正文对比度 ≥ 4.5:1；大文本 ≥ 3:1；非文本 UI/图形 ≥ 3:1），覆盖所有现有界面与交互状态（含禁用、hover/focus、空态、错误、录音波形、进度、对话框等）；不达标处必须修到合格。 |

## Requirements

- **R1**（← D1, D3）：`Settings` / `SettingsUpdate` 增加主题偏好字段（建议名 `theme_preference`，取值 `system` \| `light` \| `dark`）；缺省 / 迁移默认 `system`；前后端 DTO 与 SQLite 列同步。
- **R2**（← D1）：解析偏好为实际外观：`light`/`dark` 固定；`system` 跟随 `prefers-color-scheme`，并在系统主题变化时即时更新。
- **R3**（← D1, D5）：在 `document`（或根节点）上应用解析后的主题（如 `data-theme="light|dark"`），深色 token 覆盖 `--paper` / `--ink` / `--ink-muted` / `--line` / `--panel` / `--accent` / `--accent-soft` / `--danger` / `--ok` / `--warn` 等，使既有 CSS Modules 自动换肤。
- **R4**（← D2, D4）：设置页增加「外观」Tab；内含三态主题选择（分段控件或等价单选）；切换后立即生效并经 `settings_update` 持久化；失败时有用户可读错误反馈且不留下错误的内存态。
- **R5**（← D5）：硬编码浅色绘制路径适配深色：至少 `RecordingWaveform` 画布色、说话人色条 `SPEAKER_COLORS`（及依赖其的 UI）在深色下满足 AA。
- **R6**（← D5）：验收清单覆盖：AppShell/顶栏、首页工作区（宽屏分栏与窄屏 Tab）、侧边栏（含 hover 操作、空态、选中）、录音区与波形、转写与说话人、摘要、设置四 Tab、共享 `Button`/`IconButton`/`ConfirmDialog`（含 danger）、进度条、错误/空态文案；状态含 default / hover / focus-visible / disabled / busy。
- **R7**：`npm run typecheck` 与相关前后端测试通过；主题字段有后端（或 IPC 契约）测试覆盖默认值与 update round-trip。

## Acceptance Criteria

- [ ] **AC1**：新装或未设置时默认为「跟随系统」；OS 浅/深切换时，偏好为 system 的界面即时跟随。← R1, R2
- [ ] **AC2**：在「外观」Tab 选择浅色或深色后立即换肤，重启后仍为所选；再改回「跟随系统」恢复跟随。← R2, R3, R4
- [ ] **AC3**：设置仅四 Tab 可切换主题；顶栏无主题快捷入口。← R4, D2
- [ ] **AC4**：深色模式下 R6 清单内所有界面与状态满足 WCAG 2.2 AA 对比度；浅色模式相对现状无回归（至少保持原可读性）。← R3, R5, R6, D5
- [ ] **AC5**：深色下录音波形与说话人标识仍可区分且对比度达标。← R5, D5
- [ ] **AC6**：typecheck 与相关测试通过；`theme_preference` 默认与更新可测。← R1, R7

## Out of Scope

- 多套自定义主题、用户自选强调色、按页面分别设主题
- 顶栏主题快捷切换
- 以 localStorage 作为偏好的权威存储
- 改动录音 / 转写 / 摘要业务逻辑（仅主题相关的颜色适配）
- 系统级窗口装饰（title bar）原生深色（若平台 API 成本高可后续跟进；MVP 以 WebView 内容区为准）
- 自动化 axe/对比度 CI 流水线（允许开发时用量具手工/脚本验收；不强制新 CI job）

## Technical Notes

- 后端：沿用 `ensure_*_column` 幂等迁移模式，为 `settings` 表增加 `theme_preference`（DEFAULT `'system'`）。
- 前端：根级 theme 提供者在应用启动时 `settings_get`，把解析结果写到 `document.documentElement`；`system` 时订阅 `matchMedia('(prefers-color-scheme: dark)')`。
- 首屏闪烁：Settings 为权威源；若异步加载导致闪一下，可用「上次偏好」的本地缓存仅作首绘加速，加载完成后以 Settings 为准覆盖（缓存非权威）。
- 风险点：`color-mix` + 透明叠色、禁用 `opacity`、canvas 硬编码色、说话人固定色板——均需在深色 token 下按 D5 复核。
