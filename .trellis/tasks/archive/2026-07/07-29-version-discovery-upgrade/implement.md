# Implement: 版本发现与升级

## Checklist

1. **Signer bootstrap (ops)**  
   - Generate keypair with Tauri CLI (`signer generate`).  
   - Put pubkey into `tauri.conf.json`; document secret names for CI.  
   - Do not commit private key.

2. **Tauri updater wiring**  
   - Add `tauri-plugin-updater` + `tauri-plugin-process` (Cargo + npm).  
   - Enable `createUpdaterArtifacts`, endpoints, pubkey, `installMode: passive`.  
   - Register plugins; extend `capabilities/default.json`.

3. **Pack / Release pipeline**  
   - Ensure lean build produces `.exe` + `.sig` under signing env.  
   - Script to emit `latest.json` for lean only.  
   - Update `.github/workflows/release.yml` to inject secrets, upload `latest.json` + signatures.  
   - Keep offline installer on Release for manual download.

4. **Frontend update feature**  
   - Feature module: check / download / install / session dismiss / progress.  
   - Lift recording busy to `AppShell`; define `appBusy`.  
   - Update banner + gear badge.  
   - Settings「关于」Tab: version, check, actions, error/up-to-date copy.  
   - Gate install on `!appBusy`.

5. **Tests**  
   - Unit-test pure helpers (e.g. busy gate, latest.json builder if extracted).  
   - Manual validation checklist below (updater hard to fully E2E in CI without signed fixtures).

6. **Docs**  
   - README / README.zh-CN: updater channel = lean; how releases must set signing secrets; offline still manual.

## Validation commands

```bash
npm run typecheck
npm test
cd src-tauri && cargo test
```

Manual (after a signed staging release or local static JSON endpoint in dev):

- [ ] Cold start on older build → banner + badge when newer `latest.json` present  
- [ ] About → check when up to date  
- [ ] Download while “busy” allowed; install disabled  
- [ ] Install when idle → relaunch → new version  
- [ ] Offline network → silent check fails quietly  
- [ ] Release assets include `latest.json` + lean `.sig`

## Risky files / rollback points

| Area | Files |
|------|--------|
| Config / caps | `src-tauri/tauri.conf.json`, `capabilities/default.json`, `Cargo.toml`, `src-tauri/src/lib.rs` |
| Pack / CI | `scripts/pack-installers.mjs`, new write-latest script, `.github/workflows/release.yml` |
| UI shell | `src/app/AppShell.tsx`, `src/pages/settings/*`, new `src/features/settings-about` / `app-update` |
| Secrets | GitHub Actions secrets — misconfig breaks signed releases |

Rollback: revert feature PR; for already-published bad `latest.json`, replace assets or cut a fixed tag.

## Before `task.py start`

- [x] `prd.md` converged  
- [x] `design.md` / `implement.md` written  
- [x] User explicitly approves final planning summary  
- [x] Curate `implement.jsonl` / `check.jsonl`  
- [x] Signer keypair generated locally (`~/.tauri/meetly.key`); pubkey in `tauri.conf.json`  
- [ ] Operator: add `TAURI_SIGNING_PRIVATE_KEY` to GitHub Actions secrets before next Release tag  
