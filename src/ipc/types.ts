export type Settings = {
  hotwords: string[];
  context_text: string;
  doubao_configured: boolean;
};

export type SettingsUpdate = {
  hotwords?: string[];
  context_text?: string;
  /** Write-only; never returned by settings_get. */
  doubao_app_id?: string;
  /** Write-only; never returned by settings_get. */
  doubao_access_token?: string;
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
