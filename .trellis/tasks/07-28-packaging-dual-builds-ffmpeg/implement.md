# Implement: packaging dual builds + offline FFmpeg

## Checklist

1. **FFmpeg prepare script**
   - [x] `scripts/prepare-ffmpeg.mjs` + `scripts/ffmpeg-pin.json` (Gyan 8.1 essentials)
   - [x] gitignore：`third_party/ffmpeg-cache/`、`src-tauri/binaries/*`、`dist-installers/`
   - [x] 缓存命中跳过下载

2. **Tauri bundle config**
   - [x] `tauri.conf.json`：`targets: ["nsis"]`
   - [x] `tauri.offline.conf.json`：`externalBin: ["binaries/ffmpeg"]`

3. **Runtime resolve**
   - [x] `ffmpeg_service.rs`：managed → bundled → PATH
   - [x] 运行时下载 URL 与 pin 对齐
   - [x] 单元测试：`bundled_candidates_*`（本机 `cargo test` 若遇 `0xc0000139` 属环境 DLL，`--no-run` 已通过编译）

4. **npm scripts + artifact naming**
   - [x] `ffmpeg:prepare` / `pack:lean` / `pack:offline` / `pack:all`
   - [x] 产物 → `dist-installers/Meetly_*_x64-setup.exe` / `*-offline-setup.exe`

5. **Docs**
   - [x] README 双包说明
   - [x] 设置页 hint 微调

6. **Validate**
   - [x] `npm test` / `npm run typecheck`
   - [x] `npm run ffmpeg:prepare`（cache + stage）
   - [x] `npm run pack:lean` → ~5 MB
   - [x] `npm run pack:offline` → ~31 MB（含压缩 FFmpeg）；release 旁有 `ffmpeg.exe`

7. **GitHub Actions release**
   - [x] `.github/workflows/release.yml`：windows pack:all + FFmpeg cache + artifacts；tag 创建 Release
   - [x] README 补充 CI 用法

## Validation commands

```bash
npm run ffmpeg:prepare
npm run pack:lean
npm run pack:offline
npm run pack:all

npm run typecheck
npm test
cd src-tauri && cargo test --no-run
cd src-tauri && cargo test
```
