# Design: 用户体验增强（交互抛光 + 设置页 + 工作区布局）

## Architecture / Boundaries

| 层 | 改动 | 不改 |
|----|------|------|
| `shared/ui` | `ConfirmDialog`；rename/delete 图标 | Button 语义 |
| `features/meeting-sidebar` | Confirm 删除；IconButton；空态；CSS 显隐 | IPC meetings_* |
| `features/settings-credentials` | Clear Confirm；hint；密钥掩码 UX | clear/save IPC；不回传明文 |
| `features/settings-hotwords` | 错误中文；hint | 热词 IPC |
| `features/settings-recording` / `settings-ffmpeg` | hint | 业务逻辑 |
| `pages/settings` | 三 Tab 壳；页头文案 | 无新路由 |
| `pages/home` | 宽屏 split / 窄屏 workspace tabs；高度约束 | 摘要/转写业务逻辑 |

前端 only；无 Rust / IPC 契约变更。

## ConfirmDialog

```ts
type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};
```

- 关闭不拦截焦点；打开可聚焦容器/取消钮；Esc / 遮罩 → `onCancel`
- `danger` → 确认钮 `Button variant="danger"`；`busy` 禁用双钮
- 尊重 `prefers-reduced-motion` 与 `:focus-visible`
- 状态归调用方本地 state

## Credential masked fields（D9）

密钥字段：豆包 App Id / Token；DashScope Key；TOS AK / SK。  
非密钥：TOS Region / Bucket / Endpoint → 真值。

1. configured 且未编辑 → `masked=true`，展示固定 MASK  
2. focus 或首次 input → 清空，`masked=false`  
3. 保存：仅非空且非 masked 的真实输入进入 `settingsUpdate`；整组门控与现网一致（豆包成对等）  
4. 保存/refresh 后若仍 configured → 回到 masked  
5. Clear 后 → 空且非 masked  

## Settings Tabs

```
凭证 → Credentials
转写与摘要 → Hotwords
录音与编码 → Recording + FFmpeg
```

默认 `credentials`；仅挂载当前 tab。

## Workspace layout（D10 / D11）

**断点**：沿用约 `960px`（与现 `HomePage.module.css` 一致，可抽成共享常量）。

**宽屏（≥960）**

```
grid: 转写 pane | 摘要 pane
各 paneBody: flex 1; min-height 0; overflow auto
确保 .split / .layout 链路上 min-height:0，避免被长转写撑成整页滚动
```

**窄屏（<960）**

```
tablist: 转写 | 摘要
tabpanel: 仅当前面板（与宽屏同一 panel 组件）
```

**默认 Tab（D11）**

| 条件 | 默认 |
|------|------|
| `transcribing === true` | 转写 |
| 否则 | 摘要 |

- 选中新会议 / 新建进入工作区时按上表设默认  
- 不写 localStorage  
- 转写从 busy→idle 且当前仍在「转写」时：可选自动切到「摘要」（推荐，贴合「完成后看摘要」）；若与用户手动停留冲突，仅在「转写结束瞬间且用户未手动选过摘要/转写」时自动切——MVP 可简化为：**转写结束（`transcribing` false 且 `hasTranscript`）时若仍在转写 Tab 则切到摘要**

## Copy (hint)

用户向短说明；去掉 `settings_get` / SQLite；保留本机保存、大文件需 TOS。

## Trade-offs

| 选择 | 取舍 |
|------|------|
| 宽屏分栏 + 窄屏 Tab | 两套壳，体验对准痛点 |
| 前端掩码 | 不破坏 write-only |
| 转写结束自动切摘要 | 摘要优先；用户正在读转写时可能被切走——MVP 接受，可用「仅当仍停在转写 Tab」触发 |

## Rollback

还原 UI 文件即可；无迁移。
