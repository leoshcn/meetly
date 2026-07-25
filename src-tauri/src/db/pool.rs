use std::path::Path;

use rusqlite::Connection;

use crate::error::{AppErrorDto, CmdResult};

const MIGRATION_001: &str = include_str!("migrations/001_settings.sql");
const MIGRATION_002: &str = include_str!("migrations/002_meetings_jobs.sql");
const MIGRATION_003: &str = include_str!("migrations/003_summaries.sql");
const _MIGRATION_004: &str = include_str!("migrations/004_tos_settings.sql");

pub fn open_connection(path: &Path) -> CmdResult<Connection> {
    let conn = Connection::open(path).map_err(AppErrorDto::from)?;
    migrate(&conn)?;
    Ok(conn)
}

#[cfg(test)]
pub fn open_memory() -> CmdResult<Connection> {
    let conn = Connection::open_in_memory().map_err(AppErrorDto::from)?;
    migrate(&conn)?;
    Ok(conn)
}

pub fn migrate(conn: &Connection) -> CmdResult<()> {
    conn.execute_batch(MIGRATION_001)
        .map_err(AppErrorDto::from)?;
    conn.execute_batch(MIGRATION_002)
        .map_err(AppErrorDto::from)?;
    conn.execute_batch(MIGRATION_003)
        .map_err(AppErrorDto::from)?;
    ensure_tos_settings_columns(conn)?;
    Ok(())
}

/// Idempotent TOS column adds — `ALTER TABLE ADD COLUMN` is not safe to re-run.
fn ensure_tos_settings_columns(conn: &Connection) -> CmdResult<()> {
    let mut stmt = conn
        .prepare("PRAGMA table_info(settings)")
        .map_err(AppErrorDto::from)?;
    let cols: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(AppErrorDto::from)?
        .filter_map(|r| r.ok())
        .collect();

    let needed = ["tos_region", "tos_bucket", "tos_endpoint"];
    for col in needed {
        if !cols.iter().any(|c| c == col) {
            conn.execute(
                &format!(
                    "ALTER TABLE settings ADD COLUMN {col} TEXT NOT NULL DEFAULT ''"
                ),
                [],
            )
            .map_err(AppErrorDto::from)?;
        }
    }
    Ok(())
}
