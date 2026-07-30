import {
  recordingHideToTray,
  recordingHideTray,
  recordingRestoreFromTray,
} from "../../ipc";

/** Hide main window and show the recording tray icon. */
export async function hideMainToTray(): Promise<void> {
  await recordingHideToTray();
}

/** Show main window and hide the recording tray icon. */
export async function restoreMainFromTray(): Promise<void> {
  await recordingRestoreFromTray();
}

/** Hide tray only (main visibility unchanged). */
export async function hideRecordingTray(): Promise<void> {
  await recordingHideTray();
}
