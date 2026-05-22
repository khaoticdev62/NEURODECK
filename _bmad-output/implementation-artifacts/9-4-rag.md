# Story 9.4: Implement RAG (Retrieval-Augmented Generation)

Status: done

## Story

As a Developer,
I want to implement RAG by retrieving relevant past messages and including them in the prompt,
so that the AI can provide more contextual and informed responses.

## Acceptance Criteria

1. Before calling the AI, search the vector database for messages similar to the user's prompt.
2. Format the retrieved messages as context and include them in the prompt or system prompt.
3. Verify that the AI can reference past conversations when asked.

## Tasks / Subtasks

- [x] Update `SendCommand` (Wails) to search memory before calling AI.
- [x] Format retrieved messages into the prompt (system prompt).
- [x] Verify with a test conversation.

## Dev Notes

- We can use `m.memoryDB.SearchMemory` to find relevant messages.
- We should limit the number of retrieved messages to avoid blowing up the token limit! (e.g., top 3-5).

## Dev Agent Record
### Agent Model Used
Antigravity
