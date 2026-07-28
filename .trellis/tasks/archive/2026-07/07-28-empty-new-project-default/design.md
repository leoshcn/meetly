# Design: 空态新建默认项目

## Data flow

```
侧栏「新建项目」
  → meetings_create
  → INSERT meetings (title=未命名项目, source_path="")
  → onNewProject(meeting) → 选中草稿
  → 主区：草稿 → MeetingRecordingPanel(draftMeetingId)

录音/导入完成
  → meetings_attach_source(draftMeetingId, path)  // 若有草稿
  → 或 meetings_create_from_file(path)            // 无草稿（兼容）
  → jobs_start_transcription
  → 主区切到转写/摘要分栏
```

## IPC

| Command | Request | Response |
|---------|---------|----------|
| `meetings_create` | (none) | `Meeting` |
| `meetings_attach_source` | `{ meeting_id, path }` | `Meeting` |

`attach_source`：仅当当前 `source_path` 为空；校验文件同 `create_from_file`；标题按 D5。

## Frontend

- `MeetingSidebar`：创建草稿后 `onNewProject(meeting)`。
- `HomePage`：跟踪 `activeSourcePath`；`isDraft = activeMeetingId && !source_path.trim()`；草稿显示录音空态。
- `MeetingRecordingPanel`：可选 `draftMeetingId`，有则 `attach_source`。

## Files

- `src-tauri/src/services/meeting_service.rs` — `create`, `attach_source`
- `src-tauri/src/commands/meetings.rs` + `lib.rs` 注册
- `src/ipc/commands/meetings.ts` + exports
- `MeetingSidebar.tsx`, `HomePage.tsx`, `MeetingRecording.tsx`
- `.trellis/spec/backend/api-shape.md`
