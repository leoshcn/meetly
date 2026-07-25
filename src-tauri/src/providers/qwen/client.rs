//! Qwen (DashScope) OpenAI-compatible chat client for structured meeting summaries.

use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::{AppErrorDto, CmdResult};
use crate::models::SummaryContent;
use crate::services::credentials::DashScopeCredentials;

/// DashScope China (Beijing) OpenAI-compatible chat completions endpoint.
pub const CHAT_COMPLETIONS_URL: &str =
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

/// Confirmed model id from DashScope / QwenCloud docs.
pub const MODEL_ID: &str = "qwen3.7-plus";

#[derive(Debug, Clone)]
pub struct SummaryGenerateInput {
    pub transcript: String,
    pub context_text: String,
}

/// Build system + user messages. Always mentions JSON (required by DashScope json_object mode).
pub fn build_summary_messages(input: &SummaryGenerateInput) -> Vec<Value> {
    let system = concat!(
        "你是会议纪要助手。根据转写文本与可选上下文，输出简体中文结构化摘要。",
        "必须返回一个 JSON 对象，字段为 key_points、action_items、decisions，",
        "每个字段是字符串数组。某块没有内容时返回空数组。"
    );

    let context_section = if input.context_text.trim().is_empty() {
        "（无额外上下文）".to_string()
    } else {
        input.context_text.clone()
    };

    let user = format!(
        "请根据以下材料生成摘要 JSON。\n\n【用户上下文】\n{context_section}\n\n【会议转写】\n{}",
        input.transcript
    );

    vec![
        json!({ "role": "system", "content": system }),
        json!({ "role": "user", "content": user }),
    ]
}

pub fn build_chat_body(input: &SummaryGenerateInput) -> Value {
    json!({
        "model": MODEL_ID,
        "messages": build_summary_messages(input),
        "response_format": { "type": "json_object" },
        "enable_thinking": false,
    })
}

/// Strip optional markdown fences and parse into SummaryContent.
pub fn parse_summary_json(content: &str) -> CmdResult<SummaryContent> {
    let trimmed = content.trim();
    let without_fence = strip_json_fence(trimmed);
    serde_json::from_str::<SummaryContent>(without_fence).map_err(|_| {
        AppErrorDto::summary_provider_error("Invalid summary JSON from provider")
    })
}

fn strip_json_fence(s: &str) -> &str {
    let s = s.trim();
    if let Some(rest) = s.strip_prefix("```json") {
        return rest
            .strip_suffix("```")
            .unwrap_or(rest)
            .trim();
    }
    if let Some(rest) = s.strip_prefix("```") {
        return rest
            .strip_suffix("```")
            .unwrap_or(rest)
            .trim();
    }
    s
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Option<Vec<ChatChoice>>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: Option<ChatMessage>,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: Option<String>,
}

/// Trait so summary jobs can use a stub in tests.
pub trait SummaryGenerator: Send + Sync {
    fn generate(
        &self,
        credentials: &DashScopeCredentials,
        input: &SummaryGenerateInput,
    ) -> CmdResult<SummaryContent>;
}

pub struct HttpQwenClient {
    client: reqwest::blocking::Client,
    url: String,
}

impl HttpQwenClient {
    pub fn new() -> CmdResult<Self> {
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .map_err(|_| AppErrorDto::internal("Failed to create HTTP client"))?;
        Ok(Self {
            client,
            url: CHAT_COMPLETIONS_URL.to_string(),
        })
    }
}

impl SummaryGenerator for HttpQwenClient {
    fn generate(
        &self,
        credentials: &DashScopeCredentials,
        input: &SummaryGenerateInput,
    ) -> CmdResult<SummaryContent> {
        let body = build_chat_body(input);
        // Never log api_key or full prompt payloads.

        let response = self
            .client
            .post(&self.url)
            .header("Content-Type", "application/json")
            .header(
                "Authorization",
                format!("Bearer {}", credentials.api_key),
            )
            .json(&body)
            .send()
            .map_err(|_| AppErrorDto::summary_provider_error("Failed to reach DashScope"))?;

        let status = response.status();
        let raw = response
            .text()
            .map_err(|_| AppErrorDto::summary_provider_error("Failed to read summary response"))?;

        if !status.is_success() {
            return Err(AppErrorDto::summary_provider_error(format!(
                "DashScope summary failed (HTTP {})",
                status.as_u16()
            )));
        }

        let parsed: ChatCompletionResponse = serde_json::from_str(&raw).map_err(|_| {
            AppErrorDto::summary_provider_error("Invalid summary response envelope")
        })?;

        let content = parsed
            .choices
            .and_then(|mut c| c.pop())
            .and_then(|c| c.message)
            .and_then(|m| m.content)
            .unwrap_or_default();

        parse_summary_json(&content)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prompt_includes_context_when_present() {
        let body = build_chat_body(&SummaryGenerateInput {
            transcript: "讨论了路线图".into(),
            context_text: "产品周会".into(),
        });
        let messages = body["messages"].as_array().unwrap();
        let user = messages[1]["content"].as_str().unwrap();
        assert!(user.contains("产品周会"));
        assert!(user.contains("讨论了路线图"));
        let system = messages[0]["content"].as_str().unwrap();
        assert!(system.to_ascii_lowercase().contains("json"));
        assert_eq!(body["model"], MODEL_ID);
        assert_eq!(body["response_format"]["type"], "json_object");
        assert_eq!(body["enable_thinking"], false);
    }

    #[test]
    fn prompt_works_with_empty_context() {
        let body = build_chat_body(&SummaryGenerateInput {
            transcript: "hello".into(),
            context_text: "  ".into(),
        });
        let user = body["messages"][1]["content"].as_str().unwrap();
        assert!(user.contains("（无额外上下文）"));
        assert!(user.contains("hello"));
    }

    #[test]
    fn parse_valid_json() {
        let content = r#"{"key_points":["a"],"action_items":[],"decisions":["d"]}"#;
        let parsed = parse_summary_json(content).unwrap();
        assert_eq!(parsed.key_points, vec!["a"]);
        assert!(parsed.action_items.is_empty());
        assert_eq!(parsed.decisions, vec!["d"]);
    }

    #[test]
    fn parse_failure_maps_to_provider_error() {
        let err = parse_summary_json("not-json").expect_err("bad");
        assert_eq!(err.code, "SUMMARY_PROVIDER_ERROR");
    }

    #[test]
    fn parse_strips_markdown_fence() {
        let content = "```json\n{\"key_points\":[\"x\"],\"action_items\":[],\"decisions\":[]}\n```";
        let parsed = parse_summary_json(content).unwrap();
        assert_eq!(parsed.key_points, vec!["x"]);
    }
}
