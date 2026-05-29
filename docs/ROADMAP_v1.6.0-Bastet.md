# NEURODECK v1.6.0 Roadmap — Bastet
**Theme:** Trust, Provenance, and Accessibility
**KFMS Codename:** Bastet (MINOR line 6)
**Target Tag:** `v1.6.0-bastet`
**Baseline:** `v1.5.1-horus`

---

## Release Philosophy

With `v1.5.0-Horus`, we gave the platform vision—exposing the underlying LSP, remote control streaming, and advanced integrations. Now, as NEURODECK matures into a serious tool for research and autonomous coding, we need to build **Trust**.

**v1.6.0 (Bastet)** focuses on making the AI's actions transparent, verifiable, and secure, while ensuring the platform is accessible to all users.

## Sprint 10 Series — The Trust & Accessibility Layer

Based on the roadmap alignment handoff, this release will focus on the following highest-value remaining slices:

### Sprint 10.0: Provenance and Attribution for Assistant Outputs
- **Goal:** Ensure every AI assertion or generated code block has a clear, verifiable source.
- **Features:** 
  - Traceability UI for RAG: Show exactly which local document chunks or web search results influenced the response.
  - LLM Confidence indicators for factual claims.

### Sprint 10.1: Guided Onboarding and Trust/Safety Explanations
- **Goal:** Educate new users on what the AI can and cannot do safely on their local system.
- **Features:**
  - Interactive first-run tutorial explaining the sandboxing and the PTY terminal boundaries.
  - Clear "Trust & Safety" modal detailing data handling (local vs. cloud API).

### Sprint 10.2: Stronger Privacy and Permissions Center
- **Goal:** Give power users absolute control over what directories and system commands the Agent can access.
- **Features:**
  - Dedicated "Privacy & Permissions" Settings tab.
  - Capability whitelisting (e.g., restrict Agent to `~/.neurodeck_workspace`).

### Sprint 10.3: Better Research / Browser Citation Surfaces
- **Goal:** Elevate the Sandboxed Browser into a first-class research tool.
- **Features:**
  - Auto-generate Markdown citations from browser sessions.
  - "Save to Memory" button in the browser to instantly vectorize the current webpage for RAG.

### Sprint 10.4: Accessibility and Keyboard-First Refinements
- **Goal:** Make all modal flows seamlessly operable without a mouse.
- **Features:**
  - Aria-label audits and WCAG color contrast passes.
  - Focus trapping in modals and complete keyboard tab-indexing for the Steam Deck D-pad and external keyboards.

---

## Implementation Rule
Keep the next work item small, testable, and tied to a visible user workflow. Prefer one shell-level improvement at a time over broad framework churn.
