use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Settings {
    pub hotwords: Vec<String>,
    pub context_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SettingsUpdate {
    pub hotwords: Option<Vec<String>>,
    pub context_text: Option<String>,
}
