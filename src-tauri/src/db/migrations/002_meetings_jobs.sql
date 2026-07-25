CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY NOT NULL,
    source_path TEXT NOT NULL,
    title TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY NOT NULL,
    meeting_id TEXT NOT NULL REFERENCES meetings(id),
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    provider_task_id TEXT,
    error_code TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_meeting_id ON jobs(meeting_id);

CREATE TABLE IF NOT EXISTS transcripts (
    meeting_id TEXT PRIMARY KEY NOT NULL REFERENCES meetings(id),
    text TEXT NOT NULL,
    raw_json TEXT
);
