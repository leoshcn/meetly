# Implement: 录音悬浮窗与关窗拦截

依据 `prd.md` + `design.md`。顺序按依赖排列：先打通「窗口能出现」，再做内容，最后做关窗拦截。

## 检查清单

### 阶段 1 — 窗口骨架（先让第二个窗口能显示出来）

- [ ] 1.1 `src-tauri/tauri.conf.json`：`app.windows` 追加 `recorder-widget`（`label`、`visible:false`、`decorations:false`、`transparent:true`、`alwaysOnTop:true`、`skipTaskbar:true`、`shadow:false`、`resizable:false`、`focus:false`、展开态尺寸）。给 `main` 显式补上 `"label": "main"`（当前未写，依赖默认值）。
- [ ] 1.2 新增 `src-tauri/capabilities/recorder-widget.json`，权限见 `design.md` D3。
- [ ] 1.3 `src-tauri/capabilities/default.json` 追加控制悬浮窗所需的 window 权限。
- [ ] 1.4 `src/main.tsx`：按 `getCurrentWindow().label` 分流挂载；两个窗口都执行 `bootstrapThemeFromCache()`。
- [ ] 1.5 新增 `src/features/recorder-widget/`（组件 + CSS module + `index.ts`），先只渲染一个静态药丸。
- [ ] **验证点**：`npm run tauri dev`，手动 `show()` 悬浮窗，确认无边框、透明、置顶、不进任务栏、Win11 下无 1px 白边。

### 阶段 2 — 位置与拖动

- [ ] 2.1 位置读写工具（localStorage 键 `meetly.recorderWidget.position`）。
- [ ] 2.2 `availableMonitors()` 坐标校验 + 不相交时回落默认位置并覆写保存值（`design.md` D9）。
- [ ] 2.3 药丸背景挂 `data-tauri-drag-region`；确认交互元素未挂该属性。
- [ ] 2.4 拖动结束后持久化新位置。
- [ ] **验证点**：A6、A7（A7 可通过手动写入一个远超屏幕范围的坐标来模拟）。

### 阶段 3 — 悬浮窗内容与生命周期

- [ ] 3.1 `record_status` 分档轮询（展开 60ms / 折叠 1000ms），`state !== "recording"` 时自行 `hide()`。
- [ ] 3.2 计时由 `started_at` 推导；`MM:SS` / `H:MM:SS` 切换；等宽数字、固定字宽防抖动。
- [ ] 3.3 呼吸红点 + 双电平条；`prefers-reduced-motion` 降级（照 `RecordingWaveform.tsx:24-32` 的写法）。
- [ ] 3.4 展开/折叠切换 + `setSize()` 同步；折叠态窗口矩形收紧到圆点。
- [ ] 3.5 「打开 Meetly」：`main` 的 `unminimize` / `show` / `setFocus` + emit `recording:focus-request`。
- [ ] 3.6 `AppShell` 监听 `recording:focus-request` → `setScreen("home")`。
- [ ] 3.7 录音开始/停止时由主窗口控制悬浮窗 `show()` / `hide()`（`beginRecording` / `endRecording`）。
- [ ] **验证点**：A1–A5、A8、A10、A15。

### 阶段 4 — 主窗口状态一致性（修既有缺陷）

- [ ] 4.1 `MeetingRecordingPanel` 挂载时拉 `record_status` 恢复录音 UI。
- [ ] 4.2 计时基准从 `startedAtRef = Date.now()` 改为 `Date.parse(started_at)`。
- [ ] 4.3 1s 低频同步：后端 `idle` 时收敛本地 `recording`。
- [ ] 4.4 确认 `onBusyChange` 语义未变，且不会因同步而误触发 `workspaceBusy` 抖动（`AppShell.tsx:87-91` 的进度条、`updateGate` 的 `appBusy` 门控都消费它）。
- [ ] **验证点**：A9，以及 A2 之后主窗口不残留「正在录音」。

### 阶段 5 — 关窗拦截

- [ ] 5.1 `src-tauri/src/lib.rs` 加 `on_window_event`：`main` + `CloseRequested` 且在录音 → `prevent_close()` + emit `recording:close-requested`；否则 `app_handle.exit(0)`。
- [ ] 5.2 `recorder-widget` + `CloseRequested` → `prevent_close()`。
- [ ] 5.3 `AppShell` 监听 `recording:close-requested`，弹三选一模态（停止并保存 / 继续录音 / 取消）。
- [ ] 5.4 「停止并保存录音」：`record_stop` → 展示返回的 `path` → 退出应用。文案须说明不会自动转写、下次可用「导入音频并转写」。
- [ ] 5.5 确认非录音状态关窗无询问且进程退出。
- [ ] **验证点**：A11–A14。

### 阶段 6 — 收尾

- [ ] 6.1 设置页录音分区加「重置悬浮窗位置」（R5.4）。
- [ ] 6.2 在真实会议软件（腾讯会议 / Zoom）全屏态下验证置顶是否有效；结论写回 `prd.md` Risks。
- [ ] 6.3 新增的窗口间事件写入 `.trellis/spec/backend/api-shape.md`（事件表，命令表无变化）。

## 验证命令

```bash
npm run typecheck
npm run test
cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

`package.json` 没有 lint 脚本，前端静态检查以 `npm run typecheck` 为准。

手工验收必须真机跑：本任务的核心行为（置顶、透明、任务栏隐藏、多显示器、关窗拦截、进程退出）都无法用 vitest / cargo test 覆盖。按 `prd.md` 的 A1–A15 逐条过。

## 风险文件与回滚点

| 文件 | 风险 | 说明 |
|---|---|---|
| `src-tauri/tauri.conf.json` | 高 | 窗口声明写错会导致应用起不来；同时是打包配置，改动需确认 `pack:lean` / `pack:offline` 仍能出包 |
| `src-tauri/capabilities/*.json` | 中 | label 未列入 capability 的窗口完全没有 IPC 权限，症状是「按钮点了没反应」且只在 devtools 控制台可见 |
| `src-tauri/src/lib.rs` | 高 | `on_window_event` 里漏 `exit(0)` 会导致关窗后进程残留；条件写反会导致窗口关不掉 |
| `src/main.tsx` | 中 | 分流写错会让主窗口挂载成悬浮窗 |
| `src/features/meeting-recording/MeetingRecording.tsx` | 中 | 状态同步影响 `onBusyChange` → `workspaceBusy` → 更新器门控链路 |

回滚点：阶段 1–3 是新增代码，整体回滚只需撤掉窗口声明与 `main.tsx` 分流。阶段 4、5 是独立的缺陷修复，可单独保留。

## 前置确认

- [ ] `MeetingRecordingPanel` 的状态同步不与 `RecordingWaveform` 的 40ms 轮询重复造成可感知开销（两者都打 `record_status`；必要时让面板复用同一份状态而不是各自轮询）。
- [ ] 悬浮窗 CSS 需要跟随现有主题变量（`--canvas-accent` / `--canvas-ink` 等，见 `RecordingWaveform.tsx:230-237`），不要硬编码颜色。
