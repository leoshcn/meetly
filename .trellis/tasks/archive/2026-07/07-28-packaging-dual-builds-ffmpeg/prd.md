# Meetly packaging dual builds with offline FFmpeg

## Goal

打通 Meetly Windows 安装包发布能力：一次本地流程产出 **lean** 与 **offline** 两个 NSIS 安装包；offline 内置 FFmpeg，避免终端用户首次从 gyan.dev 慢速下载 ~80–100 MiB。脚本约定按未来 GitHub Actions 可复用设计，本任务不落地完整 CI workflow。

## Background

- 栈：Tauri 2（`src-tauri/tauri.conf.json`），当前 `bundle.targets: "all"`，无 `resources` / `externalBin`，无 release 脚本。
- FFmpeg：运行时从 gyan.dev essentials zip 装到 `{app_data_dir}/ffmpeg/`（Windows only）；`resolve_ffmpeg_path` 优先 managed 路径，再 `ffmpeg_sidecar` PATH/exe-adjacent。
- 录音与 FFmpeg 自动下载均为 Windows 中心；设置页在 `installed` 时已禁用下载按钮。

## Requirements

- R1: Windows 仅产出 **NSIS**（`.exe`）双包：lean（不内置 FFmpeg）+ offline（内置 FFmpeg）。
- R2: offline 安装后，无外网 FFmpeg 下载时即可 M4A 编码（`resolve_ffmpeg_path` 找到可用二进制 → `ffmpeg_status` 为 ready）。
- R3: lean 保留现有运行时下载；对外默认推荐 lean，offline 为慢网/免下载备选。
- R4: 安装包**文件名**可区分变体（同 `productName`/`identifier`，避免双应用并存）。
- R5: README + npm scripts 说明如何复现双包构建。
- R6: FFmpeg 构建来源为 **缓存目录 + pinned 版本 URL**（本地 miss 可拉一次；未来 CI 用 `actions/cache`）。不把 zip 提交进 git。
- R7: 不为 offline 做单独设置页；只扩展路径解析，复用现有「已就绪 / 已安装」UI。

## Out of Scope

- macOS / Linux 安装包与 FFmpeg 捆绑；非 Windows 录音。
- Windows MSI。
- 改变录音/编码业务语义（M4A、WAV fallback 保持）。
- 将 FFmpeg zip 永久提交进仓库。
- 代码签名 / 公证（可后续加 secrets）。

## CI notes

- Release workflow：`.github/workflows/release.yml`（tag `v*` + `workflow_dispatch`）。
- FFmpeg：`actions/cache` ↔ `third_party/ffmpeg-cache`，key = pin version。

## Acceptance Criteria

- [ ] AC1: `npm`（或文档化的等价命令）可生成 lean + offline 两个 NSIS 安装包。
- [ ] AC2: offline 包在全新机、阻断 gyan.dev 的情况下，录音停止后可得到 M4A（或 `ffmpeg_status.installed === true` 且 path 指向捆绑二进制）。
- [ ] AC3: lean 包行为与今日一致：无捆绑 FFmpeg 时可运行时下载；产物文件名与 offline 可区分。
- [ ] AC4: FFmpeg 准备脚本支持缓存命中跳过下载；pinned URL/版本写在仓库可配置处（脚本常量或小配置文件）。
- [ ] AC5: README 写明双包含义、默认推荐 lean、offline 适用场景、本地构建步骤。
- [ ] AC6: 设置页无 offline 专用分支；offline 下下载按钮为「已安装」态。

## Decisions

| ID | Decision |
|----|----------|
| D1 | 目标含未来 GitHub Actions；本任务不写完整 workflow |
| D2 | FFmpeg = 缓存目录 + pinned URL |
| D3 | 双包分发：默认 lean；offline 备选；lean 保留运行时下载 |
| D4 | MVP 仅 Windows + 仅 NSIS |
| D5 | 无 offline 专用设置 UI；只修 `resolve_ffmpeg_path` |

## Technical Notes

- 解析顺序（拟）：`app_data` managed → **bundled offline 二进制** → PATH / exe-adjacent。
- 捆绑方式在 `design.md` 中定（`externalBin` vs `resources`）；优先与现有 `Command::new(path)` 兼容、无需 shell sidecar 权限的方案。
- 双包：两份 Tauri bundle 配置或 CLI 覆盖；offline 构建前将缓存中的 `ffmpeg.exe` 放入约定路径。
- 同 `identifier: com.meetly.app`；用产物重命名区分 `-offline`。

## Related Files

- `src-tauri/tauri.conf.json`
- `src-tauri/src/services/ffmpeg_service.rs`
- `src-tauri/src/lib.rs`
- `src/features/settings-ffmpeg/`
- `package.json` / `README.md`
