//! Credential connectivity probes — merge form overrides with keyring/SQLite, never persist.

use rusqlite::Connection;
use serde::Serialize;

use crate::error::{AppErrorDto, CmdResult};
use crate::providers::doubao::flash_client::HttpFlashClient;
use crate::providers::qwen::client::HttpQwenClient;
use crate::providers::tos::{HttpTosClient, TosConfig};
use crate::services::credentials::{
    self, DashScopeCredentials, DoubaoCredentials, TosCredentials,
};
use crate::services::settings_service;

/// IPC success payload for `settings_test_*`.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SettingsTestResult {
    pub ok: bool,
}

impl SettingsTestResult {
    pub fn ok() -> Self {
        Self { ok: true }
    }
}

/// Pick override when non-empty after trim; otherwise use saved.
pub fn merge_secret_field(override_val: Option<&str>, saved: Option<&str>) -> Option<String> {
    if let Some(raw) = override_val {
        let trimmed = raw.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }
    saved
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
}

/// Merge Doubao overrides with keyring. Does not write.
pub fn merge_doubao_credentials(
    doubao_app_id: Option<&str>,
    doubao_access_token: Option<&str>,
) -> CmdResult<DoubaoCredentials> {
    let saved = credentials::get_credentials()?;
    let app_id = merge_secret_field(
        doubao_app_id,
        saved.as_ref().map(|c| c.app_id.as_str()),
    );
    let access_token = merge_secret_field(
        doubao_access_token,
        saved.as_ref().map(|c| c.access_token.as_str()),
    );

    match (app_id, access_token) {
        (Some(app_id), Some(access_token)) => Ok(DoubaoCredentials {
            app_id,
            access_token,
        }),
        (None, None) => Err(AppErrorDto::asr_not_configured()),
        _ => Err(AppErrorDto::settings_invalid(
            "测试豆包连接需要同时提供 App Id 与 Access Token（或使用已保存的凭证）",
        )),
    }
}

/// Merge DashScope override with keyring. Does not write.
pub fn merge_dashscope_credentials(
    dashscope_api_key: Option<&str>,
) -> CmdResult<DashScopeCredentials> {
    let saved = credentials::get_dashscope_credentials()?;
    let api_key = merge_secret_field(
        dashscope_api_key,
        saved.as_ref().map(|c| c.api_key.as_str()),
    );
    match api_key {
        Some(api_key) => Ok(DashScopeCredentials { api_key }),
        None => Err(AppErrorDto::summary_not_configured()),
    }
}

/// Merged TOS config for probes (secrets + non-secrets). Does not write.
pub fn merge_tos_config(
    conn: &Connection,
    tos_access_key_id: Option<&str>,
    tos_secret_access_key: Option<&str>,
    tos_region: Option<&str>,
    tos_bucket: Option<&str>,
    tos_endpoint: Option<&str>,
) -> CmdResult<TosConfig> {
    let saved_secrets = credentials::get_tos_credentials()?;
    let settings = settings_service::get_settings(conn)?;

    let access_key_id = merge_secret_field(
        tos_access_key_id,
        saved_secrets.as_ref().map(|c| c.access_key_id.as_str()),
    );
    let secret_access_key = merge_secret_field(
        tos_secret_access_key,
        saved_secrets
            .as_ref()
            .map(|c| c.secret_access_key.as_str()),
    );
    let region = merge_secret_field(tos_region, Some(settings.tos_region.as_str()));
    let bucket = merge_secret_field(tos_bucket, Some(settings.tos_bucket.as_str()));
    // Endpoint is optional; empty override keeps saved (may also be empty → default).
    let endpoint = merge_secret_field(tos_endpoint, Some(settings.tos_endpoint.as_str()))
        .unwrap_or_default();

    let (Some(access_key_id), Some(secret_access_key), Some(region), Some(bucket)) =
        (access_key_id, secret_access_key, region, bucket)
    else {
        let secrets_missing = saved_secrets.is_none()
            && merge_secret_field(tos_access_key_id, None).is_none()
            && merge_secret_field(tos_secret_access_key, None).is_none();
        let region_bucket_missing = settings.tos_region.trim().is_empty()
            && settings.tos_bucket.trim().is_empty()
            && merge_secret_field(tos_region, None).is_none()
            && merge_secret_field(tos_bucket, None).is_none();

        if secrets_missing && region_bucket_missing {
            return Err(AppErrorDto::tos_not_configured());
        }
        return Err(AppErrorDto::settings_invalid(
            "测试 TOS 连接需要 Access Key、Secret Key、Region 与 Bucket（可与已保存配置合并）",
        ));
    };

    Ok(TosConfig::from_parts(
        TosCredentials {
            access_key_id,
            secret_access_key,
        },
        region,
        bucket,
        endpoint,
    ))
}

pub fn test_doubao(
    doubao_app_id: Option<&str>,
    doubao_access_token: Option<&str>,
) -> CmdResult<SettingsTestResult> {
    let credentials = merge_doubao_credentials(doubao_app_id, doubao_access_token)?;
    // Never log credentials.
    let client = HttpFlashClient::new()?;
    client.probe_connection(&credentials)?;
    Ok(SettingsTestResult::ok())
}

pub fn test_tos(
    conn: &Connection,
    tos_access_key_id: Option<&str>,
    tos_secret_access_key: Option<&str>,
    tos_region: Option<&str>,
    tos_bucket: Option<&str>,
    tos_endpoint: Option<&str>,
) -> CmdResult<SettingsTestResult> {
    let config = merge_tos_config(
        conn,
        tos_access_key_id,
        tos_secret_access_key,
        tos_region,
        tos_bucket,
        tos_endpoint,
    )?;
    let client = HttpTosClient::new();
    client.head_bucket(&config)?;
    Ok(SettingsTestResult::ok())
}

pub fn test_dashscope(dashscope_api_key: Option<&str>) -> CmdResult<SettingsTestResult> {
    let credentials = merge_dashscope_credentials(dashscope_api_key)?;
    let client = HttpQwenClient::new()?;
    client.list_models(&credentials)?;
    Ok(SettingsTestResult::ok())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::SettingsUpdate;
    use crate::services::credentials::reset_for_test;
    use crate::services::settings_service::update_settings;

    #[test]
    fn merge_secret_prefers_non_empty_override() {
        assert_eq!(
            merge_secret_field(Some("  new  "), Some("saved")).as_deref(),
            Some("new")
        );
        assert_eq!(
            merge_secret_field(Some("   "), Some("saved")).as_deref(),
            Some("saved")
        );
        assert_eq!(
            merge_secret_field(None, Some("saved")).as_deref(),
            Some("saved")
        );
        assert_eq!(merge_secret_field(Some(""), None), None);
        assert_eq!(merge_secret_field(None, None), None);
    }

    #[test]
    fn doubao_not_configured_without_saved_or_override() {
        reset_for_test();
        let err = merge_doubao_credentials(None, None).expect_err("missing");
        assert_eq!(err.code, "ASR_NOT_CONFIGURED");
    }

    #[test]
    fn doubao_partial_override_without_partner_is_invalid() {
        reset_for_test();
        let err = merge_doubao_credentials(Some("app-only"), None).expect_err("partial");
        assert_eq!(err.code, "SETTINGS_INVALID");
        assert!(!err.message.contains("app-only"));
    }

    #[test]
    fn doubao_merges_override_app_with_saved_token() {
        reset_for_test();
        credentials::set_credentials("saved-app", "saved-token").unwrap();
        let merged = merge_doubao_credentials(Some("new-app"), None).expect("merge");
        assert_eq!(merged.app_id, "new-app");
        assert_eq!(merged.access_token, "saved-token");
    }

    #[test]
    fn dashscope_not_configured() {
        reset_for_test();
        let err = merge_dashscope_credentials(None).expect_err("missing");
        assert_eq!(err.code, "SUMMARY_NOT_CONFIGURED");
    }

    #[test]
    fn dashscope_override_without_saved() {
        reset_for_test();
        let merged = merge_dashscope_credentials(Some("sk-form")).expect("merge");
        assert_eq!(merged.api_key, "sk-form");
    }

    #[test]
    fn tos_not_configured_when_empty() {
        reset_for_test();
        let conn = crate::db::pool::open_memory().expect("memory db");
        let err = merge_tos_config(&conn, None, None, None, None, None).expect_err("missing");
        assert_eq!(err.code, "TOS_NOT_CONFIGURED");
    }

    #[test]
    fn tos_partial_merge_is_invalid() {
        reset_for_test();
        let conn = crate::db::pool::open_memory().expect("memory db");
        update_settings(
            &conn,
            SettingsUpdate {
                tos_region: Some("cn-beijing".into()),
                ..Default::default()
            },
        )
        .expect("region");
        let err = merge_tos_config(&conn, None, None, None, None, None).expect_err("partial");
        assert_eq!(err.code, "SETTINGS_INVALID");
    }

    #[test]
    fn tos_merges_form_secrets_with_saved_region_bucket() {
        reset_for_test();
        let conn = crate::db::pool::open_memory().expect("memory db");
        update_settings(
            &conn,
            SettingsUpdate {
                tos_region: Some("cn-beijing".into()),
                tos_bucket: Some("meetly-audio".into()),
                tos_endpoint: Some("".into()),
                ..Default::default()
            },
        )
        .expect("non-secrets");

        let config = merge_tos_config(
            &conn,
            Some("AKFORM"),
            Some("SKFORM"),
            None,
            None,
            None,
        )
        .expect("merge");
        assert_eq!(config.credentials.access_key_id, "AKFORM");
        assert_eq!(config.credentials.secret_access_key, "SKFORM");
        assert_eq!(config.region, "cn-beijing");
        assert_eq!(config.bucket, "meetly-audio");
        assert!(config.endpoint.contains("cn-beijing"));
    }

    #[test]
    fn tos_merge_does_not_persist_overrides() {
        reset_for_test();
        let conn = crate::db::pool::open_memory().expect("memory db");
        update_settings(
            &conn,
            SettingsUpdate {
                tos_access_key_id: Some("AKSAVED".into()),
                tos_secret_access_key: Some("SKSAVED".into()),
                tos_region: Some("cn-beijing".into()),
                tos_bucket: Some("meetly-audio".into()),
                ..Default::default()
            },
        )
        .expect("seed");

        let _ = merge_tos_config(
            &conn,
            Some("AKNEW"),
            Some("SKNEW"),
            Some("cn-shanghai"),
            Some("other-bucket"),
            None,
        )
        .expect("merge");

        let settings = settings_service::get_settings(&conn).expect("get");
        assert_eq!(settings.tos_region, "cn-beijing");
        assert_eq!(settings.tos_bucket, "meetly-audio");
        let saved = credentials::get_tos_credentials()
            .expect("get")
            .expect("some");
        assert_eq!(saved.access_key_id, "AKSAVED");
        assert_eq!(saved.secret_access_key, "SKSAVED");
    }
}
