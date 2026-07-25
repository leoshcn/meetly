use rusqlite::Connection;

use crate::error::{AppErrorDto, CmdResult};
use crate::models::{Settings, SettingsUpdate};
use crate::services::credentials;

/// Max length of a single hotword (characters).
pub const MAX_HOTWORD_LEN: usize = 100;

/// Validate hotwords without writing. Empty / whitespace-only / too-long → SETTINGS_INVALID.
pub fn validate_hotwords(hotwords: &[String]) -> CmdResult<()> {
    for (index, word) in hotwords.iter().enumerate() {
        let trimmed = word.trim();
        if trimmed.is_empty() {
            return Err(AppErrorDto::with_details(
                "SETTINGS_INVALID",
                "Hotwords cannot be empty",
                serde_json::json!({ "field": "hotwords", "index": index }),
            ));
        }
        if trimmed.chars().count() > MAX_HOTWORD_LEN {
            return Err(AppErrorDto::with_details(
                "SETTINGS_INVALID",
                format!("Hotword exceeds {MAX_HOTWORD_LEN} characters"),
                serde_json::json!({ "field": "hotwords", "index": index }),
            ));
        }
    }
    Ok(())
}

fn with_configured(mut settings: Settings) -> Settings {
    settings.doubao_configured = credentials::is_configured();
    settings.dashscope_configured = credentials::is_dashscope_configured();
    settings
}

pub fn get_settings(conn: &Connection) -> CmdResult<Settings> {
    let mut stmt = conn
        .prepare("SELECT hotwords, context_text FROM settings WHERE id = 1")
        .map_err(AppErrorDto::from)?;

    let row = stmt.query_row([], |row| {
        let hotwords_json: String = row.get(0)?;
        let context_text: String = row.get(1)?;
        Ok((hotwords_json, context_text))
    });

    match row {
        Ok((hotwords_json, context_text)) => {
            let hotwords: Vec<String> =
                serde_json::from_str(&hotwords_json).map_err(AppErrorDto::from)?;
            Ok(with_configured(Settings {
                hotwords,
                context_text,
                doubao_configured: false,
                dashscope_configured: false,
            }))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(with_configured(Settings::default())),
        Err(err) => Err(AppErrorDto::from(err)),
    }
}

fn apply_credential_update(update: &SettingsUpdate) -> CmdResult<()> {
    let has_app = update
        .doubao_app_id
        .as_ref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);
    let has_token = update
        .doubao_access_token
        .as_ref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    if has_app || has_token {
        if !(has_app && has_token) {
            return Err(AppErrorDto::settings_invalid(
                "Doubao app id and access token must both be provided together",
            ));
        }
        credentials::set_credentials(
            update.doubao_app_id.as_ref().unwrap(),
            update.doubao_access_token.as_ref().unwrap(),
        )?;
    }

    if let Some(ref key) = update.dashscope_api_key {
        let trimmed = key.trim();
        if !trimmed.is_empty() {
            credentials::set_dashscope_credentials(trimmed)?;
        }
    }

    Ok(())
}

pub fn update_settings(conn: &Connection, update: SettingsUpdate) -> CmdResult<Settings> {
    // Validate SQLite fields before touching the keyring so a bad payload
    // cannot partially apply credentials.
    if let Some(ref hotwords) = update.hotwords {
        validate_hotwords(hotwords)?;
    }
    apply_credential_update(&update)?;

    let mut current = get_settings(conn)?;

    if let Some(hotwords) = update.hotwords {
        // Persist trimmed forms so empty-looking values never sneak in.
        current.hotwords = hotwords
            .into_iter()
            .map(|w| w.trim().to_string())
            .collect();
    }

    if let Some(context_text) = update.context_text {
        current.context_text = context_text;
    }

    let hotwords_json = serde_json::to_string(&current.hotwords).map_err(AppErrorDto::from)?;

    conn.execute(
        "INSERT INTO settings (id, hotwords, context_text) VALUES (1, ?1, ?2)
         ON CONFLICT(id) DO UPDATE SET
           hotwords = excluded.hotwords,
           context_text = excluded.context_text",
        rusqlite::params![hotwords_json, current.context_text],
    )
    .map_err(AppErrorDto::from)?;

    Ok(with_configured(Settings {
        hotwords: current.hotwords,
        context_text: current.context_text,
        doubao_configured: false,
        dashscope_configured: false,
    }))
}

pub fn clear_doubao_credentials(conn: &Connection) -> CmdResult<Settings> {
    credentials::clear_credentials()?;
    get_settings(conn)
}

pub fn clear_dashscope_credentials(conn: &Connection) -> CmdResult<Settings> {
    credentials::clear_dashscope_credentials()?;
    get_settings(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::pool::open_memory;
    use crate::services::credentials::reset_for_test;

    #[test]
    fn empty_db_returns_defaults() {
        reset_for_test();
        let conn = open_memory().expect("memory db");
        let settings = get_settings(&conn).expect("get");
        assert_eq!(settings.hotwords, Vec::<String>::new());
        assert_eq!(settings.context_text, "");
        assert!(!settings.doubao_configured);
        assert!(!settings.dashscope_configured);
    }

    #[test]
    fn update_persists_hotwords_and_context() {
        reset_for_test();
        let conn = open_memory().expect("memory db");
        let updated = update_settings(
            &conn,
            SettingsUpdate {
                hotwords: Some(vec!["Meetly".into(), "豆包".into()]),
                context_text: Some("周会摘要上下文".into()),
                ..Default::default()
            },
        )
        .expect("update");

        assert_eq!(updated.hotwords, vec!["Meetly", "豆包"]);
        assert_eq!(updated.context_text, "周会摘要上下文");
        assert!(!updated.doubao_configured);

        let loaded = get_settings(&conn).expect("reload");
        assert_eq!(loaded.hotwords, updated.hotwords);
        assert_eq!(loaded.context_text, updated.context_text);
    }

    #[test]
    fn empty_hotword_rejects_without_write() {
        reset_for_test();
        let conn = open_memory().expect("memory db");
        update_settings(
            &conn,
            SettingsUpdate {
                hotwords: Some(vec!["ok".into()]),
                context_text: Some("keep".into()),
                ..Default::default()
            },
        )
        .expect("seed");

        let err = update_settings(
            &conn,
            SettingsUpdate {
                hotwords: Some(vec!["ok".into(), "".into()]),
                context_text: Some("should-not-write".into()),
                ..Default::default()
            },
        )
        .expect_err("empty hotword");

        assert_eq!(err.code, "SETTINGS_INVALID");

        let loaded = get_settings(&conn).expect("reload");
        assert_eq!(loaded.hotwords, vec!["ok"]);
        assert_eq!(loaded.context_text, "keep");
    }

    #[test]
    fn whitespace_hotword_rejects_without_write() {
        let err = validate_hotwords(&[String::from("   ")]).expect_err("whitespace");
        assert_eq!(err.code, "SETTINGS_INVALID");
    }

    #[test]
    fn too_long_hotword_rejects() {
        let long = "a".repeat(MAX_HOTWORD_LEN + 1);
        let err = validate_hotwords(&[long]).expect_err("too long");
        assert_eq!(err.code, "SETTINGS_INVALID");
    }

    #[test]
    fn partial_update_context_only() {
        reset_for_test();
        let conn = open_memory().expect("memory db");
        update_settings(
            &conn,
            SettingsUpdate {
                hotwords: Some(vec!["Meetly".into()]),
                context_text: None,
                ..Default::default()
            },
        )
        .expect("hotwords");

        let updated = update_settings(
            &conn,
            SettingsUpdate {
                hotwords: None,
                context_text: Some("only context".into()),
                ..Default::default()
            },
        )
        .expect("context");

        assert_eq!(updated.hotwords, vec!["Meetly"]);
        assert_eq!(updated.context_text, "only context");
    }

    #[test]
    fn credentials_set_flip_configured_without_leaking_secrets() {
        reset_for_test();
        let conn = open_memory().expect("memory db");
        let updated = update_settings(
            &conn,
            SettingsUpdate {
                doubao_app_id: Some("app-id".into()),
                doubao_access_token: Some("secret-token".into()),
                ..Default::default()
            },
        )
        .expect("creds");

        assert!(updated.doubao_configured);
        let json = serde_json::to_string(&updated).expect("ser");
        assert!(!json.contains("secret-token"));
        assert!(!json.contains("app-id"));
        assert!(json.contains("doubao_configured"));

        let cleared = clear_doubao_credentials(&conn).expect("clear");
        assert!(!cleared.doubao_configured);
    }

    #[test]
    fn dashscope_configured_flag_without_leaking_key() {
        reset_for_test();
        let conn = open_memory().expect("memory db");
        let updated = update_settings(
            &conn,
            SettingsUpdate {
                dashscope_api_key: Some("sk-dash-secret".into()),
                ..Default::default()
            },
        )
        .expect("creds");

        assert!(updated.dashscope_configured);
        let json = serde_json::to_string(&updated).expect("ser");
        assert!(!json.contains("sk-dash-secret"));
        assert!(json.contains("dashscope_configured"));

        let cleared = clear_dashscope_credentials(&conn).expect("clear");
        assert!(!cleared.dashscope_configured);
    }
}
