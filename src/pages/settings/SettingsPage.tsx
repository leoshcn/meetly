import { SettingsHotwordsPanel } from "../../features/settings-hotwords";
import { SettingsCredentialsPanel } from "../../features/settings-credentials";

export function SettingsPage() {
  return (
    <div>
      <h1>设置</h1>
      <p>
        管理豆包凭证、DashScope API Key、转写热词与摘要上下文。凭证存本机密钥库；热词/上下文存本地
        SQLite。
      </p>
      <SettingsCredentialsPanel />
      <SettingsHotwordsPanel />
    </div>
  );
}
