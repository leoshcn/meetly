export { invokeCommand, normalizeError, isAppError } from "./client";
export type { AppError } from "./client";
export type { Settings, SettingsUpdate, HealthResponse } from "./types";
export { settingsGet, settingsUpdate } from "./commands/settings";
export { appHealth } from "./commands/health";
