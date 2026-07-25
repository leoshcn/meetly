//! Credential storage via OS keyring (never SQLite).
//!
//! Doubao (ASR) and DashScope (summary) keys live in separate keyring accounts.
//! In unit tests, in-memory stores are used so CI never touches the real keyring.

use crate::error::{AppErrorDto, CmdResult};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DoubaoCredentials {
    pub app_id: String,
    pub access_token: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DashScopeCredentials {
    pub api_key: String,
}

#[cfg(test)]
mod doubao_store {
    use super::*;
    use std::cell::RefCell;

    thread_local! {
        static MEMORY: RefCell<Option<(String, String)>> = const { RefCell::new(None) };
    }

    pub fn get() -> CmdResult<Option<DoubaoCredentials>> {
        Ok(MEMORY.with(|cell| {
            cell.borrow().as_ref().map(|(app_id, token)| DoubaoCredentials {
                app_id: app_id.clone(),
                access_token: token.clone(),
            })
        }))
    }

    pub fn set(app_id: &str, access_token: &str) -> CmdResult<()> {
        MEMORY.with(|cell| {
            *cell.borrow_mut() = Some((app_id.to_string(), access_token.to_string()));
        });
        Ok(())
    }

    pub fn clear() -> CmdResult<()> {
        MEMORY.with(|cell| {
            *cell.borrow_mut() = None;
        });
        Ok(())
    }

    pub fn reset_for_test() {
        let _ = clear();
    }
}

#[cfg(not(test))]
mod doubao_store {
    use super::*;
    use keyring::Entry;

    const SERVICE: &str = "meetly";
    const ACCOUNT_APP_ID: &str = "doubao_app_id";
    const ACCOUNT_ACCESS_TOKEN: &str = "doubao_access_token";

    fn entry(account: &str) -> CmdResult<Entry> {
        Entry::new(SERVICE, account)
            .map_err(|_| AppErrorDto::internal("Failed to open credential store"))
    }

    fn read_secret(account: &str) -> CmdResult<Option<String>> {
        match entry(account)?.get_password() {
            Ok(value) if !value.is_empty() => Ok(Some(value)),
            Ok(_) => Ok(None),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err(AppErrorDto::internal("Failed to read credentials")),
        }
    }

    pub fn get() -> CmdResult<Option<DoubaoCredentials>> {
        let app_id = read_secret(ACCOUNT_APP_ID)?;
        let access_token = read_secret(ACCOUNT_ACCESS_TOKEN)?;
        match (app_id, access_token) {
            (Some(app_id), Some(access_token)) => Ok(Some(DoubaoCredentials {
                app_id,
                access_token,
            })),
            _ => Ok(None),
        }
    }

    pub fn set(app_id: &str, access_token: &str) -> CmdResult<()> {
        // Do not forward keyring Display into IPC (may include paths).
        entry(ACCOUNT_APP_ID)?
            .set_password(app_id)
            .map_err(|_| AppErrorDto::internal("Failed to store Doubao app id"))?;
        entry(ACCOUNT_ACCESS_TOKEN)?
            .set_password(access_token)
            .map_err(|_| AppErrorDto::internal("Failed to store Doubao access token"))?;
        match get()? {
            Some(stored)
                if stored.app_id == app_id && stored.access_token == access_token =>
            {
                Ok(())
            }
            Some(_) | None => Err(AppErrorDto::internal(
                "Credential store write did not persist; check OS keyring access",
            )),
        }
    }

    pub fn clear() -> CmdResult<()> {
        for account in [ACCOUNT_APP_ID, ACCOUNT_ACCESS_TOKEN] {
            match entry(account)?.delete_credential() {
                Ok(()) => {}
                Err(keyring::Error::NoEntry) => {}
                Err(_) => {
                    return Err(AppErrorDto::internal("Failed to clear credentials"));
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod dashscope_store {
    use super::*;
    use std::cell::RefCell;

    thread_local! {
        static MEMORY: RefCell<Option<String>> = const { RefCell::new(None) };
    }

    pub fn get() -> CmdResult<Option<DashScopeCredentials>> {
        Ok(MEMORY.with(|cell| {
            cell.borrow()
                .as_ref()
                .map(|api_key| DashScopeCredentials {
                    api_key: api_key.clone(),
                })
        }))
    }

    pub fn set(api_key: &str) -> CmdResult<()> {
        MEMORY.with(|cell| {
            *cell.borrow_mut() = Some(api_key.to_string());
        });
        Ok(())
    }

    pub fn clear() -> CmdResult<()> {
        MEMORY.with(|cell| {
            *cell.borrow_mut() = None;
        });
        Ok(())
    }

    pub fn reset_for_test() {
        let _ = clear();
    }
}

#[cfg(not(test))]
mod dashscope_store {
    use super::*;
    use keyring::Entry;

    const SERVICE: &str = "meetly";
    const ACCOUNT_API_KEY: &str = "dashscope_api_key";

    fn entry() -> CmdResult<Entry> {
        Entry::new(SERVICE, ACCOUNT_API_KEY)
            .map_err(|_| AppErrorDto::internal("Failed to open credential store"))
    }

    pub fn get() -> CmdResult<Option<DashScopeCredentials>> {
        match entry()?.get_password() {
            Ok(value) if !value.is_empty() => Ok(Some(DashScopeCredentials { api_key: value })),
            Ok(_) => Ok(None),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err(AppErrorDto::internal("Failed to read credentials")),
        }
    }

    pub fn set(api_key: &str) -> CmdResult<()> {
        // Do not forward keyring Display into IPC (may include paths).
        entry()?
            .set_password(api_key)
            .map_err(|_| AppErrorDto::internal("Failed to store DashScope API key"))?;
        match get()? {
            Some(stored) if stored.api_key == api_key => Ok(()),
            Some(_) | None => Err(AppErrorDto::internal(
                "Credential store write did not persist; check OS keyring access",
            )),
        }
    }

    pub fn clear() -> CmdResult<()> {
        match entry()?.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err(AppErrorDto::internal("Failed to clear credentials")),
        }
    }
}

pub fn is_configured() -> bool {
    matches!(doubao_store::get(), Ok(Some(_)))
}

pub fn is_dashscope_configured() -> bool {
    matches!(dashscope_store::get(), Ok(Some(_)))
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn get_credentials() -> CmdResult<Option<DoubaoCredentials>> {
    doubao_store::get()
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn get_dashscope_credentials() -> CmdResult<Option<DashScopeCredentials>> {
    dashscope_store::get()
}

pub fn require_credentials() -> CmdResult<DoubaoCredentials> {
    doubao_store::get()?.ok_or_else(AppErrorDto::asr_not_configured)
}

pub fn require_dashscope_credentials() -> CmdResult<DashScopeCredentials> {
    dashscope_store::get()?.ok_or_else(AppErrorDto::summary_not_configured)
}

/// Persist Doubao credentials. Empty strings are rejected.
pub fn set_credentials(app_id: &str, access_token: &str) -> CmdResult<()> {
    let app_id = app_id.trim();
    let access_token = access_token.trim();
    if app_id.is_empty() || access_token.is_empty() {
        return Err(AppErrorDto::settings_invalid(
            "Doubao app id and access token cannot be empty",
        ));
    }
    doubao_store::set(app_id, access_token)
}

/// Persist DashScope API key. Empty strings are rejected.
pub fn set_dashscope_credentials(api_key: &str) -> CmdResult<()> {
    let api_key = api_key.trim();
    if api_key.is_empty() {
        return Err(AppErrorDto::settings_invalid(
            "DashScope API key cannot be empty",
        ));
    }
    dashscope_store::set(api_key)
}

pub fn clear_credentials() -> CmdResult<()> {
    doubao_store::clear()
}

pub fn clear_dashscope_credentials() -> CmdResult<()> {
    dashscope_store::clear()
}

#[cfg(test)]
pub fn reset_for_test() {
    doubao_store::reset_for_test();
    dashscope_store::reset_for_test();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn configured_flag_false_until_both_set() {
        reset_for_test();
        assert!(!is_configured());
        set_credentials("app", "token").expect("set");
        assert!(is_configured());
        let creds = get_credentials().expect("get").expect("some");
        assert_eq!(creds.app_id, "app");
        assert_eq!(creds.access_token, "token");
        clear_credentials().expect("clear");
        assert!(!is_configured());
    }

    #[test]
    fn empty_credentials_rejected() {
        reset_for_test();
        let err = set_credentials(" ", "token").expect_err("empty app");
        assert_eq!(err.code, "SETTINGS_INVALID");
    }

    #[test]
    fn dashscope_configured_flag_without_leaking_key() {
        reset_for_test();
        assert!(!is_dashscope_configured());
        set_dashscope_credentials("sk-secret-key").expect("set");
        assert!(is_dashscope_configured());
        let creds = get_dashscope_credentials().expect("get").expect("some");
        assert_eq!(creds.api_key, "sk-secret-key");
        clear_dashscope_credentials().expect("clear");
        assert!(!is_dashscope_configured());
    }

    #[test]
    fn empty_dashscope_key_rejected() {
        reset_for_test();
        let err = set_dashscope_credentials("   ").expect_err("empty");
        assert_eq!(err.code, "SETTINGS_INVALID");
    }
}
