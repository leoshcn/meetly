# Implement: Configurable summary system prompts

## Checklist

1. **Defaults API** — 将 `system_prompt_for_language` 抽成公开可复用函数/常量；新增 `summary_system_prompt_defaults()` map；`build_summary_messages` 改为使用已 resolve 的 system 字符串。
2. **DB** — `007_summary_system_prompts.sql` + `ensure_summary_system_prompt_columns`；扩展 `get_settings` / `update_settings` SELECT/UPSERT。
3. **Models** — Rust `Settings` / `SettingsUpdate` + 归一化（trim + equals-default → `""`）。
4. **Summary path** — `summary_service::generate_summary` 按 language resolve 后传入 `SummaryGenerateInput`。
5. **Frontend types / IPC** — `src/ipc/types.ts` + settings tests。
6. **UI** — `SettingsHotwords`：三提示词区 + 预填 + 恢复默认 + 保存；文案区分上下文。
7. **Tests** — Rust：normalize、defaults、resolve、migrate；Vitest：字段透传。
8. **Spec touch-up（可选同 PR 或 follow-up）** — `database-guidelines` / `api-shape` / frontend settings copy 行。

## Validation

```bash
cd src-tauri && cargo test
npm test -- --run src/ipc/commands/settings.test.ts
```

手测：首次打开预填默认 → 不改保存 → 再开仍为默认且生成行为不变 → 改 zh-CN 保存 → 生成用新提示 → 恢复默认保存 → 回退。

## Risky files

- `src-tauri/src/providers/qwen/client.rs` — 提示词组装
- `src-tauri/src/services/settings_service.rs` / `db/pool.rs` — 设置读写与迁移
- `src/features/settings-hotwords/SettingsHotwords.tsx` — UI

## Before `task.py start`

- [x] prd / design / implement 齐全
- [x] 用户批准最终规划摘要
- [x] 为 implement/check jsonl 写入真实 spec 条目

## Done notes

- Built-ins live in `models/summary_prompts.rs` (avoid models↔providers cycle).
- `cargo check` succeeds; `cargo test` currently fails to launch the harness on this machine (`STATUS_ENTRYPOINT_NOT_FOUND` / 0xc0000139) after clean rebuild — environmental DLL issue, not a compile error. Vitest settings tests pass.
