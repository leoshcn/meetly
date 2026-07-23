# Directory Structure

> How frontend code is organized in Meetly (Tauri + React + TypeScript).

---

## Overview

Meetly UI lives under `src/` (Vite + React). Feature folders own screens and feature-local components; shared UI and the typed IPC client stay outside features.

---

## Directory Layout

```
src/
├── app/                    # AppShell
├── pages/
│   ├── home/
│   └── settings/
├── features/
│   └── settings-hotwords/
├── shared/
│   ├── ui/
│   ├── hooks/
│   └── lib/
├── ipc/
│   ├── client.ts
│   ├── types.ts
│   └── commands/
├── styles/
└── main.tsx
```

Evidence: `src/app/AppShell.tsx`, `src/pages/settings/SettingsPage.tsx`, `src/features/settings-hotwords/SettingsHotwords.tsx`, `src/ipc/client.ts`.

---

## Module Organization

- **pages/** — composition only.
- **features/** — capability UI; do not import other features’ internals.
- **ipc/** — the only place that calls Tauri `invoke`.

---

## Naming Conventions

| Kind | Rule | Example |
|------|------|---------|
| Components | PascalCase | `HotwordList.tsx` |
| Hooks | `use` + camelCase | (add as needed) |
| IPC modules | domain noun | `ipc/commands/settings.ts` |

---

## Anti-Patterns

- Calling `invoke` outside `src/ipc/`.
- Flat `components/` dumping ground for screens.
