import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  jobsGet,
  jobsStartTranscription,
  meetingsCreateFromFile,
  meetingsGetTranscript,
  type AppError,
  type Job,
  type Meeting,
} from "../../ipc";
import styles from "./TranscriptionImport.module.css";

const POLL_MS = 1000;

type Props = {
  onTranscriptReady?: (meetingId: string) => void;
  onReset?: () => void;
};

export function TranscriptionImportPanel({
  onTranscriptReady,
  onReset,
}: Props) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  function stopPolling() {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(jobId: string, meetingId: string) {
    stopPolling();
    pollRef.current = window.setInterval(async () => {
      try {
        const next = await jobsGet(jobId);
        setJob(next);
        if (next.status === "succeeded") {
          stopPolling();
          const t = await meetingsGetTranscript(meetingId);
          setTranscript(t.text);
          setBusy(false);
          onTranscriptReady?.(meetingId);
        } else if (next.status === "failed") {
          stopPolling();
          setError(
            next.error_message
              ? `${next.error_code ?? "ERROR"}: ${next.error_message}`
              : next.error_code ?? "Transcription failed",
          );
          setBusy(false);
        }
      } catch (err) {
        stopPolling();
        const appErr = err as AppError;
        setError(appErr.message ?? "Failed to poll job");
        setBusy(false);
      }
    }, POLL_MS);
  }

  async function importAndTranscribe() {
    setError(null);
    setTranscript(null);
    setJob(null);
    setMeeting(null);
    setBusy(true);
    stopPolling();
    onReset?.();

    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Audio",
            extensions: ["wav", "mp3", "m4a", "flac", "ogg", "aac"],
          },
        ],
      });

      if (selected === null) {
        setBusy(false);
        return;
      }

      const path = Array.isArray(selected) ? selected[0] : selected;
      const created = await meetingsCreateFromFile(path);
      setMeeting(created);
      const started = await jobsStartTranscription(created.id);
      setJob(started);
      startPolling(started.id, created.id);
    } catch (err) {
      const appErr = err as AppError;
      setError(
        appErr.code
          ? `${appErr.code}: ${appErr.message}`
          : (appErr.message ?? "Import failed"),
      );
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <p className={styles.hint}>
        导入本地音频并调用豆包极速版转写（单文件上限 20 MiB）。热词会注入 ASR；摘要上下文不会发送给转写。
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={importAndTranscribe} disabled={busy}>
          {busy ? "转写中…" : "导入音频并转写"}
        </button>
      </div>
      {meeting && (
        <p className={styles.meta}>
          会议：{meeting.title ?? meeting.id}
          <br />
          文件：{meeting.source_path}
        </p>
      )}
      {job && (
        <p className={styles.status}>
          任务状态：{job.status}
          {job.error_code ? ` (${job.error_code})` : ""}
        </p>
      )}
      {transcript !== null && (
        <pre className={styles.transcript}>{transcript || "（空转写结果）"}</pre>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
