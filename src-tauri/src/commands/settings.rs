use tauri::State;

use crate::error::CmdResult;
use crate::models::{Settings, SettingsUpdate};
use crate::services;
use crate::AppState;

#[tauri::command]
pub fn settings_get(state: State<'_, AppState>) -> CmdResult<Settings> {
    let conn = state
        .db
        .lock()
        .map_err(|_| crate::error::AppErrorDto::internal("Database lock poisoned"))?;
    services::get_settings(&conn)
}

#[tauri::command]
pub fn settings_update(
    state: State<'_, AppState>,
    update: SettingsUpdate,
) -> CmdResult<Settings> {
    let conn = state
        .db
        .lock()
        .map_err(|_| crate::error::AppErrorDto::internal("Database lock poisoned"))?;
    services::update_settings(&conn, update)
}
