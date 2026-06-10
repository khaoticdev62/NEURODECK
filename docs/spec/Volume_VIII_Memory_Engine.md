# Volume VIII — Memory Engine Architecture

## Philosophy
Memory reduces repetition, preserves context, improves routing, improves suggestions, and improves productivity. It must never become a privacy liability.

## Memory Layers
Global Memory → Project Memory → Workspace Memory → Agent Memory → Session Memory.

## Session Memory
Stores current prompt, current agent, active project, recent commands, macros, suggestions. Lifetime: launch to close.

## Workspace Memory
Stores open panels, layout, panel sizes, focus state, scroll positions. Restores after restart, crash, suspend, resume.

## Project Memory
Stores framework, language, architecture, coding standards, preferred patterns, known constraints, known risks, prompt history.

## Agent Memory
Stores recent tasks, known problems, preferred solutions, previous recommendations.

## Global Memory
Stores controller preferences, theme preferences, prompt preferences, agent preferences, accessibility preferences.

## Storage
SQLite tables: session_memory, workspace_memory, project_memory, agent_memory, global_memory, memory_events, memory_snapshots.

## Retrieval Pipeline
User action → intent detection → memory query → context ranking → context injection.

## Ranking Formula
35% project match, 25% recency, 20% agent match, 10% frequency, 10% user preference.

## Compression
Summarization, deduplication, archiving, snapshotting after 1000 events or 30 days.

## Privacy Controls
Local only by default. User can delete, export, or reset session/project/agent/global memory.

## Performance Targets
Memory query <20ms, context injection <50ms, snapshot restore <500ms, workspace restore <2s.
