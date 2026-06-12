# Steam Deck Controller QA Checklist

## Launch and shell

- Launch NEURODECK from Desktop Mode with controller only.
- Launch NEURODECK from Game Mode with controller only.
- Confirm the initial focused element is always visible.
- Confirm focus never disappears after route changes.

## Core workflows

- Complete onboarding without mouse input.
- Open command palette and run a command with controller only.
- Open Settings and change controller options.
- Open Browser, focus the address bar, navigate, reload, and go back.
- Open Sessions and Memory and activate row actions.
- Open Plugin Manager and inspect an item.

## Text entry

- Focus a text field and use `Steam + X` to open the keyboard.
- Verify focused inputs stay visible when the keyboard opens.
- Verify password/API key fields remain masked unless explicitly revealed.

## Recovery

- Disconnect the controller mid-session and reconnect it.
- Open a modal and verify `B` always exits safely.
- Trigger an error state and confirm the close/recovery path remains reachable.
