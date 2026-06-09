-- migrate:up

CREATE TABLE IF NOT EXISTS promptdrive_saved_prompts (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    template_id TEXT,
    pack_id TEXT,
    slot_values TEXT NOT NULL DEFAULT '{}',
    prompt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_promptdrive_saved_prompts_updated
    ON promptdrive_saved_prompts(updated_at DESC);

CREATE TABLE IF NOT EXISTS promptdrive_macros (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    steps TEXT NOT NULL DEFAULT '[]',
    risk_level TEXT NOT NULL DEFAULT 'low'
);

CREATE INDEX IF NOT EXISTS idx_promptdrive_macros_created
    ON promptdrive_macros(created_at DESC);

CREATE TABLE IF NOT EXISTS promptdrive_macro_drafts (
    id TEXT PRIMARY KEY NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    steps TEXT NOT NULL DEFAULT '[]'
);
