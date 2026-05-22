# Story 6.3: File Mentions (@file)

Status: done

## Story

As a User,
I want to easily include file contents in my prompts by mentioning them,
so that I can ask the AI to analyze logs, code, or configs without copy-pasting.

## Acceptance Criteria

1. Detect `@file:path/to/file` in user prompts.
2. Read the file content if it exists.
3. Append the content to the prompt before sending it to the AI.
4. Show an error message if the file cannot be read.

## Tasks / Subtasks

- [x] Implement `@file` detection and parsing (AC: 1)
- [x] Implement file reading logic (AC: 2)
- [x] Implement appending content to prompt (AC: 3)
- [x] Handle errors (file not found, permission denied) (AC: 4)

## Dev Notes

- We can use a simple regex or string search for `@file:`.
- Security: Restrict reading to the current workspace or allowed directories if needed. For now, let's allow relative and absolute paths but with a warning or confirmation if possible? No, let's keep it simple first.

## Dev Agent Record
### Agent Model Used
Antigravity
