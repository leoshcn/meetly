use std::fs;
use std::path::Path;

use chrono::Utc;
use rusqlite::Connection;
use uuid::Uuid;

use crate::error::{AppErrorDto, CmdResult};
use crate::models::{Meeting, Transcript};

/// Flash/base64 ASR path cap (20 MiB). Files at or below this size do not need TOS.
pub const FLASH_MAX_AUDIO_BYTES: u64 = 20 * 1024 * 1024;

/// Hard reject cap for import / async path (512 MiB).
pub const ASYNC_MAX_AUDIO_BYTES: u64 = 512 * 1024 * 1024;

pub fn create_from_file(conn: &Connection, path: &str) -> CmdResult<Meeting> {
    let path = path.trim();
    if path.is_empty() {
        return Err(AppErrorDto::io_error("Audio path is empty"));
    }

    let file_path = Path::new(path);
    let meta = fs::metadata(file_path).map_err(|_| {
        AppErrorDto::io_error("Cannot read audio file")
    })?;
    if !meta.is_file() {
        return Err(AppErrorDto::io_error("Path is not a file"));
    }
    if meta.len() > ASYNC_MAX_AUDIO_BYTES {
        return Err(AppErrorDto::asr_payload_too_large(ASYNC_MAX_AUDIO_BYTES));
    }

    let title = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string());

    let meeting = Meeting {
        id: Uuid::new_v4().to_string(),
        source_path: path.to_string(),
        title,
        created_at: Utc::now().to_rfc3339(),
    };

    conn.execute(
        "INSERT INTO meetings (id, source_path, title, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![
            meeting.id,
            meeting.source_path,
            meeting.title,
            meeting.created_at
        ],
    )
    .map_err(AppErrorDto::from)?;

    Ok(meeting)
}

pub fn get_meeting(conn: &Connection, meeting_id: &str) -> CmdResult<Meeting> {
    let mut stmt = conn
        .prepare(
            "SELECT id, source_path, title, created_at FROM meetings WHERE id = ?1",
        )
        .map_err(AppErrorDto::from)?;

    stmt.query_row(rusqlite::params![meeting_id], |row| {
        Ok(Meeting {
            id: row.get(0)?,
            source_path: row.get(1)?,
            title: row.get(2)?,
            created_at: row.get(3)?,
        })
    })
    .map_err(|err| match err {
        rusqlite::Error::QueryReturnedNoRows => {
            AppErrorDto::not_found("Meeting not found")
        }
        other => AppErrorDto::from(other),
    })
}

pub fn get_transcript(conn: &Connection, meeting_id: &str) -> CmdResult<Transcript> {
    // Ensure meeting exists.
    let _ = get_meeting(conn, meeting_id)?;

    let mut stmt = conn
        .prepare("SELECT meeting_id, text FROM transcripts WHERE meeting_id = ?1")
        .map_err(AppErrorDto::from)?;

    stmt.query_row(rusqlite::params![meeting_id], |row| {
        Ok(Transcript {
            meeting_id: row.get(0)?,
            text: row.get(1)?,
        })
    })
    .map_err(|err| match err {
        rusqlite::Error::QueryReturnedNoRows => {
            AppErrorDto::not_found("Transcript not found")
        }
        other => AppErrorDto::from(other),
    })
}

pub fn upsert_transcript(
    conn: &Connection,
    meeting_id: &str,
    text: &str,
    raw_json: Option<&str>,
) -> CmdResult<()> {
    conn.execute(
        "INSERT INTO transcripts (meeting_id, text, raw_json) VALUES (?1, ?2, ?3)
         ON CONFLICT(meeting_id) DO UPDATE SET
           text = excluded.text,
           raw_json = excluded.raw_json",
        rusqlite::params![meeting_id, text, raw_json],
    )
    .map_err(AppErrorDto::from)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::pool::open_memory;
    use std::io::Write;

    #[test]
    fn create_and_get_meeting() {
        let conn = open_memory().expect("db");
        let dir = std::env::temp_dir();
        let path = dir.join(format!("meetly-test-{}.wav", Uuid::new_v4()));
        {
            let mut f = fs::File::create(&path).expect("create");
            f.write_all(b"RIFF").expect("write");
        }
        let meeting = create_from_file(&conn, path.to_str().unwrap()).expect("create");
        let loaded = get_meeting(&conn, &meeting.id).expect("get");
        assert_eq!(loaded.id, meeting.id);
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn rejects_oversized_file() {
        let conn = open_memory().expect("db");
        let dir = std::env::temp_dir();
        let path = dir.join(format!("meetly-big-{}.wav", Uuid::new_v4()));
        {
            let f = fs::File::create(&path).expect("create");
            f.set_len(ASYNC_MAX_AUDIO_BYTES + 1).expect("size");
        }
        let err = create_from_file(&conn, path.to_str().unwrap()).expect_err("too big");
        assert_eq!(err.code, "ASR_PAYLOAD_TOO_LARGE");
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn accepts_file_between_flash_and_async_cap() {
        let conn = open_memory().expect("db");
        let dir = std::env::temp_dir();
        let path = dir.join(format!("meetly-mid-{}.wav", Uuid::new_v4()));
        {
            let f = fs::File::create(&path).expect("create");
            f.set_len(FLASH_MAX_AUDIO_BYTES + 1).expect("size");
        }
        let meeting = create_from_file(&conn, path.to_str().unwrap()).expect("create");
        assert!(!meeting.id.is_empty());
        let _ = fs::remove_file(&path);
    }
}
