import { useCallback, useEffect, useState } from "react";
import {
  settingsClearDashscopeCredentials,
  settingsClearDoubaoCredentials,
  settingsGet,
  settingsUpdate,
  type AppError,
} from "../../ipc";
import styles from "./SettingsCredentials.module.css";

export function SettingsCredentialsPanel() {
  const [doubaoConfigured, setDoubaoConfigured] = useState(false);
  const [dashscopeConfigured, setDashscopeConfigured] = useState(false);
  const [appId, setAppId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [dashscopeKey, setDashscopeKey] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("loading");
  const [doubaoError, setDoubaoError] = useState<string | null>(null);
  const [dashscopeError, setDashscopeError] = useState<string | null>(null);
  const [doubaoSavedHint, setDoubaoSavedHint] = useState(false);
  const [dashscopeSavedHint, setDashscopeSavedHint] = useState(false);

  const refresh = useCallback(async () => {
    const settings = await settingsGet();
    setDoubaoConfigured(settings.doubao_configured);
    setDashscopeConfigured(settings.dashscope_configured);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
        if (!cancelled) {
          setStatus("idle");
        }
      } catch (err) {
        if (!cancelled) {
          const appErr = err as AppError;
          setDoubaoError(appErr.message ?? "Failed to load credentials status");
          setStatus("idle");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function saveDoubao() {
    setStatus("saving");
    setDoubaoError(null);
    setDoubaoSavedHint(false);
    try {
      const settings = await settingsUpdate({
        doubao_app_id: appId,
        doubao_access_token: accessToken,
      });
      setDoubaoConfigured(settings.doubao_configured);
      setDashscopeConfigured(settings.dashscope_configured);
      if (!settings.doubao_configured) {
        setDoubaoError("凭证未能保存到系统密钥环，请重试或检查 OS 凭据权限");
        return;
      }
      setAppId("");
      setAccessToken("");
      setDoubaoSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setDoubaoError(appErr.message ?? "Save failed");
    } finally {
      setStatus("idle");
    }
  }

  async function clearDoubao() {
    setStatus("saving");
    setDoubaoError(null);
    setDoubaoSavedHint(false);
    try {
      const settings = await settingsClearDoubaoCredentials();
      setDoubaoConfigured(settings.doubao_configured);
      setDashscopeConfigured(settings.dashscope_configured);
      setAppId("");
      setAccessToken("");
      setDoubaoSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setDoubaoError(appErr.message ?? "Clear failed");
    } finally {
      setStatus("idle");
    }
  }

  async function saveDashscope() {
    setStatus("saving");
    setDashscopeError(null);
    setDashscopeSavedHint(false);
    try {
      const settings = await settingsUpdate({
        dashscope_api_key: dashscopeKey,
      });
      setDoubaoConfigured(settings.doubao_configured);
      setDashscopeConfigured(settings.dashscope_configured);
      if (!settings.dashscope_configured) {
        setDashscopeError(
          "DashScope 密钥未能保存到系统密钥环，请重试或检查 OS 凭据权限",
        );
        return;
      }
      setDashscopeKey("");
      setDashscopeSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setDashscopeError(appErr.message ?? "Save failed");
    } finally {
      setStatus("idle");
    }
  }

  async function clearDashscope() {
    setStatus("saving");
    setDashscopeError(null);
    setDashscopeSavedHint(false);
    try {
      const settings = await settingsClearDashscopeCredentials();
      setDoubaoConfigured(settings.doubao_configured);
      setDashscopeConfigured(settings.dashscope_configured);
      setDashscopeKey("");
      setDashscopeSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setDashscopeError(appErr.message ?? "Clear failed");
    } finally {
      setStatus("idle");
    }
  }

  const canSaveDoubao =
    appId.trim().length > 0 &&
    accessToken.trim().length > 0 &&
    status !== "saving" &&
    status !== "loading";

  const canSaveDashscope =
    dashscopeKey.trim().length > 0 &&
    status !== "saving" &&
    status !== "loading";

  return (
    <>
      <section className={styles.panel}>
        <h2>豆包凭证（转写）</h2>
        <p className={styles.hint}>
          App Id 与 Access Token 保存在本机密钥存储中，不会写入 SQLite，也不会通过
          settings_get 回传明文。单文件转写上限 20 MiB。
        </p>
        <p
          className={`${styles.status} ${doubaoConfigured ? styles.statusOk : styles.statusWarn}`}
        >
          {doubaoConfigured ? "已配置豆包凭证" : "尚未配置豆包凭证"}
        </p>
        <div className={styles.fields}>
          <label>
            App Id
            <input
              type="password"
              autoComplete="off"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder={
                doubaoConfigured
                  ? "留空表示不修改；填写则需同时填 Token"
                  : "Doubao App Id"
              }
            />
          </label>
          <label>
            Access Token
            <input
              type="password"
              autoComplete="off"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={doubaoConfigured ? "留空表示不修改" : "Doubao Access Token"}
            />
          </label>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={saveDoubao} disabled={!canSaveDoubao}>
            {status === "saving" ? "保存中…" : "保存凭证"}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={clearDoubao}
            disabled={!doubaoConfigured || status === "saving" || status === "loading"}
          >
            清除凭证
          </button>
          {doubaoSavedHint && <span className={styles.ok}>已更新</span>}
        </div>
        {doubaoError && <p className={styles.error}>{doubaoError}</p>}
      </section>

      <section className={styles.panel}>
        <h2>通义千问 / DashScope（摘要）</h2>
        <p className={styles.hint}>
          API Key 保存在本机密钥存储中，不会写入 SQLite，也不会通过 settings_get
          回传明文。模型使用 qwen3.7-plus。
        </p>
        <p
          className={`${styles.status} ${dashscopeConfigured ? styles.statusOk : styles.statusWarn}`}
        >
          {dashscopeConfigured ? "已配置 DashScope API Key" : "尚未配置 DashScope API Key"}
        </p>
        <div className={styles.fields}>
          <label>
            API Key
            <input
              type="password"
              autoComplete="off"
              value={dashscopeKey}
              onChange={(e) => setDashscopeKey(e.target.value)}
              placeholder={
                dashscopeConfigured ? "留空表示不修改" : "DashScope API Key"
              }
            />
          </label>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={saveDashscope}
            disabled={!canSaveDashscope}
          >
            {status === "saving" ? "保存中…" : "保存 API Key"}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={clearDashscope}
            disabled={
              !dashscopeConfigured || status === "saving" || status === "loading"
            }
          >
            清除 API Key
          </button>
          {dashscopeSavedHint && <span className={styles.ok}>已更新</span>}
        </div>
        {dashscopeError && <p className={styles.error}>{dashscopeError}</p>}
      </section>
    </>
  );
}
