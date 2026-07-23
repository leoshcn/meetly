import { useState } from "react";
import { HomePage } from "../pages/home";
import { SettingsPage } from "../pages/settings";

type Screen = "home" | "settings";

export function AppShell() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          type="button"
          className="brand"
          onClick={() => setScreen("home")}
        >
          Meetly
        </button>
        <nav>
          <button
            type="button"
            className={screen === "home" ? "active" : undefined}
            onClick={() => setScreen("home")}
          >
            首页
          </button>
          <button
            type="button"
            className={screen === "settings" ? "active" : undefined}
            onClick={() => setScreen("settings")}
          >
            设置
          </button>
        </nav>
      </header>
      <main className="app-main">
        {screen === "home" ? (
          <HomePage onOpenSettings={() => setScreen("settings")} />
        ) : (
          <SettingsPage />
        )}
      </main>
    </div>
  );
}
