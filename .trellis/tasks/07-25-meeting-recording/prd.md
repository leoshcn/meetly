# 会议录音与保存路径设置

## Goal

用户可在 Meetly 首页空态开始 / 停止会议录音，**始终混录麦克风与系统扬声器（WASAPI loopback）**，将 WAV 写入可配置本地目录（默认用户文档下 `Meetly/Recordings`）；停止后自动创建会议并启动转写。面向网络会议：本地发言 + 对方播出声一并捕获。

## Background

- Meetly：Tauri 2 + React/TS + Rust/SQLite 桌面应用。
- 已实现（v1）：仅麦克风输入设备录音 + 保存目录设置 + 停录后建会转写。
- 产品更正：网络会议场景不能只录输入设备，必须包含系统 speaker 音频。
- 会议行在停录后创建；录音进行中不扩展 `meetings` 状态机。
- 转写上限：flash ≤20 MiB，async ≤512 MiB。
- 删除会议不删除音频文件。

## Key Decisions

| Decision | Choice |
|----------|--------|
| 音源 | **始终混录**：麦克风（可选输入设备，默认系统默认麦）+ 系统扬声器 loopback（默认系统默认输出设备）。不做「仅麦 / 仅系统 / 三模式切换」。 |
| 停录后 | 落盘 → `meetings_create_from_file` → `jobs_start_transcription`。 |
| 入口 / 进行中 UI | 空态双入口：「开始录音」+「导入音频并转写」。录音中显示计时 / 停止 / 当前麦与输出设备信息。 |
| 默认保存目录 | OS 用户文档下 `Meetly/Recordings`；不存在则创建；不可写则报错，不静默换目录。 |
| MVP 平台验收 | **仅 Windows**（WASAPI loopback 为主路径）；macOS/Linux 不纳入本变更验收（可降级或明确不可用）。 |
| 捕获实现 | `cpal`：input stream on mic + input stream on output device（loopback）→ 重采样/对齐后混音 → `hound` 写单路 WAV。专用录音线程持有 `!Send` streams。 |

## Requirements

- R1: 空态「开始录音」与「导入」；录音中可停止并显示进行中反馈。
- R2: 开始前可选择**麦克风**输入设备（默认系统默认麦）；系统输出默认用系统默认播放设备做 loopback（MVP 可不提供输出设备下拉，除非实现成本低）。
- R3: 录音同时捕获麦与系统扬声器并混为单一 WAV；任一侧开流失败则整体失败并明确错误（不静默变成仅麦）。
- R4: Settings `recording_dir` 行为保持不变。
- R5: 停录后建会 + 自动转写（含 bootstrap job 轮询）保持不变。
- R6: 不可并行开第二场录音。
- R7: Windows 上手动验收：播放系统音频 + 对麦说话，录音文件中两者均可辨。

## Acceptance Criteria

- [ ] AC1: 空态双入口；可开始 / 停止录音。
- [ ] AC2: 可选麦克风；默认系统默认麦。
- [ ] AC3: 录音文件写入默认或配置目录的 `.wav`。
- [ ] AC4: 设置可改保存目录；非法路径有明确错误。
- [ ] AC5: 停录后自动建会并转写。
- [ ] AC6: 不可并行开录。
- [ ] AC7: Windows 上混录可验证：仅有系统声、仅有麦声、两者同时时，文件中对应内容可听到（或通过电平/时长非空侧面验证）。
- [ ] AC8: loopback 或麦开流失败时，开录失败并提示，不生成「假装成功」的仅单路文件。

## Out of Scope

- 仅麦 / 仅系统 / 用户切换三种模式的 UI。
- 实时流式 ASR、暂停 / 恢复。
- 删除会议时删录音文件。
- macOS / Linux 正式 loopback 验收（Core Audio / Pulse 另议）。
- 多输出设备选择（除非实现时顺手；非 AC）。
- 回声消除（AEC）高级处理；MVP 接受麦拾取到扬声器漏音的可能。

## Technical Notes

- Windows：对 **output** 设备 `default_output_config` + `build_input_stream` → cpal 自动 WASAPI `AUDCLNT_STREAMFLAGS_LOOPBACK`。
- 两路可能不同 sample rate / channel → 混音前重采样到统一 spec（建议 16-bit mono 或 stereo @ 16 kHz / 48 kHz，与设备协商后固定）。
- 详设：`design.md`；实现清单：`implement.md`；调研：`research/recording-stack.md`。
