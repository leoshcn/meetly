import { useState } from "react";
import {
  AppUpdateProvider,
  UpdateBanner,
  useAppUpdate,
} from "../features/app-update";
import { HomePage } from "../pages/home";
import { SettingsPage, type SettingsTab } from "../pages/settings";
import { IconButton, SettingsGearIcon } from "../shared/ui";

type Screen = "home" | "settings";

function SettingsGearWithBadge() {
  const { badgeVisible } = useAppUpdate();
  return (
    <span className="app-header-icon-wrap">
      <SettingsGearIcon />
      {badgeVisible ? (
        <span className="app-header-badge" aria-hidden="true" />
      ) : null}
    </span>
  );
}

function AppShellChrome({
  screen,
  setScreen,
  settingsTab,
  setSettingsTab,
  workspaceBusy,
  setWorkspaceBusy,
  titleSuffix,
  setTitleSuffix,
}: {
  screen: Screen;
  setScreen: (s: Screen) => void;
  settingsTab: SettingsTab;
  setSettingsTab: (t: SettingsTab) => void;
  workspaceBusy: boolean;
  setWorkspaceBusy: (b: boolean) => void;
  titleSuffix: string | null;
  setTitleSuffix: (t: string | null) => void;
}) {
  function openAbout() {
    setSettingsTab("about");
    setScreen("settings");
  }

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
              onClick={() => {
                setSettingsTab("credentials");
                setScreen("settings");
              }}
            >
              <SettingsGearWithBadge />
            </IconButton>
          )}
        </div>
        {workspaceBusy && (
          <div className="app-progress" role="progressbar" aria-label="工作进行中">
            <div className="app-progress-bar" />
          </div>
        )}
      </header>
      <UpdateBanner onOpenAbout={openAbout} />
      <main className="app-main">
        {screen === "settings" ? (
          <SettingsPage key={settingsTab} initialTab={settingsTab} />
        ) : (
          <HomePage
            onOpenSettings={() => {
              setSettingsTab("credentials");
              setScreen("settings");
            }}
            onTranscribingChange={setWorkspaceBusy}
            onActiveTitleChange={setTitleSuffix}
          />
        )}
      </main>
    </div>
  );
}

export function AppShell() {
  const [screen, setScreen] = useState<Screen>("home");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("credentials");
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [titleSuffix, setTitleSuffix] = useState<string | null>(null);

  return (
    <AppUpdateProvider appBusy={workspaceBusy}>
      <AppShellChrome
        screen={screen}
        setScreen={setScreen}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        workspaceBusy={workspaceBusy}
        setWorkspaceBusy={setWorkspaceBusy}
        titleSuffix={titleSuffix}
        setTitleSuffix={setTitleSuffix}
      />
    </AppUpdateProvider>
  );
}
