import React from "react";
import ReactDOM from "react-dom/client";
import { AppShell } from "./app";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
);
