# Browser Permission Model

This document outlines the stateful permission handling and policy mappings for **NeuroBrowse**.

## 1. Supported Permissions

- **media** (camera / microphone)
- **geolocation**
- **notifications**
- **fullscreen**
- **clipboard-read** / **clipboard-write**
- **downloads**
- **popups**
- **pointer-lock**

## 2. Stateful Decision Flow
- **Default Policy**: Block by default.
- **Permission Requests**: Trigger `session.setPermissionRequestHandler`.
- If an origin requests a permission:
  1. The handler looks up the origin in the saved permission registry.
  2. If found, returns the saved choice (`allow_always` vs `block_always`).
  3. If not found, broadcasts a `permission-request` event to the renderer.
  4. The renderer prompts the user (A/B controller hints or mouse clicks).
  5. The user's decision (`allow_once`, `allow_always`, `block_once`, `block_always`) is recorded.
  6. The main process executes the callback with the outcome.

## 3. Storage and Lifetimes
- Persistent profiles save decisions to `userData/browser-permissions.json`.
- Private/in-memory profiles discard permission choices immediately upon closing the session.
