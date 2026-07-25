import { SettingsHotwordsPanel } from "../../features/settings-hotwords";
import { SettingsCredentialsPanel } from "../../features/settings-credentials";
import { SettingsRecordingPanel } from "../../features/settings-recording";
import { SettingsFfmpegPanel } from "../../features/settings-ffmpeg";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  return (
    <div className={`${styles.page} meetly-fade-up`}>
      <header className={styles.header}>
        <h1>设置</h1>
        <p>
          管理转写与摘要所需的凭证、热词与上下文，以及录音保存位置与 FFmpeg
          编码器。密钥保存在本机密钥环，不会写入 SQLite。
        </p>
      </header>
      <div className={styles.stack}>
        <SettingsCredentialsPanel />
        <SettingsHotwordsPanel />
        <SettingsRecordingPanel />
        <SettingsFfmpegPanel />
      </div>
    </div>
  );
}
