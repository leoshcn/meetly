use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Settings {
    pub hotwords: Vec<String>,
    pub context_text: String,
    /// True when both Doubao app id and access token are present in the OS keyring.
    /// Secrets themselves are never returned over IPC.
    pub doubao_configured: bool,
    /// True when a DashScope API key is present in the OS keyring.
    /// The key itself is never returned over IPC.
    pub dashscope_configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SettingsUpdate {
    pub hotwords: Option<Vec<String>>,
    pub context_text: Option<String>,
    /// Write-only Doubao App Id (never echoed by settings_get).
    pub doubao_app_id: Option<String>,
    /// Write-only Doubao Access Token (never echoed by settings_get).
    pub doubao_access_token: Option<String>,
    /// Write-only DashScope API key (never echoed by settings_get).
    pub dashscope_api_key: Option<String>,
}
