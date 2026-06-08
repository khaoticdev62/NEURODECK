-- migrate:up
-- NEURODECK v0.3.0 — Context Packs, Privacy Levels

-- Context packs: named collections of memory records for scoped RAG injection
CREATE TABLE IF NOT EXISTS context_packs (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT DEFAULT '#10b981',
    privacy_level TEXT DEFAULT 'standard',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Associate memory records with a context pack
ALTER TABLE memory_records ADD COLUMN pack_id TEXT;
CREATE INDEX IF NOT EXISTS idx_memory_pack ON memory_records(pack_id, created_at);

-- Privacy levels for memory records and projects
ALTER TABLE memory_records ADD COLUMN privacy_level TEXT DEFAULT 'standard';
ALTER TABLE projects ADD COLUMN privacy_level TEXT DEFAULT 'standard';

-- Index for fast privacy-filtered queries
CREATE INDEX IF NOT EXISTS idx_memory_privacy ON memory_records(privacy_level, created_at);
