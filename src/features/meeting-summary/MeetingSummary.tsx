import { useEffect, useState } from "react";
import {
  summaryGenerate,
  summaryGet,
  type AppError,
  type Summary,
  type SummaryLanguage,
} from "../../ipc";
import { errorTitle, friendlyErrorMessage } from "../../shared/lib";
import { Button } from "../../shared/ui";
import styles from "./MeetingSummary.module.css";

type Props = {
  meetingId: string;
  summaryEpoch?: number;
  ready?: boolean;
  onOpenSettings?: () => void;
};

type SectionLabels = {
  keyPoints: string;
  actionItems: string;
  decisions: string;
  empty: string;
};

function sectionLabelsFor(language: string): SectionLabels {
  switch (language) {
    case "en":
      return {
        keyPoints: "Key Points",
        actionItems: "Action Items",
        decisions: "Decisions",
        empty: "(none)",
      };
    case "zh-en":
      return {
        keyPoints: "要点 / Key Points",
        actionItems: "待办 / Action Items",
        decisions: "决策 / Decisions",
        empty: "（暂无） / (none)",
      };
    default:
      return {
        keyPoints: "要点",
        actionItems: "待办",
        decisions: "决策",
        empty: "（暂无）",
      };
  }
}

function SummaryBlock({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className={styles.block}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className={styles.empty}>{emptyLabel}</p>
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

function formatSummaryText(summary: Summary): string {
  const labels = sectionLabelsFor(summary.language);
  const section = (title: string, items: string[]) => {
    const body =
      items.length === 0
        ? labels.empty
        : items.map((item) => `- ${item}`).join("\n");
    return `## ${title}\n\n${body}`;
  };
  return [
    section(labels.keyPoints, summary.key_points),
    section(labels.actionItems, summary.action_items),
    section(labels.decisions, summary.decisions),
  ].join("\n\n");
}

export function MeetingSummaryPanel({
  meetingId,
  summaryEpoch = 0,
  ready = false,
  onOpenSettings,
}: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [language, setLanguage] = useState<SummaryLanguage>("zh-CN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [copyHint, setCopyHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setError(null);
    setErrorCode(undefined);
    setCopyHint(null);
    (async () => {
      try {
        const existing = await summaryGet(meetingId);
        if (!cancelled) {
          setSummary(existing);
          if (
            existing.language === "zh-CN" ||
            existing.language === "en" ||
            existing.language === "zh-en"
          ) {
            setLanguage(existing.language);
          }
        }
      } catch (err) {
        const appErr = err as AppError;
        if (!cancelled && appErr.code && appErr.code !== "NOT_FOUND") {
          setError(friendlyErrorMessage(appErr));
          setErrorCode(errorTitle(appErr));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingId, summaryEpoch]);

  async function generate() {
    setBusy(true);
    setError(null);
    setErrorCode(undefined);
    setCopyHint(null);
    try {
      const result = await summaryGenerate(meetingId, language);
      setSummary(result);
    } catch (err) {
      const appErr = err as AppError;
      setError(friendlyErrorMessage(appErr));
      setErrorCode(errorTitle(appErr));
    } finally {
      setBusy(false);
    }
  }

  async function copySummary() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(formatSummaryText(summary));
      setCopyHint("已复制到剪贴板");
    } catch {
      setCopyHint("复制失败，请手动选择文本");
    }
  }

  if (!ready && !summary) {
    return (
      <section className={styles.panel}>
        <div className={styles.guide}>
          <p className={styles.guideTitle}>等待转写完成</p>
          <p className={styles.guideBody}>
            生成后会出现要点、待办与决策，方便带走会议结论。
          </p>
        </div>
      </section>
    );
  }

  const labels = summary ? sectionLabelsFor(summary.language) : null;

  return (
    <section className={styles.panel}>
      <div className={styles.actions}>
        <label className={styles.lang}>
          语言
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SummaryLanguage)}
            disabled={busy || !ready}
          >
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
            <option value="zh-en">中英文双语</option>
          </select>
        </label>
        <Button
          variant="primary"
          onClick={() => void generate()}
          disabled={busy || !ready}
        >
          {busy ? "生成中…" : summary ? "重新生成" : "生成摘要"}
        </Button>
        {summary && (
          <Button variant="secondary" onClick={() => void copySummary()}>
            一键复制
          </Button>
        )}
      </div>

      {!summary && ready && (
        <div className={styles.guide}>
          <p className={styles.guideTitle}>尚未生成摘要</p>
          <p className={styles.guideBody}>
            生成后会出现要点、待办与决策。
          </p>
        </div>
      )}

      {summary && labels && (
        <div className={styles.blocks}>
          <SummaryBlock
            title={labels.keyPoints}
            items={summary.key_points}
            emptyLabel={labels.empty}
          />
          <SummaryBlock
            title={labels.actionItems}
            items={summary.action_items}
            emptyLabel={labels.empty}
          />
          <SummaryBlock
            title={labels.decisions}
            items={summary.decisions}
            emptyLabel={labels.empty}
          />
        </div>
      )}
      {copyHint && <p className={styles.hint}>{copyHint}</p>}
      {error && (
        <div className={styles.errorBlock} role="alert" title={errorCode}>
          <p className={styles.error}>{error}</p>
          {errorCode?.includes("DASH") || error.toLowerCase().includes("dashscope") ? (
            onOpenSettings ? (
              <Button variant="secondary" onClick={onOpenSettings}>
                去设置配置 DashScope
              </Button>
            ) : null
          ) : null}
        </div>
      )}
    </section>
  );
}
