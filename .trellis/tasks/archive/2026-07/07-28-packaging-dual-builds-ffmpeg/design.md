# Design: packaging dual builds + offline FFmpeg

## Architecture

```
prepare-ffmpeg (pinned URL → cache)
        │
        ├─ pack:lean  → tauri build --config lean (no FFmpeg bin)
        │                 → rename → Meetly_*_x64-setup.exe
        │
        └─ pack:offline → stage ffmpeg into src-tauri/binaries (or resources)
                          → tauri build --config offline (NSIS + externalBin/resources)
                          → rename → Meetly_*_x64-offline-setup.exe
```

Runtime resolve (Windows):

1. `{app_data_dir}/ffmpeg/ffmpeg.exe`（现有 managed / 运行时下载）
2. **Bundled** path（仅 offline 包存在）
3. `ffmpeg_sidecar::paths::ffmpeg_path()`（PATH / exe-adjacent）

## Bundling approach

**Prefer Tauri `bundle.externalBin`: `["binaries/ffmpeg"]` for offline config only.**

- Staging file: `src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe`（从缓存复制/重命名；gitignored）。
- Offline 安装后 sidecar 与主程序同目录；Rust 用 `tauri::path::BaseDirectory::Resource` 或 exe 同级 `ffmpeg.exe` 解析（实现时以 Tauri 2 实际落盘名为准，并加单测/手工验证）。
- **不**引入 `@tauri-apps/plugin-shell` sidecar spawn：编码路径继续 `std::process::Command` + 现有 `ffmpeg-sidecar` 参数构建。
- Lean 配置：`bundle.targets: ["nsis"]`，**无** `externalBin`。

Fallback if externalBin naming fights `ffmpeg_sidecar`: use `bundle.resources` 放入 `ffmpeg/ffmpeg.exe`，`resolve` 读 `app.path().resource_dir()`.

## Config split

| File | Role |
|------|------|
| `src-tauri/tauri.conf.json` | 默认 = lean（`targets: ["nsis"]`） |
| `src-tauri/tauri.offline.conf.json` | 合并/覆盖：`externalBin`（或 resources） |

Build:

- Lean: `npm run tauri -- build`
- Offline: `npm run tauri -- build --config tauri.offline.conf.json`（具体 CLI 以 Tauri 2 为准）

`productName` / `identifier` 两包相同，避免「两个 Meetly」；产物用脚本重命名加 `-offline`。

## FFmpeg cache contract

| Item | Value |
|------|--------|
| Pinned URL | 固定 essentials zip（版本钉死；勿用漂浮 latest 除非 hash 校验） |
| Cache root | 例：`third_party/ffmpeg-cache/`（gitignore）或 `%LOCALAPPDATA%/meetly/ffmpeg-cache` |
| Staged binary | `src-tauri/binaries/ffmpeg-<triple>.exe`（gitignore） |
| Script | `scripts/prepare-ffmpeg.mjs`（或 `.ps1`）— miss 则下载+解压+校验；hit 则跳过 |
| Future CI | 同一脚本 + `actions/cache` key = URL/version/hash |

## UI / UX

- 无 offline 专用设置页。
- `is_ready()` / `ffmpeg_status` 随 resolve 自动变 ready；按钮保持「已安装」。
- Hint 文案可选微调（非必须）：说明也可使用安装包内置版本。

## Compatibility

- Lean ≡ 今日行为。
- Offline 用户仍可再下载到 app_data（managed 优先）；一般不必。
- Program Files 只读：捆绑只读执行；下载仍只写 app_data。

## Risks

| Risk | Mitigation |
|------|------------|
| gyan zip 布局变化 | pin 具体版本 URL；脚本断言 `ffmpeg.exe` 路径 |
| externalBin 落盘名与预期不符 | 安装后打印/测试 resolve；必要时改 resources |
| 双包同 identifier 互覆盖安装 | 文档说明；属预期 |
| 安装包体积 +80–100 MiB | 预期；Release 说明 lean vs offline |
| 许可证 | README 注明 FFmpeg / gyan 再分发；必要时链到 LICENSE |

## Out of design (follow-up)

- Code signing / notarization
- MSI、macOS/Linux

## GitHub Actions

Workflow: `.github/workflows/release.yml`

- Triggers: `push` tags `v*`, and `workflow_dispatch`
- Job: `windows-latest` → npm ci → typecheck/test → `npm run pack:all`
- `actions/cache` on `third_party/ffmpeg-cache` keyed by `scripts/ffmpeg-pin.json` `version`
- Always `upload-artifact`; on tags also `softprops/action-gh-release` with lean + offline NSIS
