import React from "react";
import ReactDOM from "react-dom/client";
import { AppShell, ThemeProvider } from "./app";
import { bootstrapThemeFromCache } from "./shared/lib";
import "./styles/global.css";

bootstrapThemeFromCache();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  </React.StrictMode>,
);
