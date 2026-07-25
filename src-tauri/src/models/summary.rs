use serde::{Deserialize, Serialize};

pub const SUMMARY_LANGUAGE_ZH_CN: &str = "zh-CN";
pub const SUMMARY_LANGUAGE_EN: &str = "en";
pub const SUMMARY_LANGUAGE_ZH_EN: &str = "zh-en";

pub fn is_supported_summary_language(language: &str) -> bool {
    matches!(
        language,
        SUMMARY_LANGUAGE_ZH_CN | SUMMARY_LANGUAGE_EN | SUMMARY_LANGUAGE_ZH_EN
    )
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Summary {
    pub meeting_id: String,
    pub key_points: Vec<String>,
    pub action_items: Vec<String>,
    pub decisions: Vec<String>,
    pub language: String,
    pub created_at: String,
}

/// Model JSON payload (without local ids / timestamps).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct SummaryContent {
    #[serde(default)]
    pub key_points: Vec<String>,
    #[serde(default)]
    pub action_items: Vec<String>,
    #[serde(default)]
    pub decisions: Vec<String>,
}
