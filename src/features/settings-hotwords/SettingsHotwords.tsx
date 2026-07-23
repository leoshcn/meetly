import { useCallback, useEffect, useState } from "react";
import {
  settingsGet,
  settingsUpdate,
  type AppError,
  type Settings,
} from "../../ipc";
import { HotwordList } from "./HotwordList";
import styles from "./SettingsHotwords.module.css";

export function SettingsHotwordsPanel() {
  const [hotwords, setHotwords] = useState<string[]>([]);
  const [contextText, setContextText] = useState("");
  const [draftWord, setDraftWord] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState(false);

  const applySettings = useCallback((settings: Settings) => {
    setHotwords(settings.hotwords);
    setContextText(settings.context_text);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await settingsGet();
        if (!cancelled) {
          applySettings(settings);
          setStatus("idle");
        }
      } catch (err) {
        if (!cancelled) {
          const appErr = err as AppError;
          setError(appErr.message ?? "Failed to load settings");
          setStatus("idle");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySettings]);

  function addHotword() {
    const trimmed = draftWord.trim();
    if (!trimmed) {
      setError("Hotwords cannot be empty");
      return;
    }
    setHotwords((prev) => [...prev, trimmed]);
    setDraftWord("");
    setError(null);
  }

  function removeHotword(index: number) {
    setHotwords((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setStatus("saving");
    setError(null);
    setSavedHint(false);
    try {
      const settings = await settingsUpdate({
        hotwords,
        context_text: contextText,
      });
      applySettings(settings);
      setSavedHint(true);
    } catch (err) {
      const appErr = err as AppError;
      setError(appErr.message ?? "Save failed");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.block}>
        <h2>热词（转写）</h2>
        <p className={styles.hint}>
          热词仅用于语音转写（ASR），不会发送给摘要模型。
        </p>
        <HotwordList words={hotwords} onRemove={removeHotword} />
        <div className={styles.row}>
          <input
            value={draftWord}
            onChange={(e) => setDraftWord(e.target.value)}
            placeholder="添加热词…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addHotword();
              }
            }}
          />
          <button type="button" onClick={addHotword}>
            添加
          </button>
        </div>
      </div>

      <div className={styles.block}>
        <h2>上下文（摘要）</h2>
        <p className={styles.hint}>
          上下文仅用于会议摘要生成，默认不会发送给转写服务。
        </p>
        <textarea
          value={contextText}
          onChange={(e) => setContextText(e.target.value)}
          rows={6}
          placeholder="例如：本周重点讨论产品路线与招聘…"
        />
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={save} disabled={status === "saving" || status === "loading"}>
          {status === "saving" ? "保存中…" : "保存设置"}
        </button>
        {savedHint && <span className={styles.ok}>已保存</span>}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
