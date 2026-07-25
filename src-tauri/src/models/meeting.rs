use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Meeting {
    pub id: String,
    pub source_path: String,
    pub title: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Transcript {
    pub meeting_id: String,
    pub text: String,
}
