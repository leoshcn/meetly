import { invokeCommand } from "../client";

/** Hide main window and show the recording tray icon. */
export function recordingHideToTray(): Promise<void> {
  return invokeCommand<void>("recording_hide_to_tray");
}

/** Show main window and hide the recording tray icon. */
export function recordingRestoreFromTray(): Promise<void> {
  return invokeCommand<void>("recording_restore_from_tray");
}

/** Hide tray only (main visibility unchanged). */
export function recordingHideTray(): Promise<void> {
  return invokeCommand<void>("recording_hide_tray");
}
