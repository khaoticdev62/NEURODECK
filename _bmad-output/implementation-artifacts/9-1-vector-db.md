# Story 9.1: Integrate chromem-go (Embeddable Vector DB)

Status: done

## Story

As a Developer,
I want to integrate `chromem-go` as an embeddable vector database,
so that I can store and search message embeddings locally.

## Acceptance Criteria

1. Add `github.com/philippgille/chromem-go` as a dependency.
2. Initialize a local vector database on application startup.
3. Verify that we can create a collection and add a test vector.
4. The database should persist to disk.

## Tasks / Subtasks

- [x] Add `chromem-go` dependency.
- [x] Initialize `chromem` in `app_wails.go` (ported from main.go).
- [x] Create a collection for chat history.
- [x] Verify persistence (uses NewPersistentDB).

## Dev Notes

- `chromem-go` is pure Go and zero dependencies!
- We should store the DB in a `memory` or `data` directory.

## Dev Agent Record
### Agent Model Used
Antigravity
