# Design: Meetly 深色显示模式

## Architecture

```
Settings (SQLite theme_preference)
        │
        ▼
settings_get / settings_update (IPC)
        │
        ▼
ThemeProvider (app root)
  - preference: system | light | dark
  - resolved: light | dark  ← preference + matchMedia
        │
        ▼
document.documentElement[data-theme=light|dark]
        │
        ▼
global.css tokens (:root + [data-theme="dark"]) → CSS Modules
        │
        ├── RecordingWaveform reads resolved theme / CSS vars for canvas
        └── SPEAKER_COLORS (or CSS-var-based palette) for dark AA
```

## Data & contracts

| Layer | Change |
|-------|--------|
| SQLite | `settings.theme_preference TEXT NOT NULL DEFAULT 'system'` via idempotent `ensure_theme_preference_column` |
| Rust `Settings` | `theme_preference: String` (or enum serialized as string) |
| Rust `SettingsUpdate` | `theme_preference: Option<String>` |
| Validation | only `system` \| `light` \| `dark`; invalid → error, no partial write of bad value |
| TS `Settings` / `SettingsUpdate` | same field; narrow union type preferred on TS side |

## Theme application

- Attribute strategy: `data-theme="light" | "dark"` on `<html>` (resolved appearance, not raw preference).
- Light tokens remain on `:root` (current values).
- Dark tokens under `:root[data-theme="dark"]` (or `html[data-theme="dark"]`).
- Set `color-scheme: light | dark` on root to help native form controls / scrollbars.
- `ThemeProvider` owns: load preference, subscribe to system changes when `system`, expose `setPreference` that calls `settings_update` then updates local state.

## Settings UI

- New tab id `appearance` / label「外观」in `SettingsPage`.
- New feature folder `src/features/settings-appearance/` with panel: three-option control + short hint.
- Default settings tab remains「凭证」(unchanged).

## Hardcoded color adapters (D5)

1. **RecordingWaveform** — replace light-locked RGBA with theme-aware colors (read computed CSS variables or branch on resolved theme). Verify grid, bars, live tip against AA on dark paper.
2. **SPEAKER_COLORS** — provide dark-safe palette (or derive from CSS custom properties) so chips/rails meet ≥ 3:1 vs adjacent backgrounds and remain mutually distinguishable.

## Contrast acceptance (D5)

- Standard: WCAG 2.2 AA.
- Method: manual check with contrast tool against resolved computed colors for each surface in PRD R6; fix tokens or local overrides until pass.
- Disabled controls may use reduced contrast only where AA allows non-text / disabled exceptions; text that remains informational must still meet AA or be marked decorative.

## Compatibility / migration

- Existing installs: new column default `system` → no behavior change until user picks otherwise (system follows OS).
- No keyring involvement.
- Rollback: revert column unused; UI ignores unknown → treat as system if we keep defensive parse.

## Trade-offs

| Choice | Why |
|--------|-----|
| Persist in Settings not localStorage | Matches D3; one settings continuum |
| `data-theme` resolved not preference | CSS stays simple; JS owns system bridging |
| Feature folder for appearance | Matches frontend directory spec |
| WebView-only title bar | Out of scope native chrome for MVP |
| Optional first-paint cache | Settings remains source of truth |
