# 版本发现与升级

## Goal

让 Windows 上已安装的 Meetly 用户能自动发现新版本，并在应用内下载、验证签名后安装升级；同时在设置中提供版本信息与手动检查入口。忙碌（录音/转写）时禁止安装重启，避免打断进行中的工作。

## Background

- Meetly 为 **Tauri 2** 桌面应用，当前版本 `0.2.0`。
- 已有公开仓库 [leoshcn/meetly](https://github.com/leoshcn/meetly) 的 GitHub Release：精简 + 离线 NSIS 安装包（`.github/workflows/release.yml`）。
- 尚无 updater 插件、版本检查逻辑或「关于」设置面板；README 注明未配置 Authenticode（与 Tauri 更新签名无关）。
- Tauri updater **强制** Ed25519 更新签名；生产 endpoint 须 HTTPS。

## Key Decisions

| Decision | Choice |
|----------|--------|
| 升级深度 | **C**：发现 UI + `tauri-plugin-updater` 应用内安装 |
| 更新产物 | **一律 lean**（`Meetly_*_x64-setup.exe`） |
| 检查时机 | **启动静默检查** + 设置内**手动检查** |
| 忙碌时行为 | 可提示/可下载；**禁止安装**直至空闲 |
| 呈现 | 设置「关于」Tab + 启动**非阻断条幅** + 设置齿轮小红点 |

### Proposed defaults (included in MVP unless rejected at final review)

- 条幅「稍后」：仅关闭**当前会话**提示，不永久跳过该版本。
- MVP **不做**「跳过此版本」。
- **不**在静默检查时自动下载；用户点击下载/安装后再下载（忙碌中允许下载，不允许安装）。
- Windows `installMode`: `passive`。
- Update endpoint：`https://github.com/leoshcn/meetly/releases/latest/download/latest.json`（仅含 `windows-x86_64` → lean）。

## Requirements

1. **R1 — 版本可见**：设置新增「关于」Tab，展示当前应用版本；提供「检查更新」及有更新时的版本号 / 更新说明（若 manifest 含 `notes`）。
2. **R2 — 启动静默检查**：应用启动后后台检查一次；网络/解析失败不打扰用户。
3. **R3 — 发现呈现**：有可用更新时显示非阻断条幅，设置齿轮可显示小红点；用户可「稍后」关闭本会话条幅。
4. **R4 — 应用内升级**：用户确认后下载 lean 安装包，校验签名，安装并重启；进度可感知。
5. **R5 — 忙碌保护**：录音中或转写 job 进行中时，禁用「安装并重启」；可继续提示与下载。
6. **R6 — 发布链路**：Release CI 使用更新私钥签名 lean 产物，生成并上传 `latest.json` + `.sig`（及既有安装包）；pubkey 写入应用配置。
7. **R7 — 手动检查**：关于页可随时检查；已是最新 / 失败需有明确文案。

## Acceptance Criteria

- [ ] **AC1**：关于页显示与 `tauri.conf.json` / 包版本一致的当前版本；手动检查在最新时提示已是最新。
- [ ] **AC2**：发布更高版本且 `latest.json` 正确时，旧版启动后出现非阻断条幅与齿轮提示；打开关于页可见新版本信息。
- [ ] **AC3**：空闲时用户可完成下载 → 签名校验 → 安装 → 重启，重启后版本号为新版本。
- [ ] **AC4**：录音或转写进行中，「安装并重启」不可用；下载若已开始可继续；空闲后可安装。
- [ ] **AC5**：静默检查失败（离线等）不弹窗、不阻断主流程。
- [ ] **AC6**：CI 在 tag Release 中附带 lean 安装包、对应签名材料与 `latest.json`；updater endpoint 可拉取该 JSON。
- [ ] **AC7**：条幅「稍后」后本会话不再显示条幅；重新打开应用若仍有更新可再次提示。

## Out of Scope

- macOS / Linux 升级
- Authenticode / SmartScreen 证书
- 应用内更新指向 offline 包或按安装类型分流
- 忙碌中强制安装
- 「跳过此版本」、多更新通道（beta）、强制更新策略
- 静默检查时自动预下载

## Risks / Setup dependencies

- 须一次性生成 Tauri signer 密钥对：pubkey 进仓库配置；**私钥仅存 GitHub Secrets**（及安全本地备份）。丢失私钥则已装客户端无法再收签名更新。
- 首个带 updater 的 Release 之前，旧客户端（无 updater）仍只能手动下安装包——可接受。
- 无 Authenticode 时 SmartScreen 警告可能仍在；与本功能独立。

## Technical Notes

- 插件：`tauri-plugin-updater` + `@tauri-apps/plugin-updater`；重启用 `@tauri-apps/plugin-process`（`relaunch`）。
- Capabilities：`updater:default`（及 process 所需权限）。
- `bundle.createUpdaterArtifacts: true`；CI 仅把 **lean** 写入 `latest.json` 的 `platforms.windows-x86_64`。
- 忙碌信号：聚合录音中 + 转写进行中（AppShell 已有 `transcribing`；录音 busy 需提升到壳层）。
