# Meetly week-1 Trellis bootstrap

## Goal

为 Meetly（个人会议转写与摘要桌面应用）完成首周 Trellis 基线：锁定产品与技术栈决策，产出可执行的第一周小任务，并写入前端结构、API 形态、错误处理、测试策略的最小代码规格。

## Background

- 开发者身份：`leo`。Spec 层：`backend`、`frontend`（单仓）。
- Spec 正文使用英文；本 PRD 可用中文记录产品决策。
- 子任务：`07-23-scaffold-tauri-shell`。
- **Incident (2026-07-23)**：`create-tauri-app` 脚手架过程曾清空仓库中的 `.trellis` / `.git` / `.cursor`；已 `trellis init` + 重写规格与任务后恢复。应用代码（`src/`、`src-tauri/`）保留。

## Goal User Value

个人用户在桌面端录制或导入会议音频，经异步转写得到文本，并结合自定义上下文生成结构化中文摘要；热词提升专有名词转写准确率。

## Requirements

- R1: 产品定位、首周范围、热词/上下文职责、摘要形态已决策并文档化。
- R2: 技术栈（Tauri 2 / React+TS / SQLite / 豆包语音 / Vitest+cargo test）已决策并文档化。
- R3: 创建首周小任务子任务，含可验收标准。
- R4: 写入最小规格：frontend directory structure、API shape、error handling、test strategy。
- R5: 规格可被后续 `trellis-implement` / `trellis-check` 直接遵循。

## Product Decisions

| Decision | Choice |
|----------|--------|
| Audience | 个人效率工具；无多用户 / 账号 / 协作 |
| Client | 桌面客户端（非网页） |
| Week-1 flow | 录音或导入音频 → 异步转写 → 查看转写 + 基础摘要；热词 CRUD；一段用户上下文 |
| Hotwords | **主要用于转写**（映射豆包请求级热词） |
| User context | **主要用于摘要** |
| Realtime ASR | 第一周不做 |
| Summary language | 简体中文 |
| Summary shape | 要点 / 待办 / 决策 三块 |

## Tech Stack Decisions

| Layer | Choice |
|-------|--------|
| Shell | Tauri 2 |
| UI | React + TypeScript + Vite |
| Local logic | Tauri Rust commands |
| Storage | SQLite (`rusqlite`) |
| ASR | 豆包语音大模型 · 录音文件识别（后续任务） |
| Tests | Vitest + `cargo test` |

## Out of Scope

- 多用户、实时流式转写、平台热词表同步、多套上下文。

## Acceptance Criteria

- [x] 产品与技术栈关键决策已写入本 PRD。
- [x] 已创建首周小任务 `07-23-scaffold-tauri-shell`。
- [x] `.trellis/spec/` 最小规格已落地。
- [x] 用户已批准规划；脚手架实现已完成（见子任务）。

## Child Task Map

| Child | Deliverable | Status |
|-------|-------------|--------|
| `07-23-scaffold-tauri-shell` | Tauri+React 脚手架、IPC 错误信封、SQLite settings、热词/上下文 UI | Implemented — awaiting finish/commit |
