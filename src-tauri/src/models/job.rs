use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Job {
    pub id: String,
    pub meeting_id: String,
    pub kind: String,
    pub status: String,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub const JOB_KIND_TRANSCRIPTION: &str = "transcription";
pub const JOB_STATUS_RUNNING: &str = "running";
pub const JOB_STATUS_SUCCEEDED: &str = "succeeded";
pub const JOB_STATUS_FAILED: &str = "failed";
