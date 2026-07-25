import { useCallback, useEffect, useState } from "react";
import {
  settingsClearDoubaoCredentials,
  settingsGet,
  settingsUpdate,
  type AppError,
} from "../../ipc";
import styles from "./SettingsCredentials.module.css";

export function SettingsCredentialsPanel() {
  const [configured, setConfigured] = useState(false);
  const [appId, setAppId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState(false);

  const refresh = useCallback(async () => {
    const settings = await settingsGet();
    setConfigured(settings.doubao_configured);
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
          setError(appErr.message ?? "Failed to load credentials status");
          setStatus("idle");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function save() {
    setStatus("saving");
    setError(null);
    setSavedHint(false);
    try {
      const settings = await settingsUpdate({
        doubao_app_id: appId,
        doubao_access_token: accessToken,
      });
      setConfigured(settings.doubao_configured);
      setAppId("");
      setAccessToken("");
      setSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setError(appErr.message ?? "Save failed");
    } finally {
      setStatus("idle");
    }
  }

  async function clear() {
    setStatus("saving");
    setError(null);
    setSavedHint(false);
    try {
      const settings = await settingsClearDoubaoCredentials();
      setConfigured(settings.doubao_configured);
      setAppId("");
      setAccessToken("");
      setSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setError(appErr.message ?? "Clear failed");
    } finally {
      setStatus("idle");
    }
  }

  const canSave =
    appId.trim().length > 0 &&
    accessToken.trim().length > 0 &&
    status !== "saving" &&
    status !== "loading";

  return (
    <section className={styles.panel}>
      <h2>豆包凭证（转写）</h2>
      <p className={styles.hint}>
        App Id 与 Access Token 保存在本机密钥存储中，不会写入 SQLite，也不会通过
        settings_get 回传明文。单文件转写上限 20 MiB。
      </p>
      <p className={`${styles.status} ${configured ? styles.statusOk : styles.statusWarn}`}>
        {configured ? "已配置豆包凭证" : "尚未配置豆包凭证"}
      </p>
      <div className={styles.fields}>
        <label>
          App Id
          <input
            type="password"
            autoComplete="off"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder={configured ? "留空表示不修改；填写则需同时填 Token" : "Doubao App Id"}
          />
        </label>
        <label>
          Access Token
          <input
            type="password"
            autoComplete="off"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder={configured ? "留空表示不修改" : "Doubao Access Token"}
          />
        </label>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={save} disabled={!canSave}>
          {status === "saving" ? "保存中…" : "保存凭证"}
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={clear}
          disabled={!configured || status === "saving" || status === "loading"}
        >
          清除凭证
        </button>
        {savedHint && <span className={styles.ok}>已更新</span>}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
