# Story 5.4: Persona Engine (System Prompts)

Status: done

## Story

As a User,
I want to switch personas or system prompts,
so that I can tailor the AI response style to my current need.

## Acceptance Criteria

1. UI allows switching between predefined personas (e.g., Default, Developer, Cyberpunk).
2. Switching persona updates the system prompt sent to the LLM.
3. Current persona is displayed in the status bar or header.

## Tasks / Subtasks

- [x] Define a set of personas with system prompts in code or config (AC: 1)
- [x] Add a shortcut or command to cycle/select personas (AC: 1)
- [x] Update LLM request to include the selected system prompt (AC: 2)
- [x] Display active persona in `StatusBar` (AC: 3)

## Dev Notes

- Check if Ollama/Gemini providers support system prompts in their API calls.
- `internal/llm/ollama.go` might need updates to accept system prompts.

## Dev Agent Record
### Agent Model Used
Antigravity
