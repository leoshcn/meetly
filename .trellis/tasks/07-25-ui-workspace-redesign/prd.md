# PRD: Meetly workspace UI redesign

## Goal

Restructure Meetly’s desktop UI for commercial and designer users: modern, calm, efficient, with a clear urge to import audio and leave with a summary.

## Scope

- Design tokens, Syne + IBM Plex Sans typography
- Compact toolbar (brand + settings gear + transcription progress)
- Empty-state import stage vs split transcript | summary workspace
- Speaker color-rail transcript; compact speaker naming
- Shared `Button` / `IconButton`; settings visual alignment
- No IPC / backend contract changes

## Acceptance

- Cold start: sidebar + dominant import CTA; no duplicate title wall
- Selected meeting: split panes; generate/copy summary still works
- Progress bar while transcribing; settings only from toolbar
- `prefers-reduced-motion` / `:focus-visible`; narrow stack under 960px
- `npm run typecheck` and `npm test` pass
