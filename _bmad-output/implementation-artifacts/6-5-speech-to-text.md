# Story 6.5: Speech-to-Text (STT)

Status: in-progress

## Story

As a User,
I want to dictate prompts using my voice,
so that I don't have to type on the Steam Deck's on-screen keyboard.

## Acceptance Criteria

1. Use a shortcut (e.g., Ctrl+R) to start/stop recording.
2. Record audio from the microphone.
3. Transcribe the audio to text.
4. Insert the text into the input field.
5. Support both Windows and Linux (Steam Deck).

## Tasks / Subtasks

- [x] Implement Ctrl+R toggle for recording state (AC: 1)
- [x] Implement audio recording (Linux: arecord, Windows: Simulated) (AC: 2)
- [x] Implement transcription (Gemini API) (AC: 3)
- [x] Implement inserting text into input field (AC: 4)

## Dev Notes

- This is complex. We will likely need external tools or APIs for transcription.
- On Linux (Steam Deck): `arecord` is standard for recording.
- On Windows: PowerShell or a dedicated CLI tool.
- For transcription, we will use the Gemini API (as requested by the user), but we will allow the user to change it in the future.
- We will record audio to a temporary WAV file using `arecord` on Linux and a suitable method on Windows (or assume a tool is available).

## Dev Agent Record
### Agent Model Used
Antigravity
