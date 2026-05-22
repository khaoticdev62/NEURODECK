# Story 9.3: Store and Retrieve Chat History

Status: done

## Story

As a Developer,
I want to store and retrieve chat history using the vector database,
so that the AI can remember past conversations.

## Acceptance Criteria

1. Store user and AI messages in the `chat_history` collection.
2. Generate embeddings for each message before storing.
3. Implement a search function to find relevant messages based on a query.

## Tasks / Subtasks

- [x] Update `SendCommand` (Wails) to store messages in `chromem-go`.
- [x] Implement `SearchMemory` in `memory` package.
- [x] Add a command or hook to test retrieval.

## Dev Notes

- We need to handle async embedding generation so we don't block the UI!
- Or we can do it synchronously if it's fast enough. Let's start with synchronous and optimize if needed.

## Dev Agent Record
### Agent Model Used
Antigravity
