import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppShell, ThemeProvider } from "./app";
import { RecorderWidget } from "./features/recorder-widget";
import { bootstrapThemeFromCache } from "./shared/lib";
import "./styles/global.css";

const currentWindow = getCurrentWindow();
const windowLabel = currentWindow.label;
const isRecorderWidget = windowLabel === "recorder-widget";

// Class must exist before theme bootstrap so color-scheme stays "normal".
if (isRecorderWidget) {
  document.documentElement.classList.add("recorder-widget-shell");
  void currentWindow
    .setBackgroundColor({ red: 0, green: 0, blue: 0, alpha: 0 })
    .catch(() => {
      // Best-effort; tauri.conf backgroundColor is the primary path.
    });
}

bootstrapThemeFromCache();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      {isRecorderWidget ? <RecorderWidget /> : <AppShell />}
    </ThemeProvider>
  </React.StrictMode>,
);
