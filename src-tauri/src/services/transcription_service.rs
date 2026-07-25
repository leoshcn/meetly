use std::fs;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use rusqlite::Connection;
use uuid::Uuid;

use crate::error::{AppErrorDto, CmdResult};
use crate::models::{
    Job, JOB_KIND_TRANSCRIPTION, JOB_STATUS_FAILED, JOB_STATUS_RUNNING, JOB_STATUS_SUCCEEDED,
};
use crate::providers::doubao::{
    audio_format_from_path, FlashRecognizeInput, FlashRecognizer, HttpFlashClient,
};
use crate::services::{credentials, meeting_service, settings_service};

pub fn get_job(conn: &Connection, job_id: &str) -> CmdResult<Job> {
    let mut stmt = conn
        .prepare(
            "SELECT id, meeting_id, kind, status, error_code, error_message, created_at, updated_at
             FROM jobs WHERE id = ?1",
        )
        .map_err(AppErrorDto::from)?;

    stmt.query_row(rusqlite::params![job_id], |row| {
        Ok(Job {
            id: row.get(0)?,
            meeting_id: row.get(1)?,
            kind: row.get(2)?,
            status: row.get(3)?,
            error_code: row.get(4)?,
            error_message: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })
    .map_err(|err| match err {
        rusqlite::Error::QueryReturnedNoRows => AppErrorDto::not_found("Job not found"),
        other => AppErrorDto::from(other),
    })
}

fn insert_job(conn: &Connection, job: &Job) -> CmdResult<()> {
    conn.execute(
        "INSERT INTO jobs
         (id, meeting_id, kind, status, provider_task_id, error_code, error_message, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, NULL, NULL, NULL, ?5, ?6)",
        rusqlite::params![
            job.id,
            job.meeting_id,
            job.kind,
            job.status,
            job.created_at,
            job.updated_at
        ],
    )
    .map_err(AppErrorDto::from)?;
    Ok(())
}

pub fn mark_job_succeeded(conn: &Connection, job_id: &str) -> CmdResult<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE jobs SET status = ?1, error_code = NULL, error_message = NULL, updated_at = ?2
         WHERE id = ?3",
        rusqlite::params![JOB_STATUS_SUCCEEDED, now, job_id],
    )
    .map_err(AppErrorDto::from)?;
    Ok(())
}

pub fn mark_job_failed(
    conn: &Connection,
    job_id: &str,
    code: &str,
    message: &str,
) -> CmdResult<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE jobs SET status = ?1, error_code = ?2, error_message = ?3, updated_at = ?4
         WHERE id = ?5",
        rusqlite::params![JOB_STATUS_FAILED, code, message, now, job_id],
    )
    .map_err(AppErrorDto::from)?;
    Ok(())
}

fn read_audio_base64(path: &str) -> CmdResult<String> {
    let meta = fs::metadata(path).map_err(|_| AppErrorDto::io_error("Cannot read audio file"))?;
    if meta.len() > meeting_service::MAX_AUDIO_BYTES {
        return Err(AppErrorDto::asr_payload_too_large(
            meeting_service::MAX_AUDIO_BYTES,
        ));
    }
    let bytes = fs::read(path).map_err(|_| AppErrorDto::io_error("Cannot read audio file"))?;
    // Never log the base64 payload.
    Ok(BASE64.encode(bytes))
}

/// Create a running job row. Caller schedules `execute_transcription_job`.
pub fn start_transcription_job(conn: &Connection, meeting_id: &str) -> CmdResult<Job> {
    let _creds = credentials::require_credentials()?;
    let meeting = meeting_service::get_meeting(conn, meeting_id)?;

    // Fail fast on size before enqueue.
    let meta = fs::metadata(&meeting.source_path)
        .map_err(|_| AppErrorDto::io_error("Cannot read audio file"))?;
    if meta.len() > meeting_service::MAX_AUDIO_BYTES {
        return Err(AppErrorDto::asr_payload_too_large(
            meeting_service::MAX_AUDIO_BYTES,
        ));
    }

    let now = Utc::now().to_rfc3339();
    let job = Job {
        id: Uuid::new_v4().to_string(),
        meeting_id: meeting.id,
        kind: JOB_KIND_TRANSCRIPTION.to_string(),
        status: JOB_STATUS_RUNNING.to_string(),
        error_code: None,
        error_message: None,
        created_at: now.clone(),
        updated_at: now,
    };
    insert_job(conn, &job)?;
    Ok(job)
}

struct JobWorkContext {
    meeting_id: String,
    source_path: String,
    hotwords: Vec<String>,
}

fn load_work_context(conn: &Connection, job_id: &str) -> CmdResult<JobWorkContext> {
    let job = get_job(conn, job_id)?;
    let meeting = meeting_service::get_meeting(conn, &job.meeting_id)?;
    let settings = settings_service::get_settings(conn)?;
    Ok(JobWorkContext {
        meeting_id: meeting.id,
        source_path: meeting.source_path,
        hotwords: settings.hotwords,
    })
}

/// Run flash recognize for an existing running job.
/// Does not hold a DB lock across the HTTP call when used via `spawn_transcription_job`.
#[cfg_attr(not(test), allow(dead_code))]
pub fn execute_transcription_job(
    conn: &Connection,
    job_id: &str,
    recognizer: &dyn FlashRecognizer,
) -> CmdResult<()> {
    let ctx = load_work_context(conn, job_id)?;
    let credentials = credentials::require_credentials()?;

    let result = (|| -> CmdResult<()> {
        let audio_base64 = read_audio_base64(&ctx.source_path)?;
        let format = audio_format_from_path(&ctx.source_path);
        let output = recognizer.recognize(
            &credentials,
            &FlashRecognizeInput {
                audio_base64,
                format,
                hotwords: ctx.hotwords.clone(),
            },
        )?;
        meeting_service::upsert_transcript(
            conn,
            &ctx.meeting_id,
            &output.text,
            Some(&output.raw_json),
        )?;
        mark_job_succeeded(conn, job_id)?;
        Ok(())
    })();

    if let Err(err) = result {
        let _ = mark_job_failed(conn, job_id, &err.code, &err.message);
        return Err(err);
    }
    Ok(())
}

/// Spawn background work using the real HTTP client.
/// Releases the DB mutex while waiting on the provider HTTP call.
pub fn spawn_transcription_job(app: tauri::AppHandle, job_id: String) {
    std::thread::spawn(move || {
        use tauri::Manager;

        let Some(state) = app.try_state::<crate::AppState>() else {
            return;
        };
        let Ok(recognizer) = HttpFlashClient::new() else {
            return;
        };

        let ctx = {
            let Ok(conn) = state.db.lock() else {
                return;
            };
            match load_work_context(&conn, &job_id) {
                Ok(ctx) => ctx,
                Err(err) => {
                    let _ = mark_job_failed(&conn, &job_id, &err.code, &err.message);
                    return;
                }
            }
        };

        let credentials = match credentials::require_credentials() {
            Ok(c) => c,
            Err(err) => {
                if let Ok(conn) = state.db.lock() {
                    let _ = mark_job_failed(&conn, &job_id, &err.code, &err.message);
                }
                return;
            }
        };

        let recognize_result = (|| -> CmdResult<(String, String)> {
            let audio_base64 = read_audio_base64(&ctx.source_path)?;
            let format = audio_format_from_path(&ctx.source_path);
            let output = recognizer.recognize(
                &credentials,
                &FlashRecognizeInput {
                    audio_base64,
                    format,
                    hotwords: ctx.hotwords,
                },
            )?;
            Ok((output.text, output.raw_json))
        })();

        let Ok(conn) = state.db.lock() else {
            return;
        };
        match recognize_result {
            Ok((text, raw_json)) => {
                if let Err(err) =
                    meeting_service::upsert_transcript(&conn, &ctx.meeting_id, &text, Some(&raw_json))
                {
                    let _ = mark_job_failed(&conn, &job_id, &err.code, &err.message);
                    return;
                }
                let _ = mark_job_succeeded(&conn, &job_id);
            }
            Err(err) => {
                let _ = mark_job_failed(&conn, &job_id, &err.code, &err.message);
            }
        }
    });
}

/// Test helper: start + execute with a stub recognizer (no threads).
#[cfg(test)]
pub fn run_transcription_with_recognizer(
    conn: &Connection,
    meeting_id: &str,
    recognizer: std::sync::Arc<dyn FlashRecognizer>,
) -> CmdResult<Job> {
    let job = start_transcription_job(conn, meeting_id)?;
    execute_transcription_job(conn, &job.id, recognizer.as_ref())?;
    get_job(conn, &job.id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::pool::open_memory;
    use crate::providers::doubao::FlashRecognizeOutput;
    use crate::services::credentials::{reset_for_test, set_credentials};
    use crate::services::meeting_service::create_from_file;
    use std::io::Write;
    use std::sync::{Arc, Mutex};

    struct StubRecognizer {
        result: Mutex<Result<FlashRecognizeOutput, AppErrorDto>>,
    }

    impl FlashRecognizer for StubRecognizer {
        fn recognize(
            &self,
            _credentials: &credentials::DoubaoCredentials,
            input: &FlashRecognizeInput,
        ) -> CmdResult<FlashRecognizeOutput> {
            assert!(!input.audio_base64.is_empty());
            let body = crate::providers::doubao::build_flash_body(input);
            assert!(!body.to_string().contains("context_text"));
            match &*self.result.lock().unwrap() {
                Ok(out) => Ok(out.clone()),
                Err(err) => Err(err.clone()),
            }
        }
    }

    fn temp_audio() -> (std::path::PathBuf, String) {
        let path = std::env::temp_dir().join(format!("meetly-asr-{}.wav", Uuid::new_v4()));
        let mut f = fs::File::create(&path).expect("create");
        f.write_all(b"fake-audio").expect("write");
        let s = path.to_str().unwrap().to_string();
        (path, s)
    }

    #[test]
    fn job_transitions_succeeded_with_stub() {
        reset_for_test();
        set_credentials("app", "token").unwrap();
        let conn = open_memory().unwrap();
        let (path, path_str) = temp_audio();
        let meeting = create_from_file(&conn, &path_str).unwrap();

        let stub = Arc::new(StubRecognizer {
            result: Mutex::new(Ok(FlashRecognizeOutput {
                text: "hello meeting".into(),
                raw_json: r#"{"result":{"text":"hello meeting"}}"#.into(),
            })),
        });

        let job = run_transcription_with_recognizer(&conn, &meeting.id, stub).unwrap();
        assert_eq!(job.status, JOB_STATUS_SUCCEEDED);
        let transcript = meeting_service::get_transcript(&conn, &meeting.id).unwrap();
        assert_eq!(transcript.text, "hello meeting");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn job_transitions_failed_on_provider_error() {
        reset_for_test();
        set_credentials("app", "token").unwrap();
        let conn = open_memory().unwrap();
        let (path, path_str) = temp_audio();
        let meeting = create_from_file(&conn, &path_str).unwrap();

        let stub = Arc::new(StubRecognizer {
            result: Mutex::new(Err(AppErrorDto::asr_provider_error("boom"))),
        });

        let err = run_transcription_with_recognizer(&conn, &meeting.id, stub).expect_err("fail");
        assert_eq!(err.code, "ASR_PROVIDER_ERROR");

        let jobs: Vec<String> = {
            let mut stmt = conn
                .prepare("SELECT status, error_code FROM jobs WHERE meeting_id = ?1")
                .unwrap();
            let rows = stmt
                .query_map(rusqlite::params![meeting.id], |row| {
                    let status: String = row.get(0)?;
                    let code: String = row.get(1)?;
                    Ok(format!("{status}:{code}"))
                })
                .unwrap();
            rows.map(|r| r.unwrap()).collect()
        };
        assert_eq!(jobs, vec!["failed:ASR_PROVIDER_ERROR".to_string()]);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn start_without_credentials_errors() {
        reset_for_test();
        let conn = open_memory().unwrap();
        let (path, path_str) = temp_audio();
        let meeting = create_from_file(&conn, &path_str).unwrap();
        let err = start_transcription_job(&conn, &meeting.id).expect_err("no creds");
        assert_eq!(err.code, "ASR_NOT_CONFIGURED");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn start_rejects_oversized_audio() {
        reset_for_test();
        set_credentials("app", "token").unwrap();
        let conn = open_memory().unwrap();
        let path = std::env::temp_dir().join(format!("meetly-oversize-{}.wav", Uuid::new_v4()));
        {
            let f = fs::File::create(&path).expect("create");
            f.set_len(meeting_service::MAX_AUDIO_BYTES + 1)
                .expect("size");
        }
        // Bypass create_from_file size check to exercise job-start guard.
        let meeting_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO meetings (id, source_path, title, created_at) VALUES (?1, ?2, NULL, ?3)",
            rusqlite::params![
                meeting_id,
                path.to_str().unwrap(),
                Utc::now().to_rfc3339()
            ],
        )
        .unwrap();
        let err = start_transcription_job(&conn, &meeting_id).expect_err("too big");
        assert_eq!(err.code, "ASR_PAYLOAD_TOO_LARGE");
        let _ = fs::remove_file(path);
    }
}
