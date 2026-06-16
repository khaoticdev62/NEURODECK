# NEURODECK Onboarding Wizard Upgrade PRD

## 1. Product Name

**Feature:** NEURODECK Adaptive Onboarding Wizard 2.0  
**System Area:** First-run experience, feature education, contextual help, self-updating tutorial engine  
**Target Platform:** Electron + React + TypeScript + Tailwind  
**Primary Device Target:** Steam Deck LCD, Steam Deck OLED, desktop, docked mode, keyboard/mouse, controller, touchscreen  
**Design Direction:** Tactical Glass, Steam Deck-first, fast by default, controller-first, JPE-friendly

---

## 2. Executive Summary

NEURODECK needs an onboarding wizard that teaches users how to use the app without slowing them down. The wizard should feel like a smart guided tour, not a forced tutorial dungeon. It should explain each core tool in JPE format, show a matching lightweight animation for every tool, use viewfinder windows to point directly at the real UI, and automatically add new tutorial steps when new features are shipped.

The upgraded onboarding system must be modular, lazy-loaded, skippable, resumable, controller-friendly, accessibility-safe, and performance-budgeted. It must never block users from using the app unless the user is completing required setup like model path selection, permissions, account setup, or security confirmation.

The onboarding wizard becomes a living education layer for NEURODECK. It should teach first-time users, help returning users discover new features, and provide contextual mini-tours from inside any tool.

---

## 3. JPE Product Explanation

**Plain English version:**

The onboarding wizard is the guided “show me around” mode for NEURODECK.

Instead of throwing users into the app and saying “good luck,” NEURODECK shows small focused windows over the real interface. These windows point at one tool at a time, explain what it does in simple language, and play a small animation showing how to use it.

The user can skip it, replay it, slow it down, turn animations off, or ask for more detail.

When NEURODECK gets a new feature, the wizard can automatically notice that the feature has onboarding steps attached and add them to the tour without the developer rewriting the whole onboarding flow.

The whole thing must be fast. No massive videos loading on startup. No heavy animation files blocking the app. No giant overlay making the Steam Deck wheeze like it just ran Crysis on a toaster.

---

## 4. Goals

### 4.1 Primary Goals

1. Teach users how to use every major NEURODECK tool in simple JPE language.
2. Demonstrate each tool with a corresponding lightweight animation.
3. Use viewfinder windows to spotlight real UI areas without hiding the whole app.
4. Keep onboarding fast, optional, resumable, and non-blocking.
5. Support Steam Deck controller navigation from the first screen.
6. Let the wizard auto-update itself as new features, tabs, tools, and workflows are added.
7. Provide contextual onboarding later, not just during first launch.
8. Keep the app launch path clean and performance-safe.

### 4.2 Non-Goals

1. Do not create a long forced tutorial before the user can use NEURODECK.
2. Do not preload all animations on startup.
3. Do not hardcode every onboarding step directly inside a React component.
4. Do not rely on mocked feature data.
5. Do not use full-screen shader effects, heavy blur, particle storms, or large video files.
6. Do not make onboarding dependent on internet access.
7. Do not break controller-only usage.

---

## 5. User Problems

### Problem 1: Feature Overload

NEURODECK is powerful. New users may not immediately understand Models, Agents, Memory, Sessions, Tools, Sync, Browser, Terminal, VPN, Plugin Manager, Diagnostics, Theme Manager, and Automation.

**Solution:** Teach one concept at a time using JPE text, focused viewfinders, and small animations.

### Problem 2: Tutorials Are Usually Slow

Traditional onboarding often blocks the app, plays too many animations, or makes users click through endless screens.

**Solution:** Make the wizard skippable, progressive, lazy-loaded, and resumable.

### Problem 3: New Features Need New Guidance

Every new tab or feature creates a documentation gap.

**Solution:** Use an onboarding registry where every feature can provide its own tutorial metadata, steps, demo animation, controller hints, and help text.

### Problem 4: Steam Deck Users Need Controller-First Help

Steam Deck users need to understand button mappings without touching the screen.

**Solution:** Every onboarding step must show controller actions beside keyboard/mouse equivalents.

---

## 6. Target Users

### 6.1 First-Time User

Needs to understand the app quickly and start using core features without reading docs.

### 6.2 Returning User

Needs to learn what changed after an update without being forced through the whole tutorial again.

### 6.3 Power User

Needs quick command palette access to tool demos, shortcuts, and advanced workflows.

### 6.4 Steam Deck User

Needs every step to work through controller, touchscreen, and game mode constraints.

### 6.5 Accessibility User

Needs reduced motion, readable text, keyboard navigation, high contrast, screen reader support, and no flashing effects.

---

## 7. UX Principles

1. **Teach while showing the real UI.** Do not explain a button on a blank tutorial screen when the real button is already visible.
2. **One idea per step.** The wizard should never stack five concepts into one card.
3. **Skip means skip.** If the user skips onboarding, respect it and keep the app moving.
4. **Replay is always available.** Users can replay any tool demo from Help, Command Palette, or the tool itself.
5. **Performance first.** Load text immediately. Load animation only when the step is active.
6. **JPE first, advanced second.** Start simple, then allow “Show technical details.”
7. **Controller parity.** Every mouse action must have a controller path.
8. **No punishment for curiosity.** Users can jump ahead, go back, pause, or exit without losing progress.

---

## 8. Core Feature Requirements

## 8.1 Adaptive Wizard Shell

The wizard shell is the container that manages onboarding flow.

### Requirements

- Launch on first run only after essential app readiness checks complete.
- Must not block app startup rendering.
- Must run as an overlay route or portal above the active app shell.
- Must support skip, back, next, replay animation, pause animation, and exit.
- Must persist progress locally.
- Must support multiple onboarding tracks.
- Must support controller, keyboard, mouse, and touch.
- Must allow users to resume where they left off.
- Must expose a “Replay Onboarding” option in Settings and Command Palette.

### JPE Copy Example

“Welcome to NEURODECK. This is your AI workstation dashboard. We’ll show you the important tools one at a time. You can skip this any time and come back later.”

---

## 8.2 Viewfinder Windows

Viewfinder windows are focused spotlight panels that frame real UI areas.

### Purpose

A viewfinder window lets NEURODECK point at the actual part of the app being explained. Instead of saying “look for the Model Manager,” the wizard darkens the rest of the screen and creates a clear focus window around the Model Manager.

### Viewfinder Types

#### 1. Spotlight Viewfinder

Highlights one specific button, card, tab, input, or panel.

**Use for:** Buttons, sidebar items, quick actions, toggles.

#### 2. Panel Viewfinder

Frames an entire panel or screen region.

**Use for:** Chat viewport, model list, agent dashboard, diagnostics panel.

#### 3. Split Viewfinder

Shows the real UI on one side and an explanation/demo card on the other.

**Use for:** Multi-step workflows like selecting a model, creating an agent, or saving a profile.

#### 4. Controller Viewfinder

Overlays a small Steam Deck button map beside the focused UI area.

**Use for:** Controller-specific actions, shortcuts, grip button mappings.

#### 5. Timeline Viewfinder

Shows a short sequence of steps as small cards or pips.

**Use for:** Workflows that require 3–5 actions.

#### 6. Safety Viewfinder

Uses a high-contrast border and plain language warning for security-sensitive actions.

**Use for:** API keys, VPN profiles, local model paths, permissions, plugin install prompts.

#### 7. Empty-State Viewfinder

Appears when the user has no data yet.

**Use for:** No sessions, no saved profiles, no models installed, no plugins enabled.

### Viewfinder Behavior

- Must anchor to real DOM elements using stable `data-onboarding-anchor` attributes.
- Must reposition when the window resizes.
- Must handle hidden, disabled, offscreen, or unavailable targets.
- Must fall back to a center-screen card if the target is unavailable.
- Must avoid layout shifts.
- Must not trap focus unless the step requires interaction.
- Must support reduced motion.
- Must support a no-dim mode for users with visual sensitivity.

### Viewfinder Visual Rules

- Use crisp borders, soft tactical glow, and readable contrast.
- Avoid heavy blur on Steam Deck.
- Avoid full-screen animated backgrounds.
- Keep the dim overlay static or minimally animated.
- Use GPU-safe transforms only: opacity and translate.
- Do not animate width, height, top, left, or expensive filters.

---

## 8.3 Tool Demonstration Animations

Each major tool gets a small matching animation that explains the tool visually.

### Animation Rules

- Must be lazy-loaded only when the step becomes active.
- Must have a static fallback image.
- Must support pause, replay, and reduced motion.
- Must not autoplay audio.
- Must be short: target 3–6 seconds.
- Must loop only when useful.
- Must be compressed and bundled per feature, not as one giant onboarding payload.
- Must be theme-aware where possible.
- Must never delay the user from pressing Next.

### Allowed Formats

Preferred:

- CSS keyframe micro-animations for simple UI demonstrations.
- Lightweight SVG animation for icons and flow lines.
- Lottie JSON only when file size is controlled.
- Short WebM only for complex visual demos.
- Sprite sheets only when predictable and tiny.

Avoid:

- Large MP4 files.
- Heavy canvas scenes.
- Real-time 3D.
- Shader effects.
- Particle-heavy animations.
- Blurred animated glass layers.

---

## 8.4 Tool-by-Tool Onboarding Catalog

### 8.4.1 Workspace

**JPE explanation:**  
“This is your main workbench. Your conversations, commands, tools, and AI responses live here.”

**Viewfinder:** Panel Viewfinder around the main workspace.

**Animation:** A message enters the input bar, streams into a response card, and saves into the session timeline.

**Controller hint:**  
A = Select input  
B = Back / close overlay  
R1/L1 = Switch sections  
Start = Open command palette

**Acceptance Criteria:**  
The user can identify where to type, where responses appear, and how to open the command palette.

---

### 8.4.2 Command Palette

**JPE explanation:**  
“The command palette is the fast way to jump anywhere or run actions without digging through menus.”

**Viewfinder:** Spotlight Viewfinder on the command palette trigger.

**Animation:** Palette opens, user types “theme,” results filter, action runs.

**Controller hint:**  
Start = Open palette  
D-pad = Move through results  
A = Run selected command

**Acceptance Criteria:**  
The user understands the palette as the universal shortcut hub.

---

### 8.4.3 Models

**JPE explanation:**  
“Models are the AI brains NEURODECK can use. You can connect local models, cloud models, or saved model profiles.”

**Viewfinder:** Panel Viewfinder around Model Manager.

**Animation:** A model card changes from disconnected to connected, then shows status, latency, and token readiness.

**Controller hint:**  
A = Open model  
X = Test connection  
Y = View details

**Acceptance Criteria:**  
The user understands how to connect, test, and switch models.

---

### 8.4.4 Agents

**JPE explanation:**  
“Agents are specialized helpers. One can code, one can test, one can write docs, one can check security.”

**Viewfinder:** Split Viewfinder with agent list on one side and explanation on the other.

**Animation:** User picks “Security Agent,” assigns a task, and sees a status badge move from queued to running to done.

**Controller hint:**  
A = Select agent  
X = Assign task  
Y = View agent tools

**Acceptance Criteria:**  
The user understands that agents are role-based helpers, not separate apps.

---

### 8.4.5 Memory

**JPE explanation:**  
“Memory stores useful context so NEURODECK can remember project details, preferences, and work history when you allow it.”

**Viewfinder:** Safety Viewfinder around Memory controls.

**Animation:** A project note gets saved, tagged, and later retrieved into a new session.

**Controller hint:**  
A = Open memory item  
X = Save selected context  
Y = Manage memory permissions

**Acceptance Criteria:**  
The user understands what memory does, how to control it, and where privacy controls live.

---

### 8.4.6 Sessions

**JPE explanation:**  
“Sessions are saved workspaces. They let you return to a project, chat, tool setup, or workflow later.”

**Viewfinder:** Empty-State Viewfinder if no sessions exist; Panel Viewfinder if sessions exist.

**Animation:** A session is named, saved, reopened, and pinned.

**Controller hint:**  
A = Open session  
X = Pin session  
Y = Rename session

**Acceptance Criteria:**  
The user understands saving, reopening, and organizing sessions.

---

### 8.4.7 Browser Tab

**JPE explanation:**  
“The browser lets you use web tools inside NEURODECK without breaking your workflow.”

**Viewfinder:** Panel Viewfinder around browser tab.

**Animation:** A page opens, gets pinned to a session, and shares selected text into the workspace.

**Controller hint:**  
A = Open link / select  
B = Back  
X = Send selection to workspace  
Y = Browser actions

**Acceptance Criteria:**  
The user understands safe browsing, session pinning, and sending content to the workspace.

---

### 8.4.8 Terminal Tab

**JPE explanation:**  
“The terminal lets you run real commands from inside NEURODECK. It is powerful, so the wizard shows safety hints before risky commands.”

**Viewfinder:** Safety Viewfinder around terminal input.

**Animation:** A safe command runs, output appears, and a command is saved into history.

**Controller hint:**  
A = Focus terminal  
X = Paste command  
Y = Command actions  
B = Exit focus

**Acceptance Criteria:**  
The user understands how to run commands and recognize warning prompts.

---

### 8.4.9 VPN

**JPE explanation:**  
“VPN profiles help route your network through a provider or config you choose. NEURODECK shows connection status and warns before changing network behavior.”

**Viewfinder:** Safety Viewfinder around VPN profile controls.

**Animation:** A VPN profile imports, validates, connects, and displays status.

**Controller hint:**  
A = Select profile  
X = Test config  
Y = View logs

**Acceptance Criteria:**  
The user understands import, connect, disconnect, and status checks.

---

### 8.4.10 Sync / File Transfer

**JPE explanation:**  
“Sync helps move files between devices. You choose what to send, where it goes, and whether the connection is trusted.”

**Viewfinder:** Timeline Viewfinder for choose device → choose files → confirm transfer → complete.

**Animation:** Device discovered, file selected, transfer begins, progress completes.

**Controller hint:**  
A = Select device/file  
X = Start transfer  
Y = Transfer details

**Acceptance Criteria:**  
The user understands local discovery, profile saving, and transfer confirmation.

---

### 8.4.11 Plugin Manager

**JPE explanation:**  
“Plugins add new tools to NEURODECK. Only enable plugins you trust.”

**Viewfinder:** Safety Viewfinder around plugin install and permissions.

**Animation:** Plugin card opens, permissions are reviewed, plugin is enabled, new tool appears in nav.

**Controller hint:**  
A = Open plugin  
X = Enable/disable  
Y = View permissions

**Acceptance Criteria:**  
The user understands plugin permissions, enabling, disabling, and where new plugin steps appear.

---

### 8.4.12 Theme Manager

**JPE explanation:**  
“Themes change how NEURODECK looks. You can pick high contrast, reduced glow, Steam Deck LCD-safe, or full Tactical Glass.”

**Viewfinder:** Split Viewfinder showing theme list and live preview.

**Animation:** Theme token changes surface, accent, and focus state without reloading the app.

**Controller hint:**  
A = Apply theme  
X = Preview  
Y = Accessibility options

**Acceptance Criteria:**  
The user understands previewing, applying, and accessibility-safe themes.

---

### 8.4.13 Diagnostics

**JPE explanation:**  
“Diagnostics show what is working, what is slow, and what needs attention.”

**Viewfinder:** Panel Viewfinder around diagnostics widgets.

**Animation:** Latency, model status, memory usage, and connection health update in place.

**Controller hint:**  
A = Open widget  
X = Run health check  
Y = Copy report

**Acceptance Criteria:**  
The user understands diagnostics as the app’s health dashboard.

---

### 8.4.14 Settings

**JPE explanation:**  
“Settings are where you control behavior, privacy, appearance, models, shortcuts, and accessibility.”

**Viewfinder:** Panel Viewfinder around Settings categories.

**Animation:** User changes reduced motion, updates controller shortcuts, and saves profile.

**Controller hint:**  
A = Open setting  
B = Back  
X = Reset section  
Y = Help for setting

**Acceptance Criteria:**  
The user understands where to customize the app safely.

---

## 8.5 Auto-Updating Onboarding System

The wizard must automatically discover and include onboarding steps from each feature module.

### Required Architecture

Each feature exports an onboarding manifest.

```ts
export interface OnboardingManifest {
  featureId: string;
  featureName: string;
  version: string;
  priority: number;
  category: 'core' | 'tool' | 'security' | 'advanced' | 'plugin';
  minAppVersion?: string;
  anchors: OnboardingAnchor[];
  steps: OnboardingStep[];
  changelog?: OnboardingChange[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  jpeText: string;
  technicalText?: string;
  viewfinderType: 'spotlight' | 'panel' | 'split' | 'controller' | 'timeline' | 'safety' | 'emptyState';
  anchorId?: string;
  animation?: OnboardingAnimation;
  inputHints: InputHint[];
  required?: boolean;
  skippable: boolean;
  estimatedSeconds: number;
  conditions?: OnboardingCondition[];
}
```

### Auto-Update Behavior

- On app startup, the onboarding registry scans enabled feature manifests.
- New steps are compared against local onboarding progress.
- If a new feature is added, the wizard creates a “What’s New” mini-tour.
- If a feature updates its tutorial version, only changed steps are marked as new.
- Disabled features do not appear in the default tour.
- Plugin-provided onboarding appears only after plugin trust and permissions are accepted.
- Broken or invalid manifests are ignored and logged without breaking onboarding.

### Local Progress Storage

Persist:

- Completed steps
- Skipped steps
- Last active step
- Animation preference
- Reduced motion preference
- Last seen feature version
- Last seen onboarding manifest version
- User-selected explanation depth

### Required Storage

Use local app storage controlled by the app shell, not random scattered component state.

Recommended shape:

```ts
interface OnboardingProgressState {
  userId: string | 'local';
  completedStepIds: string[];
  skippedStepIds: string[];
  dismissedFeatureIds: string[];
  lastSeenManifestVersions: Record<string, string>;
  explanationMode: 'jpe' | 'balanced' | 'technical';
  motionMode: 'full' | 'reduced' | 'none';
  lastUpdatedAt: string;
}
```

---

## 8.6 Contextual Help Mode

After onboarding, users can open “Show Me This” from any tool.

### Entry Points

- Help button in the title bar.
- Command Palette: “Show me this screen.”
- Tool header: “Learn this tool.”
- Empty state CTA: “Show me how.”
- Settings: Replay onboarding.
- Keyboard shortcut.
- Controller shortcut.

### Behavior

- Opens only the relevant tool steps.
- Uses the current screen as the tutorial background.
- Does not reset full onboarding progress.
- Shows new feature steps after app updates.

---

## 8.7 Performance Requirements

### Startup

- Onboarding must not block initial app render.
- Onboarding registry initialization target: under 50ms on Steam Deck-class hardware.
- Full onboarding shell must lazy-load after app interactive state.
- Animation assets must not be fetched until the step is visible or next in queue.

### Runtime

- Overlay must maintain 60 FPS target on Steam Deck UI interactions.
- Viewfinder position calculation must be throttled/debounced during resize.
- Use `transform` and `opacity` animations only where possible.
- Avoid expensive layout reads during animation frames.
- Cache anchor geometry only while step is active.
- Dispose animation resources on step exit.

### Asset Budgets

- Core onboarding shell JS chunk target: under 75KB gzipped.
- Per-feature onboarding chunk target: under 30KB gzipped.
- Static fallback image target: under 80KB.
- Lottie animation target: under 120KB.
- WebM animation target: under 500KB, only for complex flows.
- No full onboarding media bundle loaded at startup.

---

## 8.8 Accessibility Requirements

- Must support reduced motion.
- Must support no animation mode.
- Must support high contrast.
- Must support keyboard-only navigation.
- Must support controller-only navigation.
- Must support screen reader labels for wizard controls.
- Must provide captions or text equivalents for every animation.
- Must not rely on color alone.
- Must not include flashing effects.
- Must preserve focus order.
- Must provide visible focus indicators.
- Must allow text scaling.
- Must support readable JPE text at 1280x800.

---

## 8.9 Security and Privacy Requirements

- Onboarding must never expose secrets, tokens, file paths, VPN credentials, or private memory contents in demo text.
- Demo data must be generic and clearly separated from real user data.
- Plugin onboarding steps must be permission-gated.
- Security-sensitive steps must use Safety Viewfinder styling.
- Any workflow involving API keys, plugins, local files, terminal, VPN, memory, or sync must include a plain-language safety note.
- Onboarding manifests must be validated before rendering.
- Unknown manifest fields must be ignored safely.
- Invalid animation paths must fall back to static help.

---

## 8.10 Telemetry and Analytics

Telemetry must be local-first and privacy-respecting.

### Track Locally

- Step viewed
- Step completed
- Step skipped
- Animation replayed
- User opened technical details
- User disabled motion
- User exited onboarding
- Feature tutorial replayed

### Do Not Track

- User prompt content
- API keys
- Private memory contents
- Terminal command output
- Browser page contents
- File names unless user explicitly exports diagnostics

### Product Use

Use onboarding analytics to improve flow length, identify confusing steps, and detect features that need better explanation.

---

## 9. User Flow

### 9.1 First Launch Flow

1. App loads normally.
2. Essential readiness checks complete.
3. Wizard prompt appears: “Want a 2-minute tour?”
4. User chooses:
   - Start Tour
   - Quick Setup Only
   - Skip For Now
   - Accessibility Setup First
5. Wizard starts with Workspace and Command Palette.
6. User completes core steps.
7. Wizard offers optional tool tours.
8. User lands in usable workspace.

### 9.2 Returning User With New Features

1. App detects new onboarding manifests.
2. Non-blocking toast appears: “3 new tools have quick demos.”
3. User can start, dismiss, or open later.
4. Completed old steps are not replayed.

### 9.3 Contextual Tool Help

1. User opens a tool.
2. User selects “Show me this.”
3. Wizard opens only relevant steps.
4. User exits back to the exact previous app state.

---

## 10. Screen Requirements

### 10.1 Welcome Screen

Must include:

- NEURODECK logo/wordmark area.
- 1-sentence JPE explanation.
- Start Tour.
- Quick Setup Only.
- Skip For Now.
- Accessibility Setup First.
- Estimated time.
- Controller hints.

### 10.2 Wizard Card

Must include:

- Step title.
- JPE explanation.
- Optional “More detail” expansion.
- Animation panel or static fallback.
- Input hints.
- Progress indicator.
- Back / Next / Skip controls.
- Reduced motion toggle.

### 10.3 Viewfinder Overlay

Must include:

- Target frame.
- Accessible label.
- Tooltip/card anchor.
- Optional connector line.
- Optional controller button map.
- Fallback card if target missing.

### 10.4 What’s New Mini-Tour

Must include:

- Feature name.
- “Why this matters” in JPE.
- New step count.
- Start / Later / Dismiss.
- No forced interruption.

---

## 11. Technical Architecture

### 11.1 Modules

Recommended structure:

```txt
src/
  onboarding/
    OnboardingProvider.tsx
    OnboardingOverlay.tsx
    OnboardingRegistry.ts
    OnboardingProgressStore.ts
    OnboardingViewfinder.tsx
    OnboardingAnimation.tsx
    onboarding.types.ts
    onboarding.selectors.ts
    onboarding.validation.ts
  features/
    workspace/
      onboarding.manifest.ts
    models/
      onboarding.manifest.ts
    agents/
      onboarding.manifest.ts
    memory/
      onboarding.manifest.ts
```

### 11.2 Feature Anchor Standard

Every onboardable UI element must provide a stable anchor.

```tsx
<button data-onboarding-anchor="command-palette-trigger">
  Command Palette
</button>
```

### 11.3 Manifest Loading

- Core manifests are statically registered.
- Feature manifests are dynamically imported.
- Plugin manifests are loaded only after plugin trust validation.
- Registry sorts steps by priority, category, and dependency.

### 11.4 Step Conditions

Steps can be conditional.

Examples:

- Show Model setup only if no model is connected.
- Show Empty Session guidance only if no sessions exist.
- Show VPN guidance only if VPN feature is enabled.
- Show Plugin safety only if plugins are installed or available.
- Show Steam Deck controls only when controller mode is active.

---

## 12. Animation System Details

### Animation Component Requirements

- Accept animation metadata from manifest.
- Render static fallback first.
- Lazy-load animated asset.
- Respect reduced motion.
- Pause when step is not visible.
- Destroy on unmount.
- Expose replay button.

### Example Metadata

```ts
animation: {
  type: 'lottie',
  src: () => import('./animations/model-connect.lottie.json'),
  fallbackSrc: '/assets/onboarding/model-connect-fallback.webp',
  durationMs: 4200,
  loop: false,
  caption: 'A model connects, passes health check, and becomes ready.'
}
```

---

## 13. JPE Writing Standards

### Rules

- Use plain language.
- Keep sentences short.
- Explain what the tool does before explaining how.
- Avoid jargon unless the user opens “More detail.”
- Use examples tied to real workflows.
- Never talk down to the user.
- Use confident, helpful language.

### Format

Each step should include:

1. What this is.
2. Why it matters.
3. What to press.
4. What happens next.

### Example

Bad:

“Configure inference provider routing and semantic session persistence.”

Good:

“Pick the AI brain NEURODECK should use. Once it connects, your chats and tools can use that model.”

---

## 14. Acceptance Criteria

### Functional

- First-run wizard appears only when appropriate.
- User can skip onboarding.
- User can replay onboarding.
- Each core tool has at least one onboarding step.
- Each onboarding step has JPE text.
- Each core tool has a matching animation or static fallback.
- Viewfinder correctly anchors to real UI elements.
- Missing anchors fail gracefully.
- New feature manifests automatically appear in the onboarding registry.
- Completed steps are not repeated unless requested.

### Performance

- App remains interactive before onboarding fully loads.
- No onboarding animation blocks startup.
- Overlay animations remain smooth on Steam Deck.
- Per-feature tutorial assets are lazy-loaded.
- Reduced motion disables nonessential animation.

### Accessibility

- Full onboarding can be completed with controller only.
- Full onboarding can be completed with keyboard only.
- Every animation has text equivalent.
- Focus order is correct.
- No flashing or unsafe motion.
- High contrast mode is supported.

### Security

- No secrets appear in onboarding.
- Security-sensitive steps use Safety Viewfinder.
- Plugin onboarding is permission-gated.
- Invalid manifests do not crash onboarding.

---

## 15. QA Test Matrix

### Devices

- Steam Deck LCD 1280x800
- Steam Deck OLED 1280x800
- Windows desktop 1920x1080
- Docked monitor 2560x1440
- Small window 1280x720

### Inputs

- Steam Deck controls
- Xbox controller
- DualSense controller
- Keyboard only
- Mouse only
- Touchscreen

### Modes

- First run
- Returning user
- New feature update
- Reduced motion
- No animation
- High contrast
- Offline mode
- Plugin disabled
- Missing anchor
- Missing animation asset
- Corrupted manifest

---

## 16. Release Phases

### Phase 1 — Core Shell

- Onboarding provider
- Overlay shell
- Progress store
- Basic wizard card
- Skip/resume/replay
- Workspace and Command Palette steps

### Phase 2 — Viewfinder System

- Spotlight Viewfinder
- Panel Viewfinder
- Split Viewfinder
- Fallback behavior
- Controller hints

### Phase 3 — Manifest Registry

- Static core manifests
- Feature-based manifests
- Version comparison
- New feature mini-tour
- Condition handling

### Phase 4 — Animation Layer

- Static fallbacks
- Lazy animation loading
- Lottie/SVG/CSS support
- Reduced motion handling
- Per-feature asset budgets

### Phase 5 — Full Tool Coverage

- Models
- Agents
- Memory
- Sessions
- Browser
- Terminal
- VPN
- Sync/File Transfer
- Plugins
- Themes
- Diagnostics
- Settings

### Phase 6 — Hardening

- Accessibility pass
- Performance pass
- Steam Deck QA
- Plugin manifest validation
- Offline mode testing
- Regression testing

---

## 17. Implementation Prompt for AI Coding Agent

Build the NEURODECK Adaptive Onboarding Wizard 2.0 for an Electron + React + TypeScript + Tailwind app. Implement a modular onboarding system with a provider, overlay shell, viewfinder system, feature manifest registry, local progress store, animation component, and tool-specific onboarding manifests.

The wizard must be fast, lazy-loaded, controller-first, Steam Deck-ready, accessible, and non-blocking. It must use JPE text for user-facing explanations. Every major tool must have a corresponding onboarding step, viewfinder type, input hint, and lightweight animation or static fallback. New features must be able to register onboarding steps through versioned manifests so the wizard can auto-update and show “What’s New” mini-tours without hardcoding every step in the shell.

Do not use mocked feature state. Connect onboarding conditions to real application state selectors. Do not preload all animation assets. Do not block app startup. Do not use heavy blur, shader effects, full-screen particle animations, or large video files. Respect reduced motion, high contrast, keyboard navigation, controller navigation, and screen reader labels.

Required deliverables:

1. `src/onboarding/onboarding.types.ts`
2. `src/onboarding/OnboardingProvider.tsx`
3. `src/onboarding/OnboardingOverlay.tsx`
4. `src/onboarding/OnboardingViewfinder.tsx`
5. `src/onboarding/OnboardingAnimation.tsx`
6. `src/onboarding/OnboardingRegistry.ts`
7. `src/onboarding/OnboardingProgressStore.ts`
8. `src/onboarding/onboarding.validation.ts`
9. Feature manifests for Workspace, Command Palette, Models, Agents, Memory, Sessions, Browser, Terminal, VPN, Sync, Plugins, Themes, Diagnostics, and Settings.
10. Unit tests for registry loading, progress persistence, condition evaluation, invalid manifests, reduced motion, and missing anchors.
11. E2E tests for first-run onboarding, skipping, replaying, controller navigation, and new feature mini-tour behavior.
12. Performance verification showing onboarding does not block startup and animation assets are lazy-loaded.

