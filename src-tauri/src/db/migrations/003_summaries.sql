CREATE TABLE IF NOT EXISTS summaries (
    meeting_id TEXT PRIMARY KEY NOT NULL REFERENCES meetings(id),
    key_points TEXT NOT NULL,
    action_items TEXT NOT NULL,
    decisions TEXT NOT NULL,
    language TEXT NOT NULL,
    created_at TEXT NOT NULL
);
