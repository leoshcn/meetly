use tauri::{AppHandle, State};

use crate::error::CmdResult;
use crate::models::Job;
use crate::services::transcription_service;
use crate::AppState;

/// `rename_all = "snake_case"` keeps IPC args aligned with api-shape.md / `src/ipc`.
#[tauri::command(rename_all = "snake_case")]
pub fn jobs_start_transcription(
    app: AppHandle,
    state: State<'_, AppState>,
    meeting_id: String,
) -> CmdResult<Job> {
    let job = {
        let conn = state
            .db
            .lock()
            .map_err(|_| crate::error::AppErrorDto::internal("Database lock poisoned"))?;
        transcription_service::start_transcription_job(&conn, &meeting_id)?
    };
    transcription_service::spawn_transcription_job(app, job.id.clone());
    Ok(job)
}

#[tauri::command(rename_all = "snake_case")]
pub fn jobs_get(state: State<'_, AppState>, job_id: String) -> CmdResult<Job> {
    let conn = state
        .db
        .lock()
        .map_err(|_| crate::error::AppErrorDto::internal("Database lock poisoned"))?;
    transcription_service::get_job(&conn, &job_id)
}
