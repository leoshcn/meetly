import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  ffmpegDownload,
  ffmpegStatus,
  type AppError,
  type FfmpegProgressEvent,
  type FfmpegStatus,
} from "../../ipc";
import { friendlyErrorMessage } from "../../shared/lib";
import { Button } from "../../shared/ui";
import styles from "./SettingsFfmpeg.module.css";

function formatBytes(n: number): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function phaseLabel(phase: string, installed: boolean): string {
  switch (phase) {
    case "ready":
      return "已就绪";
    case "missing":
      return "未安装";
    case "starting":
      return "准备下载…";
    case "downloading":
      return "下载中…";
    case "unpacking":
      return "正在解压…";
    case "error":
      return "出错";
    default:
      return installed ? "已就绪" : phase;
  }
}

export function SettingsFfmpegPanel() {
  const [info, setInfo] = useState<FfmpegStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((next: FfmpegStatus) => {
    setInfo(next);
  }, []);

  const refresh = useCallback(async () => {
    const status = await ffmpegStatus();
    apply(status);
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        await refresh();
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(friendlyErrorMessage(err as AppError));
          setLoading(false);
        }
      }
    })();

    void listen<FfmpegProgressEvent>("ffmpeg-progress", (event) => {
      setInfo((prev) => ({
        installed: event.payload.installed,
        busy:
          event.payload.phase === "starting" ||
          event.payload.phase === "downloading" ||
          event.payload.phase === "unpacking",
        phase: event.payload.phase,
        downloaded_bytes: event.payload.downloaded_bytes,
        total_bytes: event.payload.total_bytes,
        path: prev?.path ?? null,
        message: event.payload.message,
      }));
      if (event.payload.phase === "ready" || event.payload.phase === "error") {
        void refresh().catch(() => {
          /* keep event snapshot */
        });
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [refresh]);

  async function download() {
    setError(null);
    try {
      const started = await ffmpegDownload();
      apply(started);
    } catch (err) {
      setError(friendlyErrorMessage(err as AppError));
    }
  }

  const busy = info?.busy ?? false;
  const installed = info?.installed ?? false;
  const total = info?.total_bytes ?? 0;
  const done = info?.downloaded_bytes ?? 0;
  const percent =
    total > 0 ? Math.min(100, Math.round((done / total) * 100)) : busy ? null : installed ? 100 : 0;

  return (
    <section className={styles.panel}>
      <h2>FFmpeg（M4A 编码）</h2>
      <p className={styles.hint}>
        用于将录音压缩为更小的 M4A 文件。若安装包未内置，首次下载约 80–100 MB；未安装时录音仍可保存为
        WAV 并正常转写。
      </p>

      <p className={styles.status}>
        状态：
        <span
          className={
            installed ? styles.statusOk : info?.phase === "error" ? styles.statusErr : styles.statusWarn
          }
        >
          {loading
            ? "检查中…"
            : phaseLabel(info?.phase ?? "missing", installed)}
        </span>
      </p>

      {info?.path && (
        <p className={styles.pathLine}>
          路径：<span className={styles.path}>{info.path}</span>
        </p>
      )}

      {info?.message && <p className={styles.message}>{info.message}</p>}

      {(busy || (total > 0 && !installed)) && (
        <div className={styles.progressBlock}>
          <div className={styles.progressTrack} aria-hidden>
            <div
              className={styles.progressFill}
              style={{ width: `${percent ?? 8}%` }}
            />
          </div>
          <p className={styles.progressMeta}>
            {formatBytes(done)}
            {total > 0 ? ` / ${formatBytes(total)}` : ""}
            {percent !== null ? ` · ${percent}%` : busy ? " · 连接中…" : ""}
          </p>
        </div>
      )}

      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={() => void download()}
          disabled={loading || busy || installed}
        >
          {busy ? "下载中…" : installed ? "已安装" : "下载 FFmpeg"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => void refresh().catch((err) => setError(friendlyErrorMessage(err as AppError)))}
          disabled={loading}
        >
          刷新状态
        </Button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
