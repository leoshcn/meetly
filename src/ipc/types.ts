export type Settings = {
  hotwords: string[];
  context_text: string;
  doubao_configured: boolean;
  dashscope_configured: boolean;
  tos_configured: boolean;
  tos_region: string;
  tos_bucket: string;
  tos_endpoint: string;
};

export type SettingsUpdate = {
  hotwords?: string[];
  context_text?: string;
  /** Write-only; never returned by settings_get. */
  doubao_app_id?: string;
  /** Write-only; never returned by settings_get. */
  doubao_access_token?: string;
  /** Write-only DashScope API key; never returned by settings_get. */
  dashscope_api_key?: string;
  /** Write-only TOS Access Key Id; never returned by settings_get. */
  tos_access_key_id?: string;
  /** Write-only TOS Secret Access Key; never returned by settings_get. */
  tos_secret_access_key?: string;
  tos_region?: string;
  tos_bucket?: string;
  tos_endpoint?: string;
};

export type HealthResponse = {
  status: "ok" | string;
  version: string;
};

export type Meeting = {
  id: string;
  source_path: string;
  title: string | null;
  created_at: string;
};

export type Transcript = {
  meeting_id: string;
  text: string;
};

export type JobStatus = "running" | "succeeded" | "failed" | string;

export type Job = {
  id: string;
  meeting_id: string;
  kind: "transcription" | string;
  status: JobStatus;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type Summary = {
  meeting_id: string;
  key_points: string[];
  action_items: string[];
  decisions: string[];
  language: "zh-CN";
  created_at: string;
};
