# Story 9.2: Generate Embeddings via Gemini API

Status: done

## Story

As a Developer,
I want to generate embeddings for text using the Gemini API,
so that I can store them in the vector database.

## Acceptance Criteria

1. Implement `GenerateEmbedding` in `GeminiProvider`.
2. Use `text-embedding-004` model.
3. Verify that it returns a vector of floats.

## Tasks / Subtasks

- [x] Implement `GenerateEmbedding` in `GeminiProvider`.
- [x] Add method to `Provider` interface.
- [x] Verify with build.

## Dev Notes

- I used `github.com/google/generative-ai-go/genai` SDK's `EmbeddingModel` method.

## Dev Agent Record
### Agent Model Used
Antigravity
