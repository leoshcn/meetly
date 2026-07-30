export { friendlyErrorMessage, errorTitle } from "./formatError";
export {
  clearWidgetPosition,
  formatRecordingElapsed,
  hideRecorderWidget,
  showRecorderWidget,
} from "./recorderWidget";
export {
  hideMainToTray,
  hideRecordingTray,
  restoreMainFromTray,
} from "./recordingTray";
export {
  applyResolvedTheme,
  bootstrapThemeFromCache,
  parseThemePreference,
  readCachedThemePreference,
  resolveTheme,
  systemPrefersDark,
  writeCachedThemePreference,
} from "./theme";
export type { ResolvedTheme } from "./theme";
