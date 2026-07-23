mod commands;
mod db;
mod error;
mod models;
mod services;

use std::sync::Mutex;

use rusqlite::Connection;
use tauri::Manager;

pub use error::{AppErrorDto, CmdResult};

pub struct AppState {
    pub db: Mutex<Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
            std::fs::create_dir_all(&data_dir)
                .map_err(|e| format!("Failed to create app data dir: {e}"))?;
            let db_path = data_dir.join("meetly.db");
            let conn = db::open_connection(&db_path)
                .map_err(|e| format!("Failed to open database: {}", e.message))?;
            app.manage(AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::health::app_health,
            commands::settings::settings_get,
            commands::settings::settings_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
