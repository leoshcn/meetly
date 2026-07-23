export type Settings = {
  hotwords: string[];
  context_text: string;
};

export type SettingsUpdate = {
  hotwords?: string[];
  context_text?: string;
};

export type HealthResponse = {
  status: "ok" | string;
  version: string;
};
