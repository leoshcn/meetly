use serde::Serialize;

use crate::error::CmdResult;

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
}

#[tauri::command]
pub fn app_health() -> CmdResult<HealthResponse> {
    Ok(HealthResponse {
        status: "ok".into(),
        version: env!("CARGO_PKG_VERSION").into(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_health_ok() {
        let res = app_health().expect("health");
        assert_eq!(res.status, "ok");
        assert!(!res.version.is_empty());
    }
}
