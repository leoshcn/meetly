# Design: 版本发现与升级

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ React (AppShell)                                             │
│  · boot: silent check()                                      │
│  · UpdateBanner (non-blocking)                               │
│  · settings gear badge                                       │
│  · appBusy = recording || transcribing → gate install        │
│  · Settings → About tab: version, check, download/install    │
└───────────────┬─────────────────────────────────────────────┘
                │ @tauri-apps/plugin-updater / plugin-process
┌───────────────▼─────────────────────────────────────────────┐
│ Tauri updater plugin                                         │
│  · endpoints → GitHub latest.json (HTTPS)                    │
│  · verify Ed25519 pubkey from tauri.conf.json                │
│  · download lean NSIS → installMode passive → quit/relaunch  │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│ GitHub Release assets                                        │
│  · Meetly_*_x64-setup.exe (+ .sig)                           │
│  · Meetly_*_x64-offline-setup.exe (manual only)              │
│  · latest.json → windows-x86_64 → lean url + signature       │
└─────────────────────────────────────────────────────────────┘
```

## Config

`src-tauri/tauri.conf.json` (and keep offline overlay compatible):

- `bundle.createUpdaterArtifacts: true`
- `plugins.updater.pubkey`: generated public key content
- `plugins.updater.endpoints`:  
  `["https://github.com/leoshcn/meetly/releases/latest/download/latest.json"]`
- `plugins.updater.windows.installMode`: `"passive"`

Register plugins in Rust `Builder` alongside opener/dialog.  
Capabilities: add `updater:default` and process plugin permissions required for `relaunch`.

## Frontend boundaries

| Piece | Responsibility |
|-------|----------------|
| Update controller/hook (feature module) | `check`, download progress state, available update metadata, session dismiss flag |
| `AppShell` | Own `appBusy`; render banner + badge; pass busy into about/actions |
| `SettingsAbout` panel | Current version (`getVersion` from `@tauri-apps/api/app`), manual check, actions |
| Banner | New version label, primary CTA → about or inline download/install, 「稍后」 |

Do **not** call `downloadAndInstall` when `appBusy`; allow `download` then `install` only when idle (or single `downloadAndInstall` only when idle). Prefer explicit states: `idle | checking | available | downloading | readyToInstall | installing | upToDate | error`.

## Busy definition

`appBusy === true` when:

- Meeting recording state is `recording`, or
- Transcription/import job is running (`transcribing` already lifted to AppShell)

Install button disabled + short reason when busy.

## Release / CI

1. Store `TAURI_SIGNING_PRIVATE_KEY` (+ optional password) in GitHub Actions secrets.
2. Before `pack:all` / tauri build, export those env vars so lean (and offline) builds produce `.sig` files.
3. After lean artifact is copied to `dist-installers/`, generate `latest.json`:

```json
{
  "version": "<semver from package.json>",
  "notes": "<optional release notes snippet>",
  "pub_date": "<RFC3339>",
  "platforms": {
    "windows-x86_64": {
      "url": "https://github.com/leoshcn/meetly/releases/download/v<ver>/Meetly_<ver>_x64-setup.exe",
      "signature": "<contents of .sig>"
    }
  }
}
```

4. Upload `latest.json`, lean exe, lean `.sig` (and existing offline exe) via `softprops/action-gh-release`.
5. Offline remains for manual install only — **omit** from `latest.json`.

Adapt `scripts/pack-installers.mjs` and/or a small `scripts/write-latest-json.mjs` to copy `.sig` and emit JSON so CI stays deterministic.

## Security / ops

- Never commit the private key.
- Pubkey is public and embedded in the binary; rotation requires a transition plan (out of scope for MVP).
- Authenticode still out of scope; updater signature does not remove SmartScreen warnings.

## Trade-offs

| Choice | Benefit | Cost |
|--------|---------|------|
| Lean-only updater | One channel, matches recommended install | Offline users lose bundled FFmpeg on update (runtime download remains) |
| No eager download | Saves bandwidth; predictable | Install wait after click |
| Session-only dismiss | Simple | Re-prompt next launch |

## Rollback

- Remove/replace `latest.json` on a bad release, or publish a fixed higher version.
- Clients already downloading a bad signed build: ship a newer good build; cannot un-sign.
- Feature flag: not planned; disable by not publishing newer `latest.json` / reverting endpoint only with a new app build.
