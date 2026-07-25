# Design: 侧边栏、发言人、摘要语言与复制

## Architecture

```
AppShell
├── MeetingSidebar (collapse / list / select / rename / delete)
└── main
    ├── TranscriptionImportPanel (import OR load selected meeting)
    └── MeetingSummaryPanel (language select → generate → copy)
```

- **pages/home**：持有 `activeMeetingId`，串联侧边栏、转写、摘要；删除当前项时清空选中。
- **features** 互不直接 import 内部实现；经 page props / 回调通信。
- **ipc/** 为唯一 `invoke` 出口。

## Data model

### transcripts（迁移扩展）

| Column | Role |
|--------|------|
| `text` | 当前渲染全文（含显示名）；摘要生成只读此字段 |
| `raw_json` | ASR 原始响应（不变） |
| `segments_json` | `[{ "speaker_id": "1", "text": "..." }, ...]`；无分离时为 `null`/`[]` |
| `speaker_names_json` | `{ "1": "张三", "2": "李四" }`；缺省用 `发言人{N}` |

渲染规则：按 segment 顺序输出，前缀 `【{displayName}】` + 文本（具体排版可在实现时微调，但须稳定可重建）。

### summaries

- `language` 扩展为 `zh-CN` | `en` | `zh-en`（已有列，无需迁表）。
- 发言人应用更新时：`DELETE FROM summaries WHERE meeting_id = ?`。

## IPC contracts

| Command | Request | Response |
|---------|---------|----------|
| `meetings_list` | (none) | `Meeting[]`，`created_at` 降序 |
| `meetings_rename` | `{ meeting_id, title: string }` | `Meeting`（更新后）；`title` trim 后非空，否则校验错误 |
| `meetings_delete` | `{ meeting_id }` | `{ ok: true }` 或 void；先删 `summaries` / `transcripts` / `jobs`，再删 `meetings`（FK 无 CASCADE） |
| `meetings_get_transcript` | `{ meeting_id }` | 扩展后的 `Transcript` |
| `meetings_update_speakers` | `{ meeting_id, speaker_names: Record<string, string> }` | `Transcript`（已重渲染）；副作用：删除该会议 summary |
| `summary_generate` | `{ meeting_id, language }` | `Summary`（`language` 回显所选） |
| `summary_get` | 不变 | `language` 类型放宽为三值联合 |

错误：非法 `language` / 空标题 → 校验错误；无 segments 时调用 update_speakers → 明确业务错误（如 `TRANSCRIPT_NO_SPEAKERS`）或 no-op 策略在实现中二选一并写入 api-shape；删除不存在的 meeting → `NOT_FOUND`。

**不删除** `source_path` 指向的本地音频文件。

## ASR

在 `build_flash_body` / `build_async_submit_body` 的 `request` 中开启发言人分离与分句（按豆包文档：`enable_speaker_info`、`show_utterances`，必要时 `ssd_version`）。

转写成功路径：解析 `result.utterances` → 写入 `segments_json` + 默认 `speaker_names_json` + 渲染 `text`。若无 utterances/speaker，则 `segments` 空，行为同今日纯文本。

## Summary generation

- `SummaryGenerateInput` 增加 `language`。
- System **与 user** prompt 均按语言分支（仅改 system、user 仍写中文时，Qwen 易跟转写语言输出中文）：
  - `zh-CN`：简体中文数组；中文 user 指令
  - `en`：English-only arrays（转写为中文也须翻译）；英文 user 指令 + 强调 translate
  - `zh-en`：每条字符串为 `中文 / English` 并列；中文 user 指令
- JSON schema 字段仍为 `key_points` / `action_items` / `decisions`。

## Frontend UX

- 侧边栏默认展开；收起后主区占满；状态可仅 session 内记忆。
- 项目行：展示标题；提供重命名（行内编辑或简易对话框）与删除；删除前 `window.confirm`（或等价确认 UI）。
- 「新建项目」：清空 `activeMeetingId`，主区回到导入空态；收起态侧栏也提供「新建」入口。
- 发言人：列出唯一 `speaker_id` 的输入框 +「应用」；成功后若摘要被清，摘要区回到未生成态并短提示。
- 语言：生成按钮旁 radio/select；默认 `zh-CN`。
- 复制：将三块格式化为 Markdown 写入剪贴板（`##` 标题 + `-` 列表）；章节标题与空态文案跟随 `Summary.language`（`en` / `zh-en` / `zh-CN`）；操作区 UI（生成/复制按钮等）可保持中文。

## Compatibility

- 旧库：迁移加列默认空；旧转写无 segments → 纯文本 UI（D7）。
- 已有仅 `zh-CN` 摘要继续可读。

## Risks

- 豆包 flash 与标准 async 对 speaker 字段路径可能略有差异 → 解析需容错并有单测 fixture。
- 改名后删摘要不可恢复 → 符合 D2；UI 需说清。
