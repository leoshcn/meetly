import { invokeCommand } from "../client";
import type { Settings, SettingsUpdate } from "../types";

export function settingsGet(): Promise<Settings> {
  return invokeCommand<Settings>("settings_get");
}

export function settingsUpdate(update: SettingsUpdate): Promise<Settings> {
  return invokeCommand<Settings>("settings_update", { update });
}

export function settingsClearDoubaoCredentials(): Promise<Settings> {
  return invokeCommand<Settings>("settings_clear_doubao_credentials");
}
