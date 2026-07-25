import { useCallback, useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  settingsGet,
  settingsUpdate,
  type AppError,
} from "../../ipc";
import { friendlyErrorMessage } from "../../shared/lib";
import { Button } from "../../shared/ui";
import styles from "./SettingsRecording.module.css";

export function SettingsRecordingPanel() {
  const [recordingDir, setRecordingDir] = useState("");
  const [resolvedDir, setResolvedDir] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState(false);

  const refresh = useCallback(async () => {
    const settings = await settingsGet();
    setRecordingDir(settings.recording_dir);
    setResolvedDir(settings.recording_dir_resolved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
        if (!cancelled) setStatus("idle");
      } catch (err) {
        if (!cancelled) {
          setError(friendlyErrorMessage(err as AppError));
          setStatus("idle");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function browse() {
    setError(null);
    setSavedHint(false);
    try {
      const selected = await open({
        multiple: false,
        directory: true,
      });
      if (selected === null) return;
      const path = Array.isArray(selected) ? selected[0] : selected;
      setRecordingDir(path);
    } catch (err) {
      setError(friendlyErrorMessage(err as AppError));
    }
  }

  async function save() {
    setStatus("saving");
    setError(null);
    setSavedHint(false);
    try {
      const settings = await settingsUpdate({
        recording_dir: recordingDir.trim(),
      });
      setRecordingDir(settings.recording_dir);
      setResolvedDir(settings.recording_dir_resolved);
      setSavedHint(true);
    } catch (err) {
      setError(friendlyErrorMessage(err as AppError));
    } finally {
      setStatus("idle");
    }
  }

  async function resetDefault() {
    setStatus("saving");
    setError(null);
    setSavedHint(false);
    try {
      const settings = await settingsUpdate({ recording_dir: "" });
      setRecordingDir(settings.recording_dir);
      setResolvedDir(settings.recording_dir_resolved);
      setSavedHint(true);
    } catch (err) {
      setError(friendlyErrorMessage(err as AppError));
    } finally {
      setStatus("idle");
    }
  }

  const busy = status === "loading" || status === "saving";

  return (
    <section className={styles.panel}>
      <h2>录音保存位置</h2>
      <p className={styles.hint}>
        会议录音会写入此文件夹。留空则使用默认路径（用户文档下的
        Meetly/Recordings）。
      </p>
      <p className={styles.status}>
        当前生效：
        <span className={styles.path}>{resolvedDir || "…"}</span>
      </p>
      <div className={styles.fields}>
        <label>
          自定义目录
          <input
            value={recordingDir}
            onChange={(e) => {
              setRecordingDir(e.target.value);
              setSavedHint(false);
            }}
            placeholder="留空 = 使用默认目录"
            disabled={busy}
          />
        </label>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => void browse()} disabled={busy}>
          浏览…
        </Button>
        <Button variant="primary" onClick={() => void save()} disabled={busy}>
          {status === "saving" ? "保存中…" : "保存"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => void resetDefault()}
          disabled={busy || recordingDir === ""}
        >
          恢复默认
        </Button>
        {savedHint && <span className={styles.ok}>已保存</span>}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
