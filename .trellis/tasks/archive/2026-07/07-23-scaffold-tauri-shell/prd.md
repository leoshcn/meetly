# Scaffold Meetly Tauri desktop shell

## Goal

搭好 Meetly 桌面端最小可运行骨架：Tauri 2 + React/TypeScript/Vite、SQLite settings、IPC 错误信封、热词与上下文设置读写。

## Background

- 父任务：`07-23-meetly-week1-bootstrap`。
- 热词 → 转写；用户上下文 → 摘要（本任务只持久化设置，不接 Doubao）。
- 实现已于本会话完成；任务元数据曾因脚手架误删后重建。

## Requirements

- R1: Tauri 2 + React + TS + Vite 可启动。
- R2: `app_health`、`settings_get`、`settings_update`。
- R3: `AppErrorDto` / 前端 `AppError` 归一化。
- R4: SQLite 持久化 hotwords / context_text。
- R5: Settings UI + 文案区分职责。
- R6: 目录对齐 specs。
- R7: `cargo test` + Vitest。

## Out of Scope

- 录音、豆包、jobs、摘要生成。

## Acceptance Criteria

- [x] 桌面工程可构建；`npm run tauri dev` 需 MSVC + vcvars（见 README）。
- [x] Settings 持久化。
- [x] 空/空白热词 → `SETTINGS_INVALID`，不写库。
- [x] 前端仅通过 `src/ipc` 调用。
- [x] `cargo test`（8）与 Vitest（7）通过。
- [x] README / `.env.example` 无真实密钥。
