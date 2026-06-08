-- migrate:up
-- NEURODECK 1.0 Foundation Schema

-- Sessions: chat conversation containers
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    model       TEXT,
    provider    TEXT
);

-- Messages: individual chat turns within a session
CREATE TABLE IF NOT EXISTS messages (
    id          TEXT PRIMARY KEY NOT NULL,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK(role IN ('user','assistant','system','tool')),
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    metadata    TEXT -- JSON blob for tokens, latency, etc.
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);

-- Config: key/value application settings
CREATE TABLE IF NOT EXISTS config (
    key         TEXT PRIMARY KEY NOT NULL,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Memory records: vector memory entries (RAG source)
CREATE TABLE IF NOT EXISTS memory_records (
    id          TEXT PRIMARY KEY NOT NULL,
    namespace   TEXT NOT NULL DEFAULT 'default',
    content     TEXT NOT NULL,
    embedding   BLOB,             -- raw f32 vector bytes
    metadata    TEXT,             -- JSON blob
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    pinned      INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory_records(namespace, created_at);

-- Memory backups: automatic snapshot tracking
CREATE TABLE IF NOT EXISTS memory_backups (
    id          TEXT PRIMARY KEY NOT NULL,
    path        TEXT NOT NULL,
    record_count INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- FTS virtual table for universal search over memory + messages
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    content,
    source_table,   -- 'messages' or 'memory_records'
    source_id,      -- row id in source table
    tokenize = 'porter'
);

-- Session export log
CREATE TABLE IF NOT EXISTS exports (
    id          TEXT PRIMARY KEY NOT NULL,
    session_id  TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    format      TEXT NOT NULL,
    path        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
