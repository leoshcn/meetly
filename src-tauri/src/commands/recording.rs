use tauri::{AppHandle, State};

use crate::error::{AppErrorDto, CmdResult};
use crate::services::ffmpeg_service::{self, FfmpegStatus};
use crate::services::recording_service::{
    self, DevicesResponse, RecordStartResponse, RecordStatusResponse, RecordStopResponse,
};
use crate::AppState;

#[tauri::command(rename_all = "snake_case")]
pub fn record_list_input_devices() -> CmdResult<DevicesResponse> {
    recording_service::list_input_devices()
}

#[tauri::command(rename_all = "snake_case")]
pub fn record_start(
    state: State<'_, AppState>,
    device_id: Option<String>,
) -> CmdResult<RecordStartResponse> {
    let recording_dir = {
        let conn = state
            .db
            .lock()
            .map_err(|_| AppErrorDto::internal("Database lock poisoned"))?;
        let settings = crate::services::get_settings(&conn)?;
        settings.recording_dir
    };

    state.recording.start(&recording_dir, device_id.as_deref())
}

#[tauri::command(rename_all = "snake_case")]
pub fn record_stop(state: State<'_, AppState>) -> CmdResult<RecordStopResponse> {
    state.recording.stop()
}

#[tauri::command(rename_all = "snake_case")]
pub fn record_status(state: State<'_, AppState>) -> CmdResult<RecordStatusResponse> {
    state.recording.status()
}

#[tauri::command(rename_all = "snake_case")]
pub fn ffmpeg_status() -> CmdResult<FfmpegStatus> {
    Ok(ffmpeg_service::status())
}

#[tauri::command(rename_all = "snake_case")]
pub fn ffmpeg_download(app: AppHandle) -> CmdResult<FfmpegStatus> {
    ffmpeg_service::start_download(Some(app))
}
