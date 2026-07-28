import { useState } from "react";
import { useTheme } from "../../app/ThemeProvider";
import {
  type AppError,
  type ThemePreference,
} from "../../ipc";
import { friendlyErrorMessage } from "../../shared/lib";
import styles from "./SettingsAppearance.module.css";

const OPTIONS: { id: ThemePreference; label: string; hint: string }[] = [
  {
    id: "system",
    label: "跟随系统",
    hint: "与操作系统浅色 / 深色外观保持一致",
  },
  {
    id: "light",
    label: "浅色",
    hint: "始终使用浅色界面",
  },
  {
    id: "dark",
    label: "深色",
    hint: "始终使用深色界面",
  },
];

export function SettingsAppearancePanel() {
  const { preference, setPreference, ready } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSelect(next: ThemePreference) {
    if (next === preference || busy) return;
    setBusy(true);
    setError(null);
    try {
      await setPreference(next);
    } catch (err) {
      setError(friendlyErrorMessage(err as AppError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <h2>显示模式</h2>
      <p className={styles.hint}>
        选择浅色、深色，或跟随系统。偏好保存在本机设置中。
      </p>
      <div
        className={styles.segment}
        role="radiogroup"
        aria-label="显示模式"
        aria-busy={!ready || busy}
      >
        {OPTIONS.map((opt) => {
          const selected = preference === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={selected ? styles.optionActive : styles.option}
              disabled={!ready || busy}
              onClick={() => onSelect(opt.id)}
              title={opt.hint}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className={styles.currentHint}>
        {OPTIONS.find((o) => o.id === preference)?.hint}
      </p>
      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
