# Implement: 侧边栏、发言人、摘要语言与复制

## Checklist

1. DB 迁移：`transcripts.segments_json` / `speaker_names_json`；注册到 `db/pool.rs`。
2. 模型与 DTO：扩展 `Transcript`、`Summary.language`；更新 `api-shape.md` / 相关 spec。
3. Doubao flash + async：请求开启发言人分离；解析 utterances → segments；upsert 时写入扩展字段。
4. `meetings_list` + `meetings_rename` + `meetings_delete`（有序清理关联表，不删音频文件）+ `meetings_update_speakers`（重渲染 text、删 summary）；TS IPC 包装与测试。
5. `summary_generate` 接受 `language`；Qwen prompt 三分支；服务层/单测覆盖。
6. UI：`meeting-sidebar` feature（列表 / 收起 / 重命名 / 删除确认）；HomePage 串联 `activeMeetingId`；加载历史会议转写/摘要；删当前项清空选中。
7. 转写面板：发言人改名 + 应用；无 segments 时隐藏。
8. 摘要面板：语言选择、复制按钮、摘要被删后的空态/提示。
9. 跑前端/后端相关测试；手动冒烟清单见下。

## Validation

```bash
cd src-tauri && cargo test
npm test
```

Manual:

- 导入音频 → 侧边栏出现项目 → 收起/展开侧边栏。
- 重命名项目 → 列表与主区标题同步；重启后仍为新标题。
- 删除项目（取消确认应保留；确认后消失）；确认本地音频文件仍在；删当前打开项后主区空态。
- 转写含多发言人 → 改名应用 → 全文更新 → 原摘要消失并提示。
- 分别用 zh-CN / en / zh-en 生成 → 抽查条目形态 → 一键复制粘贴验证。
- 打开仅有纯文本的旧会议 → 无发言人改名面板，摘要仍可用。

## Risky files

- `src-tauri/src/providers/doubao/flash_client.rs` / `async_client.rs`
- `src-tauri/src/services/meeting_service.rs` / `transcription_service.rs` / `summary_service.rs`
- `src/app/AppShell.tsx` / `src/pages/home/HomePage.tsx`
- `src/features/transcription-import/*` / `meeting-summary/*`

## Before `task.py start`

- [x] PRD / design / implement 齐备
- [x] 用户决策 D1–D7 已写入 PRD
- [x] 用户明确批准本最终规划摘要
- [x] 为 implement/check JSONL 写入真实 spec 条目
