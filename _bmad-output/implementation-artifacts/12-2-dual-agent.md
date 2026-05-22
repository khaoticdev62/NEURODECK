# Story 12.2: Implement dual-agent discussion (roundtable)

Status: done

## Story

As a User,
I want to see two AI personas discuss a topic together,
so that I can see different perspectives or simulate a debate.

## Acceptance Criteria

1. Implement `/discuss <persona1> <persona2> <topic>` command.
2. The system should call the first persona to start the discussion.
3. Then call the second persona to respond to the first persona.
4. Continue for a few turns (e.g., 2-3 turns each).
5. Display the conversation clearly in the chat.

## Tasks / Subtasks

- [x] Add `/discuss` command handler in `main.go`.
- [x] Implement loop to call both personas sequentially.
- [x] Maintain context between turns.

## Dev Notes

- This will require making multiple sequential calls to `StreamResponse` or `GenerateResponse` (if we add it).
- Since `StreamResponse` returns a channel, we can read from it and add it to a growing transcript!
- And pass the transcript as context to the next persona!
- We need to handle cancellation too!

## Dev Agent Record
### Agent Model Used
Antigravity
