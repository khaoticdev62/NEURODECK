# Sprint Change Proposal — Transition to Wails

## Section 1: Issue Summary
The project is pivoting from a Terminal User Interface (TUI) based on Bubble Tea to a Graphical User Interface (GUI) based on **Wails**. This change was triggered by a strategic decision to provide a more rich, premium, and flexible user experience.

## Section 2: Impact Analysis
- **PRD Impact**: The pivot directly conflicts with the original PRD's "Non-Goals" which forbade browser-based frontends. The primary stack also needs updating.
- **Epic Impact**: Epic 5 (Refinement and Polish) stories were written for Bubble Tea and need to be redefined for web technologies (HTML/CSS). Future epics (Lua, Plugins) remain viable but will target the Wails bridge.
- **Technical Impact**: The stack shifts from Go/Bubble Tea to Go/Wails/Webview2.

## Section 3: Recommended Approach
**Direct Adjustment**: We have already implemented the core features in Wails successfully. The recommended path is to update the planning artifacts (PRD and Epics) to match the current reality and proceed with the remaining features on the Wails stack.

## Section 4: Detailed Change Proposals

### PRD Modifications
- **Header**: Updated Primary Stack to `Golang + Wails (HTML/CSS/JS Frontend) + Ollama`.
- **Non-Goals**: Removed "Browser-based frontend" restriction.

### Epics Modifications
- **Epic 5**: Updated stories to be Wails-specific (CSS Variables, Transitions, etc.).

## Section 5: Implementation Handoff
- **Scope**: Minor (The changes are mostly documented and aligned with the current work).
- **Handoff**: Direct implementation by the Developer agent (Antigravity).
