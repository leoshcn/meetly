use rusqlite::Connection;

use crate::error::{AppErrorDto, CmdResult};
use crate::models::{Settings, SettingsUpdate};

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
            Ok(Settings {
                hotwords,
                context_text,
            })
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(Settings::default()),
        Err(err) => Err(AppErrorDto::from(err)),
    }
}

pub fn update_settings(conn: &Connection, update: SettingsUpdate) -> CmdResult<Settings> {
    let mut current = get_settings(conn)?;

    if let Some(hotwords) = update.hotwords {
        validate_hotwords(&hotwords)?;
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

    Ok(current)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::pool::open_memory;

    #[test]
    fn empty_db_returns_defaults() {
        let conn = open_memory().expect("memory db");
        let settings = get_settings(&conn).expect("get");
        assert_eq!(settings.hotwords, Vec::<String>::new());
        assert_eq!(settings.context_text, "");
    }

    #[test]
    fn update_persists_hotwords_and_context() {
        let conn = open_memory().expect("memory db");
        let updated = update_settings(
            &conn,
            SettingsUpdate {
                hotwords: Some(vec!["Meetly".into(), "豆包".into()]),
                context_text: Some("周会摘要上下文".into()),
            },
        )
        .expect("update");

        assert_eq!(updated.hotwords, vec!["Meetly", "豆包"]);
        assert_eq!(updated.context_text, "周会摘要上下文");

        let loaded = get_settings(&conn).expect("reload");
        assert_eq!(loaded, updated);
    }

    #[test]
    fn empty_hotword_rejects_without_write() {
        let conn = open_memory().expect("memory db");
        update_settings(
            &conn,
            SettingsUpdate {
                hotwords: Some(vec!["ok".into()]),
                context_text: Some("keep".into()),
            },
        )
        .expect("seed");

        let err = update_settings(
            &conn,
            SettingsUpdate {
                hotwords: Some(vec!["ok".into(), "".into()]),
                context_text: Some("should-not-write".into()),
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
        let conn = open_memory().expect("memory db");
        update_settings(
            &conn,
            SettingsUpdate {
                hotwords: Some(vec!["Meetly".into()]),
                context_text: None,
            },
        )
        .expect("hotwords");

        let updated = update_settings(
            &conn,
            SettingsUpdate {
                hotwords: None,
                context_text: Some("only context".into()),
            },
        )
        .expect("context");

        assert_eq!(updated.hotwords, vec!["Meetly"]);
        assert_eq!(updated.context_text, "only context");
    }
}
