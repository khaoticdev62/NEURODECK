# Epic: Project Knowledge Spaces & Universal Search

## Objective

Continue the Intelligence Layer (v0.3.0) by introducing **Project Knowledge Spaces** for organizing sessions and memory into named workspaces, and **Universal Search** via FTS5 for fast full-text discovery across all local data.

## Background

After the Memory System SQLite migration (Epic 3.1 / chapter 81), memory records and sessions are persisted in SQLite but lack organizational structure. Users need a way to group related conversations and memories into projects, and to search across all their data with keyword queries.

## Implementation Status

### Story 1: Database Schema & Migrations ✅
- Migration `002_project_knowledge.sql` adds:
  - `projects` table
  - `project_id` column to `sessions` and `memory_records`
  - FTS5 triggers to keep `search_index` in sync with messages, memory, and projects
  - Initial backfill of existing data into `search_index`

### Story 2: Backend — Project Knowledge Spaces API ✅
- New module `src-tauri/src/projects.rs`:
  - `Project` struct and `ProjectDB` with CRUD operations
  - `set_session_project`, `set_memory_project`
  - `get_project_sessions`, `get_project_memory`
- Bridge commands added to `commands/mod.rs`:
  - `create_project`, `list_projects`, `get_project`, `update_project`, `delete_project`
  - `set_session_project`, `set_memory_project`
  - `get_project_sessions`, `get_project_memory`

### Story 3: Backend — Universal Search Engine ✅
- New module `src-tauri/src/search.rs`:
  - `SearchEngine` with `universal_search()` method
  - FTS5 MATCH queries across messages, memory, and projects
  - Result categorization and snippet highlighting
- Bridge command: `universal_search`

### Story 4: Frontend — Project Management in Memory Tab ✅
- Projects sidebar added to Memory tab (`frontend/index.html`)
- Project list, creation, and filtering in `frontend/src/memory.js`
- Project assignment dropdown on each memory record card
- CSS styling for sidebar and select elements

### Story 5: Frontend — Universal Search in Command Palette ✅
- Enhanced Ctrl+K Command Palette with universal search fallback
- Debounced search triggers after 150ms for queries ≥2 characters
- Search results displayed as "Search Results" group in palette
- Results navigate to appropriate views on activation

### Story 6: QA, Polish & Documentation ✅
- `cargo test --lib`: 78 tests pass (including new project and search tests)
- `cargo check`: clean (no new errors)
- `npm run build`: frontend builds successfully
- AGENTS.md updated with new commands
- Epic doc created (this file)

## Technical Decisions

- **No `Mutex<SqlitePool>`**: `std::sync::MutexGuard` is not `Send`, so holding it across `.await` points would break axum handler compatibility. `SqlitePool` is already `Clone` and thread-safe, so `Arc<SqlitePool>` is used instead.
- **FTS5 triggers**: SQLite triggers keep `search_index` automatically synchronized with source tables, avoiding application-level sync bugs.
- **Project sidebar in Memory tab**: Rather than adding a 13th primary tab, projects are integrated into the existing Memory view for discoverability.
- **Search in Command Palette**: Reuses the existing Ctrl+K overlay rather than introducing a new shortcut, minimizing UI surface area.

## IPC Contract

| Command | Request | Response |
|---------|---------|----------|
| `create_project` | `{ name, description?, color? }` | `{ id, name, description, color, created_at }` |
| `list_projects` | `{}` | `[{ id, name, description, color, created_at, updated_at, session_count, memory_count }]` |
| `get_project` | `{ id }` | `{ id, name, description, color, created_at, updated_at }` or `null` |
| `update_project` | `{ id, name?, description?, color? }` | `{ success: true }` |
| `delete_project` | `{ id }` | `{ success: true }` |
| `set_session_project` | `{ session_id, project_id }` | `{ success: true }` |
| `set_memory_project` | `{ memory_id, project_id }` | `{ success: true }` |
| `get_project_sessions` | `{ id }` | `[{ id, name, created_at, updated_at, model, provider }]` |
| `get_project_memory` | `{ id }` | `[MemoryRecord]` |
| `universal_search` | `{ query, limit?, source_filter?, project_id? }` | `{ messages: [...], memory: [...], projects: [...] }` |

## Files Changed

- `src-tauri/src/db/migrations/002_project_knowledge.sql` (new)
- `src-tauri/src/db/migrations/mod.rs`
- `src-tauri/src/projects.rs` (new)
- `src-tauri/src/search.rs` (new)
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/memory.rs` (made `SqliteMemoryRow` pub)
- `frontend/index.html`
- `frontend/src/memory.js`
- `frontend/src/app.css`
- `docs/epics/EPIC-003-Project-Knowledge-Spaces.md` (new)
- `AGENTS.md`

## Definition of Done

- [x] All 6 stories implemented
- [x] `cargo test --lib` passes (78 tests)
- [x] `cargo check` produces no new errors
- [x] Frontend build succeeds
- [x] AGENTS.md updated
- [x] Epic doc created
