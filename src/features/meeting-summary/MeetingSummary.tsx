import { useEffect, useState } from "react";
import {
  summaryGenerate,
  summaryGet,
  type AppError,
  type Summary,
} from "../../ipc";
import styles from "./MeetingSummary.module.css";

type Props = {
  meetingId: string;
};

function SummaryBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.block}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className={styles.empty}>（暂无）</p>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MeetingSummaryPanel({ meetingId }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setError(null);
    (async () => {
      try {
        const existing = await summaryGet(meetingId);
        if (!cancelled) {
          setSummary(existing);
        }
      } catch (err) {
        const appErr = err as AppError;
        // No saved summary yet is fine; surface other failures.
        if (!cancelled && appErr.code && appErr.code !== "NOT_FOUND") {
          setError(`${appErr.code}: ${appErr.message}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const result = await summaryGenerate(meetingId);
      setSummary(result);
    } catch (err) {
      const appErr = err as AppError;
      setError(
        appErr.code
          ? `${appErr.code}: ${appErr.message}`
          : (appErr.message ?? "生成摘要失败"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.actions}>
        <button type="button" onClick={generate} disabled={busy}>
          {busy ? "生成中…" : "生成摘要"}
        </button>
      </div>
      {summary && (
        <div className={styles.blocks}>
          <SummaryBlock title="要点" items={summary.key_points} />
          <SummaryBlock title="待办" items={summary.action_items} />
          <SummaryBlock title="决策" items={summary.decisions} />
        </div>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
