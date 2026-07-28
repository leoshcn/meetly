# Implement: Meetly 深色显示模式

## Checklist

1. **Backend schema + model**
   - Add idempotent `theme_preference` column (default `system`).
   - Extend `Settings` / `SettingsUpdate`, load/save/validate in `settings_service`.
   - Unit tests: default, update round-trip, reject invalid value.

2. **Frontend IPC types**
   - Mirror field on `Settings` / `SettingsUpdate`; adjust `settings.test.ts` fixtures.

3. **Theme runtime**
   - `ThemeProvider` (or equivalent under `src/app` / `shared`) loads preference, resolves appearance, sets `data-theme` + `color-scheme`, listens to `prefers-color-scheme` when system.
   - Wire into app root (`main.tsx` / `AppShell`).
   - Optional: non-authoritative first-paint cache to reduce flash.

4. **Dark tokens**
   - Author `[data-theme="dark"]` token set in `global.css` preserving brand (teal accent family on dark paper).
   - Tune `--accent-soft`, borders, muted ink for AA.

5. **Settings「外观」Tab**
   - `settings-appearance` feature + SettingsPage tab wiring.
   - Persist on change; error handling; Chinese labels/hints.

6. **Hardcoded adapters**
   - Theme-aware `RecordingWaveform` canvas colors.
   - Dark-safe `SPEAKER_COLORS` (or CSS-var palette).

7. **Contrast pass (D5)**
   - Walk R6 surface/state checklist in both themes; fix failures (tokens or local CSS).
   - Document any intentional exception in task notes if truly impossible (prefer fix).

8. **Validation**
   - `npm run typecheck`
   - `npm test` (and targeted Rust tests for settings)
   - Manual: system follow, force light/dark, restart persistence, waveform + speakers in dark

## Validation commands

```bash
npm run typecheck
npm test
cd src-tauri && cargo test settings
```

## Risky files

- `src/styles/global.css` — token source of truth
- `src-tauri/src/services/settings_service.rs` — persistence
- `src-tauri/src/db/pool.rs` — migration
- `src/features/meeting-recording/RecordingWaveform.tsx` — canvas colors
- `src/features/transcription-import/TranscriptionImport.tsx` — speaker colors
- `src/pages/settings/SettingsPage.tsx` — tab IA

## Rollback

- Revert frontend theme + tab; leave DB column (harmless default) or ignore field.
