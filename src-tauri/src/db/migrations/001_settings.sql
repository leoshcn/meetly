CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hotwords TEXT NOT NULL DEFAULT '[]',
    context_text TEXT NOT NULL DEFAULT ''
);
