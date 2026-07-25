import { useState } from "react";
import { HomePage } from "../pages/home";
import { SettingsPage } from "../pages/settings";
import { IconButton, SettingsGearIcon } from "../shared/ui";

type Screen = "home" | "settings";

export function AppShell() {
  const [screen, setScreen] = useState<Screen>("home");
  const [transcribing, setTranscribing] = useState(false);
  const [titleSuffix, setTitleSuffix] = useState<string | null>(null);

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          type="button"
          className="brand"
          onClick={() => setScreen("home")}
        >
          Meetly
          {screen === "home" && titleSuffix ? (
            <span className="brand-meta">· {titleSuffix}</span>
          ) : null}
        </button>
        <div className="app-header-actions">
          {screen === "settings" ? (
            <IconButton label="返回工作区" onClick={() => setScreen("home")}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M15 6 9 12l6 6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
          ) : (
            <IconButton
              label="设置"
              onClick={() => setScreen("settings")}
            >
              <SettingsGearIcon />
            </IconButton>
          )}
        </div>
        {transcribing && (
          <div className="app-progress" role="progressbar" aria-label="转写进行中">
            <div className="app-progress-bar" />
          </div>
        )}
      </header>
      <main className="app-main">
        {screen === "home" ? (
          <HomePage
            onOpenSettings={() => setScreen("settings")}
            onTranscribingChange={setTranscribing}
            onActiveTitleChange={setTitleSuffix}
          />
        ) : (
          <SettingsPage />
        )}
      </main>
    </div>
  );
}
