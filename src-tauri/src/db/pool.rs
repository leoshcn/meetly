use std::path::Path;

use rusqlite::Connection;

use crate::error::{AppErrorDto, CmdResult};

const MIGRATION_001: &str = include_str!("migrations/001_settings.sql");
const MIGRATION_002: &str = include_str!("migrations/002_meetings_jobs.sql");
const MIGRATION_003: &str = include_str!("migrations/003_summaries.sql");

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
    Ok(())
}
