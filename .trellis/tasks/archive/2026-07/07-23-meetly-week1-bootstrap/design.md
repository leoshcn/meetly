# Design: Meetly week-1 Trellis bootstrap

## Architecture Boundaries

```
UI (src/) --invoke--> Tauri commands (src-tauri/) --> SQLite
                                              \--> Doubao (later)
```

- Hotwords → ASR only; `context_text` → summary only.
- Specs refreshed with real paths after scaffold.

## Incident note

Scaffolding wiped Trellis metadata once; prefer generating Tauri app into the existing repo without deleting `.trellis` / `.git` / `.cursor`.
