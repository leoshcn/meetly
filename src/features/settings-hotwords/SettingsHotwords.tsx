import { useCallback, useEffect, useState } from "react";
import {
  settingsGet,
  settingsUpdate,
  type AppError,
  type Settings,
} from "../../ipc";
import { friendlyErrorMessage } from "../../shared/lib";
import { Button } from "../../shared/ui";
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
          setError(friendlyErrorMessage(appErr));
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
      setError("热词不能为空");
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
      setError(friendlyErrorMessage(appErr));
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.block}>
        <h2>热词（转写）</h2>
        <p className={styles.hint}>
          热词用于提高专有名词、人名等在转写中的识别准确度，不会用于生成摘要。
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
          <Button variant="secondary" onClick={addHotword}>
            添加
          </Button>
        </div>
      </div>

      <div className={styles.block}>
        <h2>上下文（摘要）</h2>
        <p className={styles.hint}>
          上下文会在生成会议摘要时作为背景参考，例如项目背景、参会人角色等。
        </p>
        <textarea
          value={contextText}
          onChange={(e) => setContextText(e.target.value)}
          rows={6}
          placeholder="例如：本周重点讨论产品路线与招聘…"
        />
      </div>

      <div className={styles.actions}>
        <Button
          onClick={() => void save()}
          disabled={status === "saving" || status === "loading"}
        >
          {status === "saving" ? "保存中…" : "保存设置"}
        </Button>
        {savedHint && <span className={styles.ok}>已保存</span>}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
