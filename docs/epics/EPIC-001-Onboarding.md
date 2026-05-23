# Epic: First-Time User Onboarding Wizard

## Objective
Provide a seamless, immersive, and "hacker-aesthetic" onboarding experience for first-time users of NEURODECK. The wizard must establish the application's unique identity while painlessly guiding the user through critical configuration steps (API keys, preferences, and persona selection).

## Background
NEURODECK relies on API keys (Gemini) and local PTY integrations. Without these configured, the application is non-functional. Throwing users directly into a blank terminal without an API key leads to immediate friction and high bounce rates. We need a guided, aesthetically pleasing setup sequence.

## User Stories

### Story 1: Boot Sequence & Welcome
**As a** first-time user,
**I want to** be greeted by a cinematic, terminal-style welcome screen,
**So that** I immediately understand the app's cyberpunk/developer aesthetic and feel welcomed.
- **Acceptance Criteria**:
  - Detect if `neurodeck_infrastructure::secrets::get_gemini_api_key()` is empty.
  - If empty, route the frontend to the Onboarding Flow instead of the main terminal.
  - Display a typing-animation welcome message ("Welcome to NEURODECK...").

### Story 2: Secure API Key Configuration
**As a** user,
**I want to** securely enter and validate my Gemini API key during onboarding,
**So that** the application can initialize its AI capabilities securely.
- **Acceptance Criteria**:
  - Provide a text input for the API key.
  - Visually obscure the key (password field).
  - Include a "Verify Connection" button that pings the LLM API.
  - Show a success/failure verbose log in the UI.
  - Save the verified key using the OS Keychain implementation.

### Story 3: Persona & Theme Selection
**As a** user,
**I want to** choose my default AI persona and terminal color theme,
**So that** the environment is tailored to my workflow before I even start.
- **Acceptance Criteria**:
  - Present a carousel or list of default personas (e.g., Default, Sarcastic Hacker, Helpful Assistant).
  - Present a selection of themes (Cyberpunk, Matrix, Dracula, Monokai).
  - Apply the theme live as a preview when selected.

### Story 4: System Integration Check
**As a** user,
**I want to** see a diagnostic checklist of system capabilities (PTY access, local LLM status, filesystem),
**So that** I know the app has the necessary permissions to function.
- **Acceptance Criteria**:
  - Run a quick diagnostic: `[OK] Shell Detected (Powershell)`, `[OK] Network Active`, `[OK] Keychain Accessible`.
  - Display green checks for successes.
  - Provide a "Launch NEURODECK" button once diagnostics pass.

## Technical Considerations
- The onboarding wizard should be a dedicated React view mounted inside the main window.
- State should be managed via our new Zustand `store.ts`.
- The onboarding state flag should be saved locally so the wizard doesn't show up twice.
