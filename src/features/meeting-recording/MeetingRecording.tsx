import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  jobsStartTranscription,
  meetingsCreateFromFile,
  recordListInputDevices,
  recordStart,
  recordStop,
  type AppError,
  type InputDevice,
  type Meeting,
} from "../../ipc";
import { errorTitle, friendlyErrorMessage } from "../../shared/lib";
import { Button } from "../../shared/ui";
import { RecordingWaveform } from "./RecordingWaveform";
import styles from "./MeetingRecording.module.css";

type Props = {
  onOpenSettings?: () => void;
  onMeetingCreated?: (meeting: Meeting, jobId?: string) => void;
  onBusyChange?: (busy: boolean) => void;
  onTitleResolved?: (title: string | null) => void;
  onReset?: () => void;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MeetingRecordingPanel({
  onOpenSettings,
  onMeetingCreated,
  onBusyChange,
  onTitleResolved,
  onReset,
}: Props) {
  const [devices, setDevices] = useState<InputDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [outputDeviceName, setOutputDeviceName] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    onBusyChange?.(busy || recording);
  }, [busy, recording, onBusyChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listed = await recordListInputDevices();
        if (cancelled) return;
        setDevices(listed.devices);
        const initial =
          listed.default_id ?? listed.devices[0]?.id ?? "";
        setDeviceId(initial);
      } catch (err) {
        if (!cancelled) {
          const appErr = err as AppError;
          setError(friendlyErrorMessage(appErr));
          setErrorCode(errorTitle(appErr));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
      }
    };
  }, []);

  function clearTick() {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function startTick() {
    clearTick();
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    tickRef.current = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsedMs(Date.now() - startedAtRef.current);
      }
    }, 250);
  }

  async function beginRecording() {
    setError(null);
    setErrorCode(undefined);
    setBusy(true);
    onReset?.();
    try {
      const started = await recordStart(deviceId || null);
      setDeviceName(started.device_name);
      setOutputDeviceName(started.output_device_name);
      setRecording(true);
      startTick();
    } catch (err) {
      const appErr = err as AppError;
      setError(friendlyErrorMessage(appErr));
      setErrorCode(errorTitle(appErr));
    } finally {
      setBusy(false);
    }
  }

  async function endRecording() {
    setError(null);
    setErrorCode(undefined);
    setBusy(true);
    clearTick();
    try {
      const stopped = await recordStop();
      setRecording(false);
      setDeviceName(null);
      setOutputDeviceName(null);
      const created = await meetingsCreateFromFile(stopped.path);
      onTitleResolved?.(created.title);
      const started = await jobsStartTranscription(created.id);
      onMeetingCreated?.(created, started.id);
    } catch (err) {
      const appErr = err as AppError;
      setError(friendlyErrorMessage(appErr));
      setErrorCode(errorTitle(appErr));
      setRecording(false);
      setDeviceName(null);
      setOutputDeviceName(null);
    } finally {
      setBusy(false);
    }
  }

  async function importAndTranscribe() {
    setError(null);
    setErrorCode(undefined);
    setBusy(true);
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
      onTitleResolved?.(created.title);
      const started = await jobsStartTranscription(created.id);
      onMeetingCreated?.(created, started.id);
    } catch (err) {
      const appErr = err as AppError;
      setError(friendlyErrorMessage(appErr));
      setErrorCode(errorTitle(appErr));
    } finally {
      setBusy(false);
    }
  }

  const needsSettingsHint =
    errorCode === "TOS_NOT_CONFIGURED" ||
    errorCode === "RECORD_DEVICE_ERROR" ||
    errorCode === "IO_ERROR";

  if (recording) {
    return (
      <section className={styles.stage}>
        <p className={styles.brand}>Meetly</p>
        <h1 className={styles.stageTitle}>正在录音</h1>
        <p className={styles.timer} aria-live="polite">
          {formatElapsed(elapsedMs)}
        </p>
        <RecordingWaveform active={recording} />
        {deviceName && (
          <p className={styles.deviceLive}>麦克风：{deviceName}</p>
        )}
        {outputDeviceName && (
          <p className={styles.deviceLive}>系统声音：{outputDeviceName}</p>
        )}
        <div className={styles.stageActions}>
          <Button
            variant="primary"
            onClick={() => void endRecording()}
            disabled={busy}
          >
            {busy ? "正在导出…" : "停止并转写"}
          </Button>
        </div>
        {error && (
          <div className={styles.errorBlock} role="alert" title={errorCode}>
            <p className={styles.error}>{error}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={styles.stage}>
      <p className={styles.brand}>Meetly</p>
      <h1 className={styles.stageTitle}>把会议录音变成可带走的纪要</h1>
      <p className={styles.stageLead}>
        开始录音将同时捕获麦克风与系统扬声器（会议对方声音），或导入本地音频，自动转写并整理纪要。
      </p>

      <label className={styles.deviceField}>
        麦克风
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          disabled={busy || devices.length === 0}
        >
          {devices.length === 0 ? (
            <option value="">无可用设备</option>
          ) : (
            devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.is_default ? "（默认）" : ""}
              </option>
            ))
          )}
        </select>
      </label>

      <div className={styles.stageActions}>
        <Button
          variant="primary"
          onClick={() => void beginRecording()}
          disabled={busy || !deviceId}
        >
          开始录音
        </Button>
        <Button
          variant="secondary"
          onClick={() => void importAndTranscribe()}
          disabled={busy || recording}
        >
          导入音频并转写
        </Button>
      </div>

      <p className={styles.stageHint}>
        系统声音来自默认播放设备 · ≤20 MiB 极速转写 · 更大文件需配置 TOS
      </p>

      {error && (
        <div className={styles.errorBlock} role="alert" title={errorCode}>
          <p className={styles.error}>{error}</p>
          {needsSettingsHint && onOpenSettings && (
            <Button variant="secondary" onClick={onOpenSettings}>
              去设置
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
