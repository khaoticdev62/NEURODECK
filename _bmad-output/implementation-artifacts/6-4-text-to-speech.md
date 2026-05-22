# Story 6.4: Text-to-Speech (TTS)

Status: done

## Story

As a User,
I want the AI to read its responses out loud,
so that I can interact with it hands-free and get a sci-fi companion feel.

## Acceptance Criteria

1. AI responses are read out loud after completion.
2. Support both Windows (development) and Linux (Steam Deck).
3. Use offline solutions if possible (built-in OS tools).
4. Allow muting/unmuting with a shortcut (e.g., Ctrl+V).

## Tasks / Subtasks

- [x] Implement TTS command execution on message completion (AC: 1)
- [x] Implement Windows support (PowerShell Speech) (AC: 2, 3)
- [x] Implement Linux support (espeak or festival) (AC: 2, 3)
- [x] Implement Mute/Unmute toggle and UI indicator (AC: 4)

## Dev Notes

- On Windows: `powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('...')"`
- On Linux: `espeak "..."` or similar.
- We need to handle escaping of quotes in the text!
- We should run the speech command in a goroutine so it doesn't block the UI!

## Dev Agent Record
### Agent Model Used
Antigravity
