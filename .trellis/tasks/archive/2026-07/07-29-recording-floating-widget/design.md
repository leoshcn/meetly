# Design: 录音悬浮窗与关窗拦截

依据 `prd.md`。技术核实记录见 `research/tauri-floating-window.md`。

## 架构决策

### D1 悬浮窗在 `tauri.conf.json` 静态声明，只 show/hide，不运行时创建

docs.rs 明确指出：Windows 上在**同步** command 里创建窗口会死锁。`record_start` 正是同步 command（`src-tauri/src/commands/recording.rs:16`）。因此不采用 `WebviewWindowBuilder` 运行时创建。

在 `app.windows` 中与 `main` 并列声明第二个窗口，`visible: false`，录音开始时 `show()`、停止时 `hide()`。附带收益：webview 常驻预热，显示无延迟。

窗口 label：`recorder-widget`。

配置项：`decorations: false`、`transparent: true`、`alwaysOnTop: true`、`skipTaskbar: true`、`shadow: false`、`resizable: false`、`visible: false`、`focus: false`。

`shadow` 必须为 false：undecorated 窗口开启 shadow 会得到 1px 白边。圆角与投影一律用 CSS。

### D2 单 Vite 入口，按窗口 label 分流

`src/main.tsx` 目前无条件挂载 `AppShell`。改为读 `getCurrentWindow().label`，`recorder-widget` 挂载悬浮窗根组件，其余挂载 `AppShell`。不新增 HTML 入口、不改 Vite 构建配置。

`bootstrapThemeFromCache()` 对两个窗口都要执行——悬浮窗需要跟随主题（localStorage 同源共享）。

### D3 独立 capability 文件

`capabilities/default.json` 当前是 `"windows": ["main"]`。label 不匹配任何 capability 的窗口完全没有 IPC 访问权。新增 `capabilities/recorder-widget.json`，授予：

- `core:default`
- `core:window:allow-start-dragging`（`data-tauri-drag-region` 的前置条件）
- `core:window:allow-set-position`、`allow-set-size`
- `core:window:allow-set-focus`、`allow-unminimize`、`allow-show`（用于唤起 `main`）

`main` 的 capability 追加 `core:window:allow-show` / `allow-hide` / `allow-set-size` / `allow-set-position`，用于控制悬浮窗。

通过 `invoke_handler` 注册的应用 command 默认对所有窗口开放（`lib.rs` 未使用 `AppManifest::commands`），因此 `record_status` 无需额外权限条目。

### D4 状态同步沿用轮询，不引入事件总线

现有代码已确立轮询模式（`RecordingWaveform.tsx:56-67` 40ms 轮询 `record_status`）。悬浮窗自持轮询，分档：

| 状态 | 轮询间隔 | 用途 |
|---|---|---|
| 展开态 | 60ms | 电平条 + 计时 + 存活判定 |
| 折叠态 | 1000ms | 仅存活判定（红点不需要电平） |

计时不依赖轮询节奏，由 `started_at` 与本地时钟推导，因此降频不影响计时精度。

`state !== "recording"` 即自行 `hide()`，这让悬浮窗对任何路径的停录（主窗口停止、关窗拦截停止）都自动收敛，不需要额外通知。

### D5 悬浮窗不停止录音，只唤起主窗口

「打开 Meetly」执行：`main` 窗口 `unminimize()` → `show()` → `setFocus()`，并 emit 一个事件让主窗口切回录音界面（R6.2）。主窗口监听该事件并把 `screen` 置为 `home`。

监听者必须放在 `AppShell` 层——`HomePage` 会被卸载（见 `prd.md` Background），`AppShell` 是稳定宿主。

### D6 录音状态一致性：给面板加低频状态同步，不重构会话所有权

R7 要求主窗口的录音 UI 不再因组件卸载而失真。最小且完整的做法是在 `MeetingRecordingPanel` 内加一个 1s 的 `record_status` 同步：

- 挂载时立即拉一次：`state === "recording"` 则进入录音 UI，并用 `started_at` 恢复计时（替代当前基于挂载时刻的 `startedAtRef`，见 `MeetingRecording.tsx:100`）。
- 运行期间持续对齐：后端变为 `idle` 时把本地 `recording` 收敛为 false（满足 R7.3）。

这一处改动同时修掉三件事：进设置页丢状态、切换会议丢状态、外部路径停录后 UI 过期。不需要把录音会话所有权提升到 `AppShell`，也不需要新增 context。

计时改为 `Date.now() - Date.parse(started_at)`。`started_at` 是 `Local::now().to_rfc3339()`（`recording_service.rs:701`），`Date.parse` 可直接处理带偏移量的 RFC3339。

`onBusyChange?.(busy || recording)` 的现有语义保持不变。

### D7 关窗拦截在 Rust 侧，停止路径只落盘

`lib.rs` 当前没有 `on_window_event`。新增窗口事件处理：

```
main + CloseRequested:
  if recording.status().state == "recording":
      api.prevent_close()
      emit("recording:close-requested") -> main window
  else:
      // 允许关闭，随后显式退出
      app_handle.exit(0)

recorder-widget + CloseRequested:
  api.prevent_close()   // R1.2
```

`app_handle.exit(0)` 是必需的：常驻的 `recorder-widget` 窗口会让进程在 `main` 关闭后继续存活（R8.4 / A12 / A14）。

前端在 `AppShell` 层监听 `recording:close-requested`，弹出应用内模态（三选一）。放在 `AppShell` 而非 `HomePage`，因为用户可能正停在设置页。

「停止并保存录音」只执行 `record_stop`，取返回的 `path` 展示给用户，然后退出应用。**不**调 `meetings_create_from_file`、**不**调 `jobs_start_transcription`：

- 这两步在正常路径上依赖 `HomePage` 的 `handleMeetingCreated` 回调与 `draftMeetingId`（`HomePage.tsx:186-194`、`MeetingRecording.tsx:109-114`），在设置页场景下没有宿主。
- 若在此处无条件 `meetings_create_from_file`，当存在草稿会议时会与草稿产生重复/孤立的会议行。
- `record_stop` 已经完成 WAV finalize 与 M4A 转码（`recording_service.rs:793-866`），文件本身是完整可用的，不存在数据丢失。

这是逃生通道而非主路径，所以选择可预测的最小行为，并在文案里明确告知用户下次用「导入音频并转写」。

### D8 位置持久化用 localStorage，不做 DB 迁移

`settings` 是单行多列表（`001_settings.sql`），新增字段需要迁移 + `Settings` / `SettingsUpdate` DTO 改动 + `api-shape.md` 同步。悬浮窗坐标是纯 UI 偏好、可丢失、非跨设备，代价不对称。

沿用主题已有的 localStorage 缓存先例（`bootstrapThemeFromCache`，`src/main.tsx:7`），键名 `meetly.recorderWidget.position`。两个窗口同源，localStorage 共享。

R5.4 的「重置悬浮窗位置」在设置页录音相关分区（`SettingsRecording.tsx`）清除该键。

### D9 多显示器坐标校验

`show()` 之前：读取保存坐标 → `availableMonitors()` → 校验目标矩形与任一显示器可见区域相交 → 不相交则回落默认位置（主显示器顶部居中偏下）并覆写保存值。

拔掉外接屏后悬浮窗永久消失且用户无从恢复，是这个功能唯一的「静默失效」失败模式，必须在显示前而非拖动时校验。

### D10 折叠/展开与窗口尺寸

折叠与展开是两套尺寸，切换时同步 `setSize()`。窗口矩形必须紧贴内容：透明窗口的多余区域仍然接收点击，会挡住底下的应用（R3.3）。

拖动手柄：药丸背景元素挂 `data-tauri-drag-region`；「打开 Meetly」、「折叠」等交互元素不得挂该属性，否则会退化成拖动区。

## 数据流

```
record_start (main window)
  └─> 主窗口 show recorder-widget（校验坐标后 setPosition，再 show）

recorder-widget
  └─> 轮询 record_status
        ├─ state=="recording" → 渲染红点/计时(started_at)/电平(mic_level,system_level)
        └─ state=="idle"      → hide 自身

recorder-widget「打开 Meetly」
  └─> main.unminimize/show/setFocus + emit → AppShell 切 screen=home

MeetingRecordingPanel（每 1s）
  └─> record_status → 对齐本地 recording 与计时基准

main CloseRequested（Rust）
  ├─ recording → prevent_close + emit recording:close-requested
  │                └─> AppShell 模态 → record_stop → 展示 path → exit(0)
  └─ idle      → app_handle.exit(0)
```

## 契约变更

无新增 Tauri command，无 DTO 变更，无 DB 迁移。`api-shape.md` 的命令表不需要改。

新增的窗口间事件需要记录到规范：

| 事件 | 方向 | 载荷 |
|---|---|---|
| `recording:close-requested` | Rust → `main` | 无 |
| `recording:focus-request` | `recorder-widget` → `main` | 无 |

## 兼容性

- 平台：仅 Windows 生效有意义（录音本身在非 Windows 直接报错，`recording_service.rs:594-600`）。悬浮窗窗口声明本身跨平台无害；`skipTaskbar` 在 macOS 无效，`transparent` 在 macOS 需要 `macos-private-api` feature——本任务不为此启用该 feature。
- 现有安装包与更新流程不受影响：无新增 Rust 依赖、无新增 npm 依赖、无新增插件。
- 打包脚本（`pack:lean` / `pack:offline`）不受影响。

## 回滚

改动集中在：`tauri.conf.json` 窗口声明、`capabilities/`、`src-tauri/src/lib.rs` 的 `on_window_event`、`src/main.tsx` 分流、新增 `src/features/recorder-widget/`、`MeetingRecording.tsx` 的状态同步、`AppShell.tsx` 的事件监听与模态。

回滚粒度：移除窗口声明 + `main.tsx` 分流即可让悬浮窗整体失效，其余改动（面板状态同步、关窗拦截）可独立保留——它们本身就是缺陷修复。

## 已知限制（需实测确认后写入 PRD）

独占全屏应用可能盖住置顶窗口。腾讯会议 / Zoom 的全屏通常是无边框最大化窗口，预期不受影响，但必须手工验证。若确认被遮挡，这是本方案的固有限制，需在 PRD Risks 中定性记录，不在本任务内引入托盘等备用通道。
