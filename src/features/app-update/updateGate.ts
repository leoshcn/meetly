export type UpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "readyToInstall"
  | "installing"
  | "upToDate"
  | "error";

export function canInstallUpdate(
  appBusy: boolean,
  phase: UpdatePhase,
): boolean {
  if (appBusy) return false;
  return phase === "readyToInstall" || phase === "available";
}

export function shouldShowUpdateBanner(
  phase: UpdatePhase,
  sessionDismissed: boolean,
): boolean {
  if (sessionDismissed) return false;
  return (
    phase === "available" ||
    phase === "downloading" ||
    phase === "readyToInstall" ||
    phase === "installing"
  );
}

export function downloadProgressPercent(
  downloaded: number,
  contentLength: number | null,
): number | null {
  if (!contentLength || contentLength <= 0) return null;
  return Math.min(100, Math.round((downloaded / contentLength) * 100));
}
