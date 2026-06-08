# NEURODECK Software Design Specification

## Stack

- Electron main process
- React + TypeScript renderer
- Tailwind CSS design system
- Rust runtime sidecar
- SQLite via SQLx
- IPC allowlist through preload
- Local credential vault
- Rust service registry

## IPC Principles

- Every channel is explicitly listed.
- No wildcard channel forwarding.
- Renderer never receives secrets.
- Renderer never directly accesses SQLite.
- Errors return safe codes and user-facing resolutions.
- Streaming model output uses event channels with request IDs.

## Database Principles

- SQLite local persistence.
- Migrations tracked through `schema_migrations`.
- Backups before major migrations/imports.
- Cascade deletes for dependent records.
- FTS tables for memory/search indexes.
- Privacy-aware indexing for protected memory.
