# Claude Handoff: DeckCode Implementation

Hello Claude! You are picking up the implementation of the **DeckCode Predictive Coding Profile**. 
This is a massive control surface abstraction for NEURODECK that maps Steam Deck physical inputs to semantic coding actions rather than raw keyboard keys.

## Context & Artifacts
1. **PRD & SDS**: Read `deckcode-prd-sds.md` in the project root. It outlines the problem, layers, prediction algorithm, and safety gates.
2. **Schema**: Read `deckcode-controller-profile.schema.json`. This is the machine-readable ground truth for action sets, layers, bindings, and prediction rules.
3. **Architecture Goal**: Build the runtime inside NEURODECK to ingest physical inputs, resolve them through action sets and layers, generate predictions based on editor/terminal context, and dispatch semantic commands.

## Where We Left Off
- The PRD and Schema have been fully defined by the user and loaded into context.
- An implementation plan (`implementation_plan.md`) has been drafted to structure the backend Rust daemon (`src-tauri/src/deckcode/`).
- **No code has been written yet for the DeckCode runtime.**

## Your First Tasks
1. **Resolve the Architecture Question**: The implementation plan asks the user whether to use `gilrs` (or `sdl2`) in Rust for raw input polling, OR stick to the HTML5 Gamepad API in `frontend/src/main.js`. Clarify this decision with the user first. (Rust is highly recommended to properly capture gyro, trackpad touch, and background events).
2. **Scaffold the Module**: Create `src-tauri/src/deckcode/` and define the JSON deserializer for the `deckcode-controller-profile.schema.json` data models.
3. **Build the Activator Engine**: Build the state machine to handle timing-based inputs (holds, double clicks, chords, soft/full triggers).
4. **Implement the Layer Resolver**: Handle rear-grip modifiers (L4, L5, R4, R5) to override base actions.

## Rules & Reminders
- Follow the **KFMS versioning standards** when making commits (`infra/meta/meta.json`).
- Use `./scripts/kfms/khaotic-init.sh stamp` to validate and stamp your work.
- Remember that `main.js` and `lib.rs` are intentionally monolithic in this project, but since DeckCode is such a massive subsystem, the plan proposes splitting it into a dedicated `deckcode` Rust module to keep things clean.

Good luck!
