use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Meeting {
    pub id: String,
    pub source_path: String,
    pub title: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TranscriptSegment {
    pub speaker_id: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Transcript {
    pub meeting_id: String,
    pub text: String,
    #[serde(default)]
    pub segments: Vec<TranscriptSegment>,
    #[serde(default)]
    pub speaker_names: BTreeMap<String, String>,
}

/// Build display text from segments + name map. Empty segments → empty string
/// (caller should keep ASR flat text separately when there is no diarization).
pub fn render_transcript_text(
    segments: &[TranscriptSegment],
    speaker_names: &BTreeMap<String, String>,
) -> String {
    if segments.is_empty() {
        return String::new();
    }
    let mut parts = Vec::with_capacity(segments.len());
    for seg in segments {
        let name = speaker_names
            .get(&seg.speaker_id)
            .cloned()
            .unwrap_or_else(|| default_speaker_label(&seg.speaker_id));
        parts.push(format!("【{name}】{}", seg.text));
    }
    parts.join("\n")
}

pub fn default_speaker_label(speaker_id: &str) -> String {
    format!("发言人{speaker_id}")
}

pub fn default_speaker_names(segments: &[TranscriptSegment]) -> BTreeMap<String, String> {
    let mut names = BTreeMap::new();
    let mut ordinal = 1u32;
    for seg in segments {
        if names.contains_key(&seg.speaker_id) {
            continue;
        }
        // Stable ordinal by first appearance, not by raw speaker id string.
        names.insert(seg.speaker_id.clone(), format!("发言人{ordinal}"));
        ordinal += 1;
    }
    names
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn render_uses_display_names() {
        let segments = vec![
            TranscriptSegment {
                speaker_id: "a".into(),
                text: "你好".into(),
            },
            TranscriptSegment {
                speaker_id: "b".into(),
                text: "hello".into(),
            },
        ];
        let mut names = BTreeMap::new();
        names.insert("a".into(), "张三".into());
        names.insert("b".into(), "李四".into());
        let text = render_transcript_text(&segments, &names);
        assert_eq!(text, "【张三】你好\n【李四】hello");
    }

    #[test]
    fn default_names_by_appearance_order() {
        let segments = vec![
            TranscriptSegment {
                speaker_id: "2".into(),
                text: "a".into(),
            },
            TranscriptSegment {
                speaker_id: "1".into(),
                text: "b".into(),
            },
            TranscriptSegment {
                speaker_id: "2".into(),
                text: "c".into(),
            },
        ];
        let names = default_speaker_names(&segments);
        assert_eq!(names.get("2").map(String::as_str), Some("发言人1"));
        assert_eq!(names.get("1").map(String::as_str), Some("发言人2"));
    }
}
