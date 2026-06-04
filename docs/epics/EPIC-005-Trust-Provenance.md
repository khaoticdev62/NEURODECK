# Epic: Trust, Provenance & Citations

## Objective
Provide visibility into AI reasoning, factual source citations, and local sandbox boundaries. Enable users to see which memory documents influenced a response, and save web page content directly to the vector memory database.

## Background
As NEURODECK's RAG memory system grows, users need transparency into what context is being injected into their LLM prompts. Additionally, the built-in sandboxed browser should be able to save page content for later retrieval via the same RAG pipeline.

## User Stories

### Story 1: RAG Attribution UI (US-5.1)
**As a** user,
**I want** a collapsible drawer on AI messages showing exactly which local memory chunks influenced the response,
**So that** I can understand the provenance of the answer and verify its sources.

- **Acceptance Criteria**:
  - For every `send_command` response generated via RAG, the backend emits a `rag_sources` event with document ID, title, role, and content snippet.
  - The chat frontend renders a 📚 "Injected Context (N)" toggle button below the AI message.
  - Clicking the toggle expands a list of source cards, each showing: index chip, title, role badge, and content snippet.
  - Clicking a source card navigates to the Memory tab and pre-fills the search with the source ID.
  - Sources are cleared after each message to prevent cross-contamination.

### Story 2: Sandboxed Browser Memory Vectorization (US-5.2)
**As a** user,
**I want** to save the current browser page content to my local vector memory,
**So that** I can later query it through RAG alongside my chat history.

- **Acceptance Criteria**:
  - The Browser toolbar contains a "Save to Memory" button (database icon).
  - Clicking it invokes `browser_save_to_memory` with the current URL.
  - The backend opens the page in a headless browser tab, extracts `document.title` and `document.body.innerText`.
  - Text is chunked (512 chars, 64 overlap), embeddings are generated via the active provider, and chunks are stored in the vector DB with `namespace: browser` metadata.
  - The button shows feedback states: "Saving..." → "Saved (N chunks)" → back to default.
  - Errors show "Failed" with console logging.

## Implementation Status

### Backend (`src-tauri/src/commands/session.rs`)
- `send_command` performs RAG search via `db.search(query_embed, 3)` or keyword fallback.
- Provenance metadata is collected into a `provenance_list` JSON array.
- `rag_sources` event is emitted before the LLM stream begins.

### Backend (`src-tauri/src/commands/browser.rs`)
- `browser_save_to_memory` command is fully implemented:
  - Validates URL via `parse_http_url`
  - Opens headless browser tab, navigates, waits for load
  - Extracts title and innerText via JS evaluation
  - Chunks text with `chunk_text(&text, 512, 64)`
  - Generates embeddings and stores with metadata: `namespace: browser`, `source_url`, `title`, `chunk_index`, `role: document`

### Frontend (`frontend/src/chat.js`)
- `listen("rag_sources", ...)` parses and stores sources in `state.currentRagSources`.
- `listen("stream_done", ...)` appends the RAG attribution drawer to the AI message card.
- Each source card is clickable and navigates to the Memory view.

### Frontend (`frontend/src/main.js`)
- `initBrowser()` wires the `#browser-save-memory-btn` click handler.
- Calls `invoke("browser_save_to_memory", { url })` and updates button state.

### CSS (`frontend/src/app.css`)
- Full styling for `.rag-sources-container`, `.rag-sources-toggle`, `.rag-sources-list`, `.rag-source-item`, `.rag-source-header`, `.rag-source-chip`, `.rag-source-title`, `.rag-source-role`, `.rag-source-snippet`.

## Verification
- [x] `cargo check` succeeds
- [x] `npm run --prefix frontend build` succeeds
- [x] RAG sources event emits valid JSON with id/title/snippet/role
- [x] Browser save-to-memory stores chunks with `namespace: browser`
- [x] KFMS release status remains GO
