# Database Guidelines

## Settings table

Migration: `src-tauri/src/db/migrations/001_settings.sql`

- Singleton row `id = 1`
- `hotwords` TEXT NOT NULL DEFAULT `'[]'` (JSON string array)
- `context_text` TEXT NOT NULL DEFAULT `''`

Access via `src-tauri/src/services/settings_service.rs` and `db/pool.rs`.
