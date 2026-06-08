-- migrate:up
-- NEURODECK v0.3.0 — Project Knowledge Spaces & Universal Search

-- Projects: named knowledge workspaces
CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT DEFAULT '#3b82f6',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Associate sessions with a project (nullable, no FK via ALTER for compatibility)
ALTER TABLE sessions ADD COLUMN project_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id, created_at);

-- Associate memory records with a project (nullable)
ALTER TABLE memory_records ADD COLUMN project_id TEXT;
CREATE INDEX IF NOT EXISTS idx_memory_project ON memory_records(project_id, created_at);

-- FTS5 triggers: keep search_index in sync with messages
CREATE TRIGGER IF NOT EXISTS trig_messages_insert AFTER INSERT ON messages
BEGIN
    INSERT INTO search_index(content, source_table, source_id)
    VALUES (NEW.content, 'messages', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS trig_messages_update AFTER UPDATE OF content ON messages
BEGIN
    UPDATE search_index SET content = NEW.content
    WHERE source_table = 'messages' AND source_id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trig_messages_delete AFTER DELETE ON messages
BEGIN
    DELETE FROM search_index WHERE source_table = 'messages' AND source_id = OLD.id;
END;

-- FTS5 triggers: keep search_index in sync with memory_records
CREATE TRIGGER IF NOT EXISTS trig_memory_insert AFTER INSERT ON memory_records
BEGIN
    INSERT INTO search_index(content, source_table, source_id)
    VALUES (NEW.content, 'memory_records', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS trig_memory_update AFTER UPDATE OF content ON memory_records
BEGIN
    UPDATE search_index SET content = NEW.content
    WHERE source_table = 'memory_records' AND source_id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trig_memory_delete AFTER DELETE ON memory_records
BEGIN
    DELETE FROM search_index WHERE source_table = 'memory_records' AND source_id = OLD.id;
END;

-- FTS5 triggers: keep search_index in sync with projects
CREATE TRIGGER IF NOT EXISTS trig_projects_insert AFTER INSERT ON projects
BEGIN
    INSERT INTO search_index(content, source_table, source_id)
    VALUES (NEW.name || ' ' || COALESCE(NEW.description, ''), 'projects', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS trig_projects_update AFTER UPDATE OF name, description ON projects
BEGIN
    UPDATE search_index SET content = NEW.name || ' ' || COALESCE(NEW.description, '')
    WHERE source_table = 'projects' AND source_id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trig_projects_delete AFTER DELETE ON projects
BEGIN
    DELETE FROM search_index WHERE source_table = 'projects' AND source_id = OLD.id;
END;

-- Initial backfill of search_index from existing data
INSERT OR IGNORE INTO search_index(content, source_table, source_id)
SELECT content, 'messages', id FROM messages;

INSERT OR IGNORE INTO search_index(content, source_table, source_id)
SELECT content, 'memory_records', id FROM memory_records;
