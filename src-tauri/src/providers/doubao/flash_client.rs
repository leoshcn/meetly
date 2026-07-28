//! Doubao flash (极速版) recognize client — one-shot HTTP with base64 audio.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
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
/// Auth succeeded but audio has no usable speech (common for probe tones / silence).
pub const NO_SPEECH_STATUS: &str = "20000003";

/// Doubao flash prefers 16 kHz mono 16-bit PCM WAV; sub-second clips often fail convert.
const PROBE_SAMPLE_RATE: u32 = 16_000;
const PROBE_DURATION_MS: u32 = 1_100;

fn probe_connectivity_ok(status_code: &str) -> bool {
    status_code == SUCCESS_STATUS || status_code == NO_SPEECH_STATUS
}

/// Build a minimal valid PCM WAV for credential probes (quiet 440 Hz tone).
pub fn build_probe_wav_bytes() -> Vec<u8> {
    let n_samples =
        (PROBE_SAMPLE_RATE as u64 * PROBE_DURATION_MS as u64 / 1_000) as usize;
    let mut pcm = Vec::with_capacity(n_samples * 2);
    for i in 0..n_samples {
        let t = i as f64 / f64::from(PROBE_SAMPLE_RATE);
        // Quiet tone so converters see real PCM (not an empty/all-zero edge case).
        let sample = (800.0 * (2.0 * std::f64::consts::PI * 440.0 * t).sin()) as i16;
        pcm.extend_from_slice(&sample.to_le_bytes());
    }

    let data_size = pcm.len() as u32;
    let fmt_size: u32 = 16;
    let byte_rate = PROBE_SAMPLE_RATE * 2; // mono 16-bit
    let riff_size = 4 + (8 + fmt_size) + (8 + data_size);

    let mut wav = Vec::with_capacity(44 + pcm.len());
    wav.extend_from_slice(b"RIFF");
    wav.extend_from_slice(&riff_size.to_le_bytes());
    wav.extend_from_slice(b"WAVE");
    wav.extend_from_slice(b"fmt ");
    wav.extend_from_slice(&fmt_size.to_le_bytes());
    wav.extend_from_slice(&1u16.to_le_bytes()); // PCM
    wav.extend_from_slice(&1u16.to_le_bytes()); // mono
    wav.extend_from_slice(&PROBE_SAMPLE_RATE.to_le_bytes());
    wav.extend_from_slice(&byte_rate.to_le_bytes());
    wav.extend_from_slice(&2u16.to_le_bytes()); // block align
    wav.extend_from_slice(&16u16.to_le_bytes()); // bits
    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&data_size.to_le_bytes());
    wav.extend_from_slice(&pcm);
    wav
}

fn probe_audio_base64() -> String {
    BASE64.encode(build_probe_wav_bytes())
}
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
        "enable_speaker_info": true,
        "show_utterances": true,
        "ssd_version": "200",
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

    /// Connectivity probe via flash recognize with a valid 16 kHz WAV (≥1s).
    /// Auth/permission failure → Err.
    /// `20000000` (ok) or `20000003` (no valid speech / silence) → Ok — proves credentials.
    pub fn probe_connection(&self, credentials: &DoubaoCredentials) -> CmdResult<()> {
        let input = FlashRecognizeInput {
            audio_base64: probe_audio_base64(),
            format: "wav".to_string(),
            hotwords: Vec::new(),
        };
        let outcome = self.post_flash(credentials, &input)?;
        if probe_connectivity_ok(&outcome.status_code) {
            return Ok(());
        }
        Err(AppErrorDto::asr_provider_error(format!(
            "Doubao ASR failed ({}): {}",
            outcome.status_code, outcome.api_message
        )))
    }

    fn post_flash(
        &self,
        credentials: &DoubaoCredentials,
        input: &FlashRecognizeInput,
    ) -> CmdResult<FlashHttpOutcome> {
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

        Ok(FlashHttpOutcome {
            status_code,
            api_message,
            raw,
        })
    }
}

struct FlashHttpOutcome {
    status_code: String,
    api_message: String,
    raw: String,
}

impl FlashRecognizer for HttpFlashClient {
    fn recognize(
        &self,
        credentials: &DoubaoCredentials,
        input: &FlashRecognizeInput,
    ) -> CmdResult<FlashRecognizeOutput> {
        let outcome = self.post_flash(credentials, input)?;

        if outcome.status_code != SUCCESS_STATUS {
            // Do not include response body (may be large); keep message short.
            return Err(AppErrorDto::asr_provider_error(format!(
                "Doubao ASR failed ({}): {}",
                outcome.status_code, outcome.api_message
            )));
        }

        let parsed: FlashResponseBody = serde_json::from_str(&outcome.raw).map_err(|_| {
            AppErrorDto::asr_provider_error("Invalid ASR response JSON")
        })?;

        let text = parsed
            .result
            .and_then(|r| r.text)
            .unwrap_or_default();

        Ok(FlashRecognizeOutput {
            text,
            raw_json: outcome.raw,
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
        assert_eq!(body["request"]["enable_speaker_info"], true);
        assert_eq!(body["request"]["show_utterances"], true);
    }

    #[test]
    fn format_from_path() {
        assert_eq!(audio_format_from_path(r"C:\a\b.WAV"), "wav");
        assert_eq!(audio_format_from_path("/tmp/x.mp3"), "mp3");
        assert_eq!(audio_format_from_path("/tmp/x.unknown"), "mp3");
    }

    #[test]
    fn probe_wav_is_16k_mono_pcm_over_one_second() {
        let wav = build_probe_wav_bytes();
        assert!(wav.starts_with(b"RIFF"));
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(&wav[12..16], b"fmt ");
        let audio_format = u16::from_le_bytes([wav[20], wav[21]]);
        let channels = u16::from_le_bytes([wav[22], wav[23]]);
        let rate = u32::from_le_bytes([wav[24], wav[25], wav[26], wav[27]]);
        let bits = u16::from_le_bytes([wav[34], wav[35]]);
        let data_size = u32::from_le_bytes([wav[40], wav[41], wav[42], wav[43]]);
        assert_eq!(audio_format, 1);
        assert_eq!(channels, 1);
        assert_eq!(rate, 16_000);
        assert_eq!(bits, 16);
        assert!(data_size >= 16_000 * 2); // ≥1s mono 16-bit
        assert_eq!(wav.len(), 44 + data_size as usize);
        assert!(!probe_audio_base64().is_empty());
    }

    #[test]
    fn probe_connectivity_accepts_success_and_no_speech() {
        assert!(probe_connectivity_ok(SUCCESS_STATUS));
        assert!(probe_connectivity_ok(NO_SPEECH_STATUS));
        assert!(!probe_connectivity_ok("45000000"));
        assert!(!probe_connectivity_ok("401"));
    }
}
