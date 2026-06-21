# Epics and Stories

This file tracks the epics and user stories for the SteamOS LLM Terminal project, derived from the PRD sprint plan and updated with new tasks.

## Epic 1: Bootstrap and Foundation
### [x] Story 1.1: Bootstrap repository
### [x] Story 1.2: Configure Bubble Tea
### [x] Story 1.3: Create viewport
### [x] Story 1.4: Build input system
## Epic 2: Steam Deck Integration
### [x] Story 2.1: Implement Steam Input mappings
### [x] Story 2.2: Create launch wrapper
### [x] Story 2.3: Validate gamescope support
### [x] Story 2.4: Refine Steam Input / Radial Menu Support
## Epic 3: LLM Integration
### [x] Story 3.1: Connect Ollama backend
### [x] Story 3.2: Implement streaming
### [x] Story 3.3: Add loading indicators
## Epic 4: Persistence and Formatting
### [x] Story 4.1: Persistence layer
### [x] Story 4.2: Session export
### [x] Story 4.3: Markdown support
### [x] Story 4.4: Session loading in UI
## Epic 5: Refinement and Polish (Wails GUI)
### [x] Story 5.1: Theme engine (CSS Variables & LocalStorage)
### [x] Story 5.2: Animation system (CSS Transitions & Pulse effects)
### [x] Story 5.3: Performance optimization (Asset loading & WebView footprint)
### [x] Story 5.4: Persona Engine (System Prompts via Go backend)
### [x] Story 5.5: Dynamic Markdown Width (CSS Flexbox/Grid layouts)
## Epic 6: Recovered Epic from BMAD Artifacts
### [x] Story 6.1: Terminal Command Execution
### [x] Story 6.2: Cross-Platform Command Execution
### [x] Story 6.3: File Mentions (@file)
### [x] Story 6.4: Text-to-Speech (TTS)
### [x] Story 6.5: Speech-to-Text (STT)
### [x] Story 6.6: Game Detection & Context
## Epic 7: Recovered Epic from BMAD Artifacts
### [x] Story 7.1: Integrate Lua Runtime (Gopher-Lua)
### [x] Story 7.2: Expose Go Functions to Lua
### [x] Story 7.3: Implement Lua Script Execution from Chat
### [x] Story 7.4: Create Example Automation Scripts
## Epic 8: Recovered Epic from BMAD Artifacts
### [x] Story 8.1: Plugin Discovery and Loading
### [x] Story 8.2: Register Custom Commands
### [x] Story 8.3: Hook into Events
### [x] Story 8.4: Create Example Plugins
## Epic 9: Recovered Epic from BMAD Artifacts
### [x] Story 9.1: Integrate chromem-go (Embeddable Vector DB)
### [x] Story 9.2: Generate Embeddings via Gemini API
### [x] Story 9.3: Store and Retrieve Chat History
### [x] Story 9.4: Implement RAG (Retrieval-Augmented Generation)
## Epic 10: Extension & Customization Framework
### [x] Story 10.1: Add a help screen or command list
### [x] Story 10.2: Improve layout responsiveness
### [x] Story 10.3: Add a "Loading" indicator for AI responses
### [x] Story 10.5: Hermes Lua Extension Framework
### [x] Story 10.6: Universal Adapter Ecosystem
## Epic 11: CI/CD & Infrastructure
### [x] Story 11.1: Automated SteamOS AppImage Deployments
### [x] Story 11.2: Build Pipeline Optimization (NSIS & LTO)
### [x] Story 11.3: Verify cross-platform builds
## Epic 12: Recovered Epic from BMAD Artifacts
### [x] Story 12.1: Allow switching personas via command
### [x] Story 12.2: Implement dual-agent discussion (roundtable)
## Epic 13: Production Data Wiring & Mock Elimination
### [x] Story 13.1: Wire real telemetry metrics into the diagnostics dashboard
### [x] Story 13.2: Wire Whisper/provider-native STT into Ollama, Hugging Face, Kimi, and OpenAI-compatible providers
### [x] Story 13.3: Resolve computer-use cross-platform support boundary
### [x] Story 13.4: Activate Canvas AI Edit and Collaboration buttons
### [x] Story 13.5: Wire headless PTY execution into the workflow engine
## Epic 14: Production Code Prompt System — Activate PromptFlow
### [x] Story 14.1: Confirm docs/prompt-system as canonical and retire the stale root scratch folder
### [x] Story 14.2: Install and configure the real PromptFlow CLI against this repo
### [x] Story 14.3: Lightweight coding-agent entry point (npm script) for quick prompt loading
### [ ] Story 14.4: Wire the 15-prompt pack into the in-app Prompt Lab tab (PromptDrive) — backend done & tested (`loads_and_validates_real_builtin_packs`); manual in-app click-through (AC4) still outstanding
### [x] Story 14.5: Document the system and cross-link it from CLAUDE.md
