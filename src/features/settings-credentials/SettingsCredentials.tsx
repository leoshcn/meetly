import { useCallback, useEffect, useState } from "react";
import {
  settingsClearDashscopeCredentials,
  settingsClearDoubaoCredentials,
  settingsClearTosCredentials,
  settingsGet,
  settingsUpdate,
  type AppError,
} from "../../ipc";
import { friendlyErrorMessage } from "../../shared/lib";
import { Button } from "../../shared/ui";
import styles from "./SettingsCredentials.module.css";

export function SettingsCredentialsPanel() {
  const [doubaoConfigured, setDoubaoConfigured] = useState(false);
  const [dashscopeConfigured, setDashscopeConfigured] = useState(false);
  const [tosConfigured, setTosConfigured] = useState(false);
  const [appId, setAppId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [dashscopeKey, setDashscopeKey] = useState("");
  const [tosAk, setTosAk] = useState("");
  const [tosSk, setTosSk] = useState("");
  const [tosRegion, setTosRegion] = useState("");
  const [tosBucket, setTosBucket] = useState("");
  const [tosEndpoint, setTosEndpoint] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("loading");
  const [doubaoError, setDoubaoError] = useState<string | null>(null);
  const [dashscopeError, setDashscopeError] = useState<string | null>(null);
  const [tosError, setTosError] = useState<string | null>(null);
  const [doubaoSavedHint, setDoubaoSavedHint] = useState(false);
  const [dashscopeSavedHint, setDashscopeSavedHint] = useState(false);
  const [tosSavedHint, setTosSavedHint] = useState(false);

  const applySettingsFlags = useCallback(
    (settings: {
      doubao_configured: boolean;
      dashscope_configured: boolean;
      tos_configured: boolean;
      tos_region: string;
      tos_bucket: string;
      tos_endpoint: string;
    }) => {
      setDoubaoConfigured(settings.doubao_configured);
      setDashscopeConfigured(settings.dashscope_configured);
      setTosConfigured(settings.tos_configured);
      setTosRegion(settings.tos_region);
      setTosBucket(settings.tos_bucket);
      setTosEndpoint(settings.tos_endpoint);
    },
    [],
  );

  const refresh = useCallback(async () => {
    const settings = await settingsGet();
    applySettingsFlags(settings);
  }, [applySettingsFlags]);

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
          setDoubaoError(friendlyErrorMessage(appErr));
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
      applySettingsFlags(settings);
      if (!settings.doubao_configured) {
        setDoubaoError("凭证未能保存到系统密钥环，请重试或检查 OS 凭据权限");
        return;
      }
      setAppId("");
      setAccessToken("");
      setDoubaoSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setDoubaoError(friendlyErrorMessage(appErr));
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
      applySettingsFlags(settings);
      setAppId("");
      setAccessToken("");
      setDoubaoSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setDoubaoError(friendlyErrorMessage(appErr));
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
      applySettingsFlags(settings);
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
      setDashscopeError(friendlyErrorMessage(appErr));
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
      applySettingsFlags(settings);
      setDashscopeKey("");
      setDashscopeSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setDashscopeError(friendlyErrorMessage(appErr));
    } finally {
      setStatus("idle");
    }
  }

  async function saveTos() {
    setStatus("saving");
    setTosError(null);
    setTosSavedHint(false);
    try {
      const update: Parameters<typeof settingsUpdate>[0] = {
        tos_region: tosRegion,
        tos_bucket: tosBucket,
        tos_endpoint: tosEndpoint,
      };
      if (tosAk.trim() || tosSk.trim()) {
        update.tos_access_key_id = tosAk;
        update.tos_secret_access_key = tosSk;
      }
      const settings = await settingsUpdate(update);
      applySettingsFlags(settings);
      if (!settings.tos_configured) {
        setTosError(
          "TOS 未完整配置：需要 Access Key、Secret Key、Region 与 Bucket",
        );
        return;
      }
      setTosAk("");
      setTosSk("");
      setTosSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setTosError(friendlyErrorMessage(appErr));
    } finally {
      setStatus("idle");
    }
  }

  async function clearTos() {
    setStatus("saving");
    setTosError(null);
    setTosSavedHint(false);
    try {
      const settings = await settingsClearTosCredentials();
      applySettingsFlags(settings);
      setTosAk("");
      setTosSk("");
      setTosSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setTosError(friendlyErrorMessage(appErr));
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

  const canSaveTos =
    tosRegion.trim().length > 0 &&
    tosBucket.trim().length > 0 &&
    (tosConfigured || (tosAk.trim().length > 0 && tosSk.trim().length > 0)) &&
    status !== "saving" &&
    status !== "loading";

  return (
    <>
      <section className={styles.panel}>
        <h2>豆包凭证（转写）</h2>
        <p className={styles.hint}>
          App Id 与 Access Token 保存在本机密钥存储中，不会写入 SQLite，也不会通过
          settings_get 回传明文。≤20 MiB 走极速版；更大文件需同时配置 TOS（上限 512
          MiB）。
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
          <Button onClick={saveDoubao} disabled={!canSaveDoubao}>
            {status === "saving" ? "保存中…" : "保存凭证"}
          </Button>
          <Button
            variant="secondary"
            onClick={clearDoubao}
            disabled={!doubaoConfigured || status === "saving" || status === "loading"}
          >
            清除凭证
          </Button>
          {doubaoSavedHint && <span className={styles.ok}>已更新</span>}
        </div>
        {doubaoError && <p className={styles.error}>{doubaoError}</p>}
      </section>

      <section className={styles.panel}>
        <h2>火山 TOS（大文件转写）</h2>
        <p className={styles.hint}>
          Access Key / Secret Key 存入本机密钥环；Region、Bucket、可选 Endpoint
          写入 SQLite。settings_get 只回传非密钥字段与 tos_configured。大文件（&gt;20
          MiB）上传后使用预签名 URL 走豆包标准异步转写。
        </p>
        <p
          className={`${styles.status} ${tosConfigured ? styles.statusOk : styles.statusWarn}`}
        >
          {tosConfigured ? "已配置 TOS" : "尚未完整配置 TOS"}
        </p>
        <div className={styles.fields}>
          <label>
            Access Key Id
            <input
              type="password"
              autoComplete="off"
              value={tosAk}
              onChange={(e) => setTosAk(e.target.value)}
              placeholder={
                tosConfigured
                  ? "留空表示不修改；填写则需同时填 Secret"
                  : "TOS Access Key Id"
              }
            />
          </label>
          <label>
            Secret Access Key
            <input
              type="password"
              autoComplete="off"
              value={tosSk}
              onChange={(e) => setTosSk(e.target.value)}
              placeholder={tosConfigured ? "留空表示不修改" : "TOS Secret Access Key"}
            />
          </label>
          <label>
            Region
            <input
              type="text"
              autoComplete="off"
              value={tosRegion}
              onChange={(e) => setTosRegion(e.target.value)}
              placeholder="例如 cn-beijing"
            />
          </label>
          <label>
            Bucket
            <input
              type="text"
              autoComplete="off"
              value={tosBucket}
              onChange={(e) => setTosBucket(e.target.value)}
              placeholder="Bucket 名称"
            />
          </label>
          <label>
            Endpoint（可选）
            <input
              type="text"
              autoComplete="off"
              value={tosEndpoint}
              onChange={(e) => setTosEndpoint(e.target.value)}
              placeholder="留空则使用 https://tos-{region}.volces.com"
            />
          </label>
        </div>
        <div className={styles.actions}>
          <Button onClick={saveTos} disabled={!canSaveTos}>
            {status === "saving" ? "保存中…" : "保存 TOS 配置"}
          </Button>
          <Button
            variant="secondary"
            onClick={clearTos}
            disabled={
              (!tosConfigured && !tosRegion && !tosBucket) ||
              status === "saving" ||
              status === "loading"
            }
          >
            清除 TOS 配置
          </Button>
          {tosSavedHint && <span className={styles.ok}>已更新</span>}
        </div>
        {tosError && <p className={styles.error}>{tosError}</p>}
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
          <Button onClick={saveDashscope} disabled={!canSaveDashscope}>
            {status === "saving" ? "保存中…" : "保存 API Key"}
          </Button>
          <Button
            variant="secondary"
            onClick={clearDashscope}
            disabled={
              !dashscopeConfigured || status === "saving" || status === "loading"
            }
          >
            清除 API Key
          </Button>
          {dashscopeSavedHint && <span className={styles.ok}>已更新</span>}
        </div>
        {dashscopeError && <p className={styles.error}>{dashscopeError}</p>}
      </section>
    </>
  );
}
