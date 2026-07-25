//! Doubao flash (极速版) recognize client — one-shot HTTP with base64 audio.

use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppErrorDto, CmdResult};
use crate::providers::doubao::hotwords::{body_excludes_context_text, build_corpus_context};
use crate::services::credentials::DoubaoCredentials;

pub const FLASH_URL: &str =
    "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash";
pub const RESOURCE_ID: &str = "volc.bigasr.auc_turbo";
pub const SUCCESS_STATUS: &str = "20000000";

#[derive(Debug, Clone)]
pub struct FlashRecognizeInput {
    pub audio_base64: String,
    pub format: String,
    pub hotwords: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct FlashRecognizeOutput {
    pub text: String,
    pub raw_json: String,
}

#[derive(Debug, Deserialize)]
struct FlashResponseBody {
    result: Option<FlashResult>,
}

#[derive(Debug, Deserialize)]
struct FlashResult {
    text: Option<String>,
}

/// Build the JSON body for flash recognize. Never includes Meetly `context_text`.
pub fn build_flash_body(input: &FlashRecognizeInput) -> Value {
    let mut request = json!({
        "model_name": "bigmodel",
    });

    if let Some(context) = build_corpus_context(&input.hotwords) {
        request["corpus"] = json!({ "context": context });
    }

    let body = json!({
        "user": { "uid": "meetly" },
        "audio": {
            "data": input.audio_base64,
            "format": input.format,
        },
        "request": request,
    });

    debug_assert!(body_excludes_context_text(&body));
    body
}

pub fn audio_format_from_path(path: &str) -> String {
    std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .filter(|e| {
            matches!(
                e.as_str(),
                "wav" | "mp3" | "ogg" | "m4a" | "flac" | "aac" | "wma" | "mp4"
            )
        })
        .unwrap_or_else(|| "mp3".to_string())
}

/// Trait so transcription jobs can use a stub in tests.
pub trait FlashRecognizer: Send + Sync {
    fn recognize(
        &self,
        credentials: &DoubaoCredentials,
        input: &FlashRecognizeInput,
    ) -> CmdResult<FlashRecognizeOutput>;
}

pub struct HttpFlashClient {
    client: reqwest::blocking::Client,
}

impl HttpFlashClient {
    pub fn new() -> CmdResult<Self> {
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .map_err(|_| AppErrorDto::internal("Failed to create HTTP client"))?;
        Ok(Self { client })
    }
}

impl FlashRecognizer for HttpFlashClient {
    fn recognize(
        &self,
        credentials: &DoubaoCredentials,
        input: &FlashRecognizeInput,
    ) -> CmdResult<FlashRecognizeOutput> {
        let request_id = Uuid::new_v4().to_string();
        let body = build_flash_body(input);

        let response = self
            .client
            .post(FLASH_URL)
            .header("Content-Type", "application/json")
            .header("X-Api-App-Key", &credentials.app_id)
            .header("X-Api-Access-Key", &credentials.access_token)
            .header("X-Api-Resource-Id", RESOURCE_ID)
            .header("X-Api-Request-Id", &request_id)
            .json(&body)
            .send()
            .map_err(|_| AppErrorDto::asr_provider_error("Failed to reach Doubao ASR"))?;

        let status_code = response
            .headers()
            .get("X-Api-Status-Code")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();

        let api_message = response
            .headers()
            .get("X-Api-Message")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("ASR provider error")
            .to_string();

        let raw = response
            .text()
            .map_err(|_| AppErrorDto::asr_provider_error("Failed to read ASR response"))?;

        if status_code != SUCCESS_STATUS {
            // Do not include response body (may be large); keep message short.
            return Err(AppErrorDto::asr_provider_error(format!(
                "Doubao ASR failed ({status_code}): {api_message}"
            )));
        }

        let parsed: FlashResponseBody = serde_json::from_str(&raw).map_err(|_| {
            AppErrorDto::asr_provider_error("Invalid ASR response JSON")
        })?;

        let text = parsed
            .result
            .and_then(|r| r.text)
            .unwrap_or_default();

        Ok(FlashRecognizeOutput {
            text,
            raw_json: raw,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flash_body_uses_data_and_hotwords_not_context_text() {
        let body = build_flash_body(&FlashRecognizeInput {
            audio_base64: "Zm9v".into(),
            format: "wav".into(),
            hotwords: vec!["Meetly".into()],
        });
        assert_eq!(body["audio"]["data"], "Zm9v");
        assert!(body["audio"].get("url").is_none());
        let ctx = body["request"]["corpus"]["context"].as_str().unwrap();
        assert!(ctx.contains("Meetly"));
        assert!(!body.to_string().contains("context_text"));
    }

    #[test]
    fn format_from_path() {
        assert_eq!(audio_format_from_path(r"C:\a\b.WAV"), "wav");
        assert_eq!(audio_format_from_path("/tmp/x.mp3"), "mp3");
        assert_eq!(audio_format_from_path("/tmp/x.unknown"), "mp3");
    }
}
