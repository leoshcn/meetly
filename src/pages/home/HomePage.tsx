import { useEffect, useState } from "react";
import { appHealth, type AppError, type HealthResponse } from "../../ipc";

type Props = {
  onOpenSettings: () => void;
};

export function HomePage({ onOpenSettings }: Props) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await appHealth();
        if (!cancelled) {
          setHealth(result);
        }
      } catch (err) {
        if (!cancelled) {
          const appErr = err as AppError;
          setError(appErr.message ?? "Health check failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1>Meetly</h1>
      <p>本地会议助手骨架：设置热词与上下文，后续接入转写与摘要。</p>
      {health && (
        <p>
          状态：{health.status} · 版本 {health.version}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onOpenSettings}>
        打开设置
      </button>
    </div>
  );
}
