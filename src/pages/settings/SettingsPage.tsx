import { SettingsHotwordsPanel } from "../../features/settings-hotwords";

export function SettingsPage() {
  return (
    <div>
      <h1>设置</h1>
      <p>管理转写热词与摘要上下文。更改会保存到本地 SQLite。</p>
      <SettingsHotwordsPanel />
    </div>
  );
}
