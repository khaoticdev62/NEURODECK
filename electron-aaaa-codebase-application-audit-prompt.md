# Electron AAAA Codebase & Application Audit Prompt

## Purpose

Use this prompt with Kimi Code or another advanced coding agent when you need a full deep-level audit, repair, hardening, polish, and release-readiness pass for an Electron application.

This prompt is specifically adjusted for Electron applications, including:

- Electron main process
- Electron preload scripts
- Electron renderer process
- IPC communication
- BrowserWindow security
- Context isolation
- Node integration
- Sandboxing
- Native OS access
- File system access
- Protocol handlers
- Deep links
- Auto updates
- Code signing
- Packaging
- Installer behavior
- Desktop UX
- Accessibility
- Animation quality
- Performance
- Testing
- CI/CD
- Release readiness

AAAA is used here as an internal product-quality standard. WCAG officially defines A, AA, and AAA accessibility levels. This document uses AAAA to mean a premium internal engineering, security, UX, accessibility, and fidelity standard that goes beyond basic compliance.

---

# ROLE

You are a senior principal Electron architect, senior full-stack engineer, senior UX designer, senior QA automation engineer, senior desktop application security engineer, accessibility specialist, animation/motion designer, performance engineer, and release readiness lead.

Your task is to perform a complete deep-level audit, refinement, hardening, and implementation pass across this entire Electron application and codebase.

You must inspect every meaningful part of the app and elevate it to an internal AAAA-quality standard.

AAAA means:

- Architecturally clean
- Production-grade
- Fully secured and hardened
- Electron-security-aware
- IPC-safe
- Highly accessible
- Visually polished
- Responsive across desktop, handheld, and docked displays
- Smoothly animated without harming usability
- Tested thoroughly
- Maintainable
- Scalable
- Documented
- Reliable under edge cases
- Ready for real users

Do not only report issues. Fix them directly in the codebase.

---

# PRIMARY OBJECTIVE

Perform a complete application-wide audit and implementation pass covering:

- Electron architecture
- Main process quality
- Preload script safety
- Renderer process quality
- IPC design and security
- BrowserWindow security
- Native OS integration
- File system access
- Protocol/deep-link handling
- Auto-update safety
- Packaging and distribution
- Code signing readiness
- Code quality
- Folder structure
- Naming conventions
- Component design
- State management
- API design
- Database/data access, if present
- Security
- Authentication
- Authorization
- Secrets handling
- Error handling
- Logging
- Accessibility
- Keyboard navigation
- Screen reader usability
- Responsive design
- Steam Deck / handheld support
- Desktop window resizing behavior
- Layout fidelity
- Visual polish
- Design system consistency
- Typography
- Spacing
- Animation and motion quality
- Performance
- Bundle size
- Startup time
- Memory usage
- Loading behavior
- Testing
- Edge cases
- CI/CD readiness
- Documentation
- Developer experience
- Release readiness

The final result should feel like a premium, hardened, production-ready Electron application.

No half-polish. No fake security. No “it opens on my machine” energy.

---

# HARD RULES

1. Do not break existing functionality.
2. Do not remove features unless they are dead, unsafe, or clearly unused.
3. Do not rewrite the entire app unnecessarily.
4. Do not introduce random architecture changes without clear value.
5. Do not hide bugs behind comments, TODOs, disabled code, or skipped tests.
6. Do not skip failing tests.
7. Do not weaken tests to make them pass.
8. Do not expose secrets.
9. Do not add fake accessibility.
10. Do not add animation that harms usability.
11. Do not over-engineer simple parts of the app.
12. Do not add unnecessary dependencies.
13. Do not create generic documentation fluff.
14. Do not make cosmetic changes that conflict with the app’s identity.
15. Do not enable insecure Electron settings to “make it work.”
16. Do not expose raw Node.js, `ipcRenderer`, `fs`, `child_process`, `shell`, or OS APIs directly to the renderer.
17. Do not trust renderer input.
18. Do not trust IPC payloads.
19. Do not ship dev tools, debug endpoints, or debug shortcuts in production unless explicitly intended and protected.
20. Every change must improve security, quality, maintainability, usability, performance, fidelity, accessibility, or reliability.

---

# INTERNAL AAAA QUALITY BAR

Treat this as the application’s highest quality target.

## Engineering

AAAA engineering means:

- Clean, readable code
- Strong typing
- Clear main/preload/renderer boundaries
- Reusable modules
- No duplicated logic
- No fragile hacks
- No dead code
- No accidental complexity
- Clear error handling
- Predictable state management
- Safe async behavior
- Strong validation
- Maintainable file structure
- Stable build and packaging process

## Electron Architecture

AAAA Electron architecture means:

- Main process handles privileged operations
- Renderer process remains unprivileged
- Preload exposes minimal, typed, validated APIs
- IPC channels are explicit and allowlisted
- IPC payloads are validated
- Context isolation is enabled
- Node integration is disabled in renderer
- Sandbox is enabled where possible
- Remote module is disabled
- BrowserWindow options are secure
- External URLs are allowlisted
- File and protocol handling is safe
- Updates are signed and safe
- App lifecycle is predictable

## UX/UI

AAAA UX/UI means:

- Consistent spacing
- Consistent sizing
- Consistent typography
- Smooth navigation
- Stable layouts
- Clear hierarchy
- Responsive resizing
- Polished empty/loading/error states
- Proper touch targets where applicable
- Strong visual rhythm
- No awkward layout jumps
- No accidental horizontal scroll
- Desktop-native expectations are respected

## Security

AAAA security means:

- Hardened Electron runtime
- Hardened auth
- Hardened authorization
- Server-side or main-process access control
- Validated inputs
- Validated IPC
- Safe API responses
- No exposed secrets
- Safe headers
- Safe CSP
- Safe CORS/CSRF posture where applicable
- Safe logging
- Secure dependency posture
- No renderer-side trust for privileged decisions
- No unsafe OS access from renderer

## Accessibility

AAAA accessibility means:

- Keyboard usable
- Screen-reader understandable
- Semantic HTML
- Proper labels
- Proper focus management
- Accessible dialogs
- Accessible forms
- Accessible errors
- No hover-only critical interactions
- Strong contrast
- Works at high zoom
- Motion can be reduced
- Desktop accessibility expectations are met

## Animation

AAAA animation means:

- Purposeful motion
- Smooth transitions
- No jank
- No motion spam
- Respects reduced motion
- Supports UX clarity
- Does not block interaction
- Does not obscure content
- Does not harm performance
- Does not cause unnecessary CPU/GPU load

## Testing

AAAA testing means:

- Meaningful coverage
- Critical flows tested
- Settings tested
- Navigation tested
- IPC tested
- Electron main/preload behavior tested where practical
- API tested
- Auth tested
- Edge cases tested
- Accessibility tested where supported
- Responsive/window resizing flows tested where supported
- CI-ready

---

# DISCOVERY PHASE

Begin by scanning the entire repository.

Identify:

- Project name
- App purpose
- Electron version
- Electron builder/packager system
- Electron Forge, Electron Builder, Electron Vite, Vite, Webpack, or custom build pipeline
- Runtime
- Language
- Package manager
- Frontend framework
- Backend framework, if present
- Main process entry point
- Preload entry point
- Renderer entry point
- Routing system
- API architecture
- Auth system
- Database/ORM, if present
- State management
- Styling system
- Component library
- Animation library
- Testing tools
- E2E tools
- Accessibility tooling
- Linting tools
- Formatting tools
- CI/CD setup
- Deployment target
- Packaging target
- Auto-update strategy
- Environment variable pattern
- Existing folder structure
- Existing design system
- Existing docs
- Existing security posture
- Existing performance bottlenecks

Then create an internal application map before changing anything.

---

# APPLICATION MAP REQUIREMENT

Create or update:

```txt
docs/application-audit-map.md
```

This document should include:

- App overview
- Tech stack
- Electron architecture
- Main process responsibilities
- Preload API surface
- Renderer responsibilities
- IPC channel inventory
- Core features
- Routes/views
- API routes, if present
- Auth boundaries
- User roles, if present
- Settings
- Navigation paths
- Major components
- Shared utilities
- Data models
- External services
- Native OS integrations
- File system access points
- Protocol/deep-link handlers
- Auto-update flow
- Security-sensitive flows
- Accessibility-sensitive flows
- Performance-sensitive screens
- Current risk areas

Use this structure:

```md
# Application Audit Map

## App Overview

## Tech Stack

## Electron Architecture

## Main Process Responsibilities

## Preload API Surface

## Renderer Responsibilities

## IPC Channel Inventory

| Channel | Direction | Caller | Handler | Payload Schema | Auth/Permission | Risk | Status |
|---|---|---|---|---|---|---|---|

## Core Features

## Routes / Views

## API Routes

## Auth and Permission Boundaries

## User Roles

## Settings and Preferences

## Navigation System

## Major Components

## Shared Libraries and Utilities

## Data Models

## External Integrations

## Native OS Integrations

## File System Access Points

## Protocol and Deep-Link Handlers

## Auto-Update Flow

## Security-Sensitive Flows

## Accessibility-Sensitive Flows

## Performance-Sensitive Screens

## Current Risk Areas
```

---

# AUDIT CATEGORY 1: ELECTRON ARCHITECTURE QUALITY

Audit and fix:

- Main process doing too much
- Renderer process handling privileged operations
- Preload exposing too much
- IPC channels scattered across the codebase
- Missing IPC schema validation
- Missing IPC permission checks
- Unclear main/preload/renderer boundaries
- BrowserWindow creation duplicated unsafely
- Confusing app lifecycle handling
- Mixed build targets
- Renderer importing Node-only modules
- Preload importing unsafe or oversized dependencies
- Main process tightly coupled to UI components
- Renderer directly controlling OS behavior
- Weak separation between desktop shell and product UI
- Unclear feature boundaries
- Circular dependencies
- Unclear naming
- Overly deep imports
- God files

Refine architecture so that:

- Main process handles privileged OS and app lifecycle work
- Preload exposes a narrow, typed bridge
- Renderer handles UI only
- IPC contracts are centralized and validated
- BrowserWindow creation is centralized and secure
- Native integrations are isolated behind safe services
- Features are easy to locate
- Shared code is clearly separated
- Components are focused
- Business logic is reusable
- API/data access logic is centralized where appropriate
- Types are shared safely
- Imports are clean
- The codebase is easier to onboard into

Do not over-abstract. Boring, clear Electron code beats “desktop enterprise lasagna.”

---

# AUDIT CATEGORY 2: RECOMMENDED ELECTRON PROJECT STRUCTURE

Audit and refine the project structure.

A clean Electron app often benefits from a structure similar to:

```txt
src/
  main/
    index.ts
    app/
    windows/
    ipc/
    services/
    security/
    updater/
    protocols/
    menu/
    tray/
    shortcuts/
    logging/
  preload/
    index.ts
    api/
    contracts/
  renderer/
    app/
    routes/
    components/
    features/
    hooks/
    stores/
    styles/
    assets/
  shared/
    types/
    constants/
    schemas/
    utils/
tests/
  unit/
  integration/
  e2e/
docs/
scripts/
resources/
public/
```

Use this only if it fits the project.

If the project already uses Electron Forge, Electron Builder, Electron Vite, Vite, Webpack, Next.js, React, Vue, Svelte, Angular, or another strong convention, respect those conventions first.

Do not restructure recklessly. Move files only when it improves clarity and all imports/configs are updated.

---

# AUDIT CATEGORY 3: ELECTRON SECURITY HARDENING

Audit and fix Electron security issues.

## Required BrowserWindow Security

Every BrowserWindow must be reviewed.

Check and fix:

- `nodeIntegration`
- `contextIsolation`
- `sandbox`
- `enableRemoteModule`
- `webSecurity`
- `allowRunningInsecureContent`
- `experimentalFeatures`
- `devTools`
- `preload`
- `partition`
- `backgroundThrottling`
- navigation handling
- new window handling
- permission handling

Secure defaults should generally include:

```ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    enableRemoteModule: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    preload: preloadPath,
  },
});
```

Only deviate when the app has a clear reason and the risk is documented.

## Required Navigation Hardening

Audit and fix:

- `will-navigate`
- `setWindowOpenHandler`
- external links
- redirects
- deep links
- protocol handlers
- webviews
- iframes

Requirements:

- Prevent arbitrary navigation inside app windows.
- External links should open through `shell.openExternal` only after URL validation.
- Allowlist trusted origins.
- Block `javascript:` URLs.
- Block dangerous protocols.
- Prevent arbitrary new windows.
- Prevent phishing-style navigation inside the app shell.

Example pattern:

```ts
const allowedOrigins = new Set([
  "https://example.com",
]);

mainWindow.webContents.on("will-navigate", (event, url) => {
  const parsed = new URL(url);
  if (!allowedOrigins.has(parsed.origin)) {
    event.preventDefault();
  }
});

mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  const parsed = new URL(url);

  if (allowedOrigins.has(parsed.origin)) {
    shell.openExternal(url);
  }

  return { action: "deny" };
});
```

Adapt this to the app’s actual trusted origins.

## Required Permission Hardening

Audit and fix:

- camera permission
- microphone permission
- notifications permission
- geolocation permission
- clipboard permission
- media permission
- MIDI/USB/Bluetooth/serial permission if applicable
- file access prompts
- download behavior

Use `session.setPermissionRequestHandler` where appropriate.

Deny by default. Allow only what the app explicitly needs.

## Required Webview Hardening

If the app uses `<webview>`, audit and fix:

- untrusted content
- preload exposure
- node integration
- partition
- navigation
- permissions
- new window behavior
- IPC bridge exposure

Avoid `<webview>` unless required. If required, harden heavily.

---

# AUDIT CATEGORY 4: PRELOAD AND CONTEXT BRIDGE SECURITY

Audit and fix preload scripts.

Search for:

- raw `ipcRenderer` exposed to renderer
- raw `fs` exposed to renderer
- raw `shell` exposed to renderer
- raw `child_process` exposed to renderer
- raw `process` exposed to renderer
- broad generic APIs like `window.electron.send(channel, payload)`
- dynamic arbitrary IPC channels
- unvalidated payloads
- unsafe callbacks
- unsafe event listeners
- memory leaks from listeners
- no cleanup/unsubscribe functions
- no TypeScript types for exposed API

Requirements:

- Expose a narrow API using `contextBridge.exposeInMainWorld`.
- Every exposed method must map to a specific allowlisted IPC channel.
- No generic IPC send/invoke escape hatches.
- Payloads must be validated.
- Return values must be typed.
- Event subscriptions must return unsubscribe functions.
- Renderer must not receive privileged raw objects.

Bad pattern:

```ts
contextBridge.exposeInMainWorld("electron", {
  send: (channel: string, data: unknown) => ipcRenderer.send(channel, data),
  invoke: (channel: string, data: unknown) => ipcRenderer.invoke(channel, data),
});
```

Good pattern:

```ts
contextBridge.exposeInMainWorld("appApi", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (payload: UpdateSettingsPayload) =>
    ipcRenderer.invoke("settings:update", payload),
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info);
    ipcRenderer.on("update:available", handler);

    return () => ipcRenderer.removeListener("update:available", handler);
  },
});
```

Also add or update global window typings:

```ts
declare global {
  interface Window {
    appApi: AppApi;
  }
}
```

---

# AUDIT CATEGORY 5: IPC SECURITY AND RELIABILITY

Create or update an IPC inventory.

Audit and fix:

- Missing payload validation
- Missing response validation
- Missing permission checks
- Dynamic channel names
- Generic bridge APIs
- Duplicate handlers
- Handlers registered multiple times
- Handlers that never unregister
- Sensitive data sent to renderer
- IPC handlers performing unsafe file operations
- IPC handlers executing shell commands
- IPC handlers trusting renderer paths
- IPC handlers trusting renderer user IDs
- IPC handlers returning raw errors
- IPC handlers leaking stack traces
- IPC handlers blocking the main process
- Long-running tasks without progress/cancellation
- Race conditions
- No timeout behavior
- No cancellation behavior for long operations

Requirements:

- Centralize IPC channel names.
- Use shared schemas for payloads.
- Validate all IPC input.
- Validate and sanitize output where needed.
- Enforce permissions in main process.
- Keep handlers small and delegated to services.
- Return safe error objects.
- Never trust renderer-supplied file paths without validation.
- Never execute renderer-supplied commands.
- Use async safely.
- Avoid blocking the main process.

Recommended structure:

```txt
src/main/ipc/
  index.ts
  channels.ts
  register-settings-handlers.ts
  register-file-handlers.ts
  register-update-handlers.ts

src/shared/schemas/
  settings.schema.ts
  file.schema.ts

src/preload/api/
  settings-api.ts
  file-api.ts
```

---

# AUDIT CATEGORY 6: FILE SYSTEM AND NATIVE OS ACCESS

Audit and fix all file system and native OS access.

Search for:

- `fs`
- `fs/promises`
- `path`
- `os`
- `child_process`
- `exec`
- `spawn`
- `shell`
- `dialog`
- `clipboard`
- `nativeImage`
- `desktopCapturer`
- `globalShortcut`
- `powerMonitor`
- `screen`
- `Notification`
- file read/write helpers
- export/import flows
- drag-and-drop file handling
- download handling

Requirements:

- File access must happen in main process, not renderer.
- Renderer must request specific safe operations through typed IPC.
- Validate file extensions.
- Validate file size.
- Validate paths.
- Prevent path traversal.
- Use OS dialogs where appropriate.
- Do not allow arbitrary renderer-controlled writes.
- Do not allow arbitrary renderer-controlled command execution.
- Do not expose private user directories accidentally.
- Normalize file paths.
- Keep dangerous operations behind explicit user action.
- Log safely without leaking full sensitive paths where unnecessary.

For shell commands:

- Avoid `exec`.
- Prefer safe APIs.
- If unavoidable, use fixed commands and validated arguments.
- Never pass raw renderer input into shell execution.

---

# AUDIT CATEGORY 7: PROTOCOLS, DEEP LINKS, AND EXTERNAL URLS

Audit and fix:

- custom protocol handlers
- deep links
- open-url handlers
- second-instance handling
- file protocol usage
- custom `app://` protocols
- external URL opening
- OAuth callback URLs
- magic links
- login redirects

Requirements:

- Validate all incoming URLs.
- Allowlist protocols and hosts.
- Safely parse URL parameters.
- Do not execute actions directly from untrusted deep links without validation.
- Do not allow open redirects.
- Do not leak tokens in logs.
- Avoid placing sensitive tokens in URLs where possible.
- Handle malformed URLs safely.
- Handle repeated/duplicate deep links safely.
- Handle app not ready yet when deep link arrives.

---

# AUDIT CATEGORY 8: AUTO UPDATE AND RELEASE SECURITY

Audit and fix:

- auto-update configuration
- update feed URL
- code signing requirements
- update signature verification
- update channel separation
- dev/prod update behavior
- update error handling
- rollback behavior
- update notification UX
- forced updates
- optional updates
- download progress
- update install prompts
- update logs

Requirements:

- Updates should come from trusted HTTPS endpoints.
- Signed updates should be used where platform supports it.
- Dev builds should not accidentally use production update channels.
- Prod builds should not use insecure local/test feeds.
- Update errors should be safe and understandable.
- Update prompts should not trap users.
- Update IPC events should be typed and safe.
- Do not leak update tokens or private URLs into renderer logs.

If the app does not have updates yet, document safe future requirements instead of inventing a broken updater.

---

# AUDIT CATEGORY 9: PACKAGING, CODE SIGNING, AND INSTALLER QUALITY

Audit and fix:

- Electron Builder / Forge config
- app ID
- product name
- artifact names
- icons
- app metadata
- ASAR settings
- extra resources
- files included in package
- files accidentally included
- `.env` included in package
- source maps included unintentionally
- dev files included
- test files included
- docs included unintentionally
- platform-specific config
- Windows installer behavior
- macOS signing/notarization readiness
- Linux AppImage/deb/rpm behavior
- auto-update compatibility
- native dependency packaging
- unpacked resources
- file associations
- protocol associations

Requirements:

- Package only what is needed.
- Do not package secrets.
- Do not package `.env`.
- Do not package test fixtures unless required.
- Do not package unnecessary source maps in production unless intentional.
- App icons should be correct.
- Product metadata should be consistent.
- Installer behavior should be documented.
- Code signing requirements should be documented.
- Platform-specific caveats should be documented.

Create or update:

```txt
docs/release-readiness.md
docs/packaging.md
```

if useful.

---

# AUDIT CATEGORY 10: ELECTRON FUSES AND RUNTIME LOCKDOWN

If the project supports Electron Fuses or equivalent hardening, audit and configure where appropriate.

Review:

- runAsNode
- enableCookieEncryption
- enableNodeOptionsEnvironmentVariable
- enableNodeCliInspectArguments
- embeddedAsarIntegrityValidation
- onlyLoadAppFromAsar

Do not apply fuse changes blindly. Document compatibility concerns.

When safe, prefer production-hardening fuses that reduce runtime attack surface.

---

# AUDIT CATEGORY 11: CODE QUALITY

Audit and fix:

- TypeScript errors
- Weak `any` usage
- Unsafe casts
- Unused variables
- Unused imports
- Dead functions
- Duplicate logic
- Unreachable branches
- Poor naming
- Confusing conditionals
- Repeated magic numbers
- Missing error handling
- Promise handling issues
- Race conditions
- Memory leaks
- React key issues
- Missing cleanup in effects
- Incorrect dependency arrays
- Excessive prop drilling
- Inconsistent return shapes
- Inconsistent async patterns
- Inconsistent error objects
- Main/preload/renderer type confusion

Requirements:

- Prefer strong types.
- Prefer explicit return types for important functions.
- Prefer small focused functions.
- Prefer readable logic over clever tricks.
- Remove dead code safely.
- Keep public APIs stable unless there is a strong reason.
- Fix lint/typecheck issues properly.

---

# AUDIT CATEGORY 12: UI FIDELITY AND DESIGN SYSTEM

Audit and fix:

- Inconsistent spacing
- Inconsistent typography
- Inconsistent button sizes
- Inconsistent card padding
- Inconsistent border radius
- Inconsistent shadows
- Inconsistent icon sizing
- Misaligned elements
- Weak visual hierarchy
- Poor contrast
- Overcrowded layouts
- Awkward empty space
- Unpolished loading states
- Unpolished empty states
- Unpolished error states
- Low-quality form layouts
- Broken responsive grids
- Poor modal sizing
- Poor sidebar behavior
- Poor nav active states
- Visual drift between pages
- Poor desktop window resizing behavior
- Title bar layout issues
- Custom window control issues
- Native menu mismatch
- Tray/menu UX issues

Refine:

- Page shells
- Layout wrappers
- Cards
- Buttons
- Inputs
- Tables
- Forms
- Modals
- Drawers
- Navigation
- Toasts
- Alerts
- Badges
- Tabs
- Dropdowns
- Empty states
- Loading states
- Error states
- Desktop title bar, if custom
- App menus
- Tray UI, if present

The app should feel intentionally designed, not assembled during a caffeine hostage situation.

---

# AUDIT CATEGORY 13: RESPONSIVE, RESIZABLE, AND DESKTOP WINDOW DESIGN

Electron apps must handle window resizing like grown-up desktop software.

Test and fix the app across:

## Minimum Window Sizes

- Current configured minimum width/height
- 320 × 568, if allowed
- 800 × 600
- 1024 × 768

## Common Desktop Windows

- 1280 × 720
- 1280 × 800
- 1366 × 768
- 1440 × 900
- 1536 × 864
- 1600 × 900
- 1920 × 1080
- 2560 × 1440
- 3440 × 1440, if appropriate

## Steam Deck / Handheld

- 1280 × 800
- 1280 × 720
- 1366 × 768
- 1920 × 1080 docked

Fix:

- Horizontal scroll
- Cramped layouts
- Over-wide content
- Poor max-width usage
- Bad mobile/compact navigation
- Tablet layout awkwardness
- Steam Deck compact landscape issues
- Tiny tap targets
- Modals exceeding viewport
- Tables overflowing the page
- Sticky elements blocking content
- Text wrapping failures
- Cards stretching awkwardly
- Custom title bar overlap
- Window control collisions
- Resize jank
- Layout collapse at minimum size

Audit BrowserWindow constraints:

- `minWidth`
- `minHeight`
- `width`
- `height`
- `resizable`
- `fullscreenable`
- `maximizable`
- `useContentSize`
- kiosk/fullscreen behavior, if present

Window constraints should match UI reality. Do not allow a window size the UI cannot survive.

---

# AUDIT CATEGORY 14: ANIMATION AND MOTION QUALITY

Audit all animations and transitions.

Check:

- Page/view transitions
- Route transitions
- Modal animations
- Drawer animations
- Dropdown animations
- Hover states
- Focus states
- Button feedback
- Loading animations
- Skeletons
- Toast animations
- Sidebar collapse/expand
- Tab transitions
- Accordion transitions
- Drag/drop behavior, if present
- Chart/data animations, if present
- Window resize transitions
- Custom title bar transitions
- Tray/menu interactions, if custom

Fix animation issues:

- Jank
- Layout shift
- Overly slow transitions
- Overly flashy motion
- Motion that delays interaction
- Motion that hides content
- Animations that ignore reduced-motion preferences
- Animations that cause performance drops
- Animations that conflict with state changes
- Animations that fire on every render unnecessarily
- Animations that consume excessive CPU/GPU on desktop or handheld devices

Requirements:

- Motion should clarify state changes.
- Motion should feel fast and premium.
- Motion should not reduce usability.
- Motion should respect `prefers-reduced-motion`.
- Avoid animating expensive properties when possible.
- Prefer transform/opacity over layout properties.
- Avoid infinite animations unless meaningful.
- Loading animations should not cause visual fatigue.

Example reduced motion pattern:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

Only apply patterns that fit the project.

---

# AUDIT CATEGORY 15: ACCESSIBILITY

Audit and fix accessibility for:

- Semantic HTML
- Heading hierarchy
- Keyboard navigation
- Focus visibility
- Focus order
- Focus trapping
- Skip links
- Form labels
- Error associations
- Required field indicators
- Accessible names
- Icon-only buttons
- Dialog semantics
- Drawer semantics
- Menu semantics
- Tabs semantics
- Accordion semantics
- Toast announcements
- Loading announcements
- Status announcements
- Table headers
- Image alt text
- Decorative image handling
- Color contrast
- Color-only indicators
- Reduced motion
- High zoom behavior
- Screen reader clarity
- Touch target size
- Pointer target size
- Desktop menu accessibility
- Custom title bar accessibility
- Keyboard shortcuts discoverability
- Focus behavior after IPC-driven state changes
- Focus behavior after window/dialog changes

Requirements:

- Buttons must be buttons.
- Links must be links.
- Inputs must have labels.
- Icon buttons must have accessible names.
- Dialogs must have role/name/focus behavior.
- Important async updates should be announced.
- Errors should be connected to fields.
- Keyboard users must be able to complete core flows.
- No critical interaction may require hover only.
- Layout must remain usable at 200% zoom.
- Keyboard shortcuts must not hijack standard OS/browser behavior without reason.
- Custom title bars must not destroy accessibility.

Target WCAG AAA where practical, and internal AAAA where possible.

Do not add ARIA randomly. Bad ARIA is accessibility duct tape over a hole in the floor.

---

# AUDIT CATEGORY 16: SECURITY HARDENING BEYOND ELECTRON

Audit and fix:

- Broken access control
- Auth bypasses
- Missing server-side/main-process auth checks
- Missing authorization checks
- IDOR/BOLA risks
- User ID spoofing
- Role spoofing
- Organization/team boundary failures
- API routes without protection
- Insecure redirects
- Input validation gaps
- XSS risks
- CSRF risks, where web auth is used
- SSRF risks
- CORS risks
- SQL/NoSQL injection risks
- Command injection risks
- Path traversal risks
- Unsafe file uploads
- Unsafe webhooks
- Unsafe logging
- Sensitive error exposure
- Secrets in renderer code
- Secrets in public env vars
- Secrets in logs/docs/static files
- Unsafe cookies
- Missing security headers
- Dependency vulnerabilities
- Supply-chain risks

Security requirements:

- Never trust client-side/renderer values for permissions.
- Validate every request body.
- Validate query params.
- Validate path params.
- Validate every IPC payload.
- Enforce ownership in server/main process.
- Enforce roles in server/main process.
- Filter API responses.
- Do not over-return sensitive fields.
- Use safe error messages.
- Redact logs.
- Keep secrets out of renderer bundles.
- Harden CORS where applicable.
- Review CSRF where cookie auth exists.
- Add secure headers where supported.
- Verify webhook signatures where applicable.
- Ensure destructive actions require proper authorization.

Do not print actual secrets in reports. Redact them.

Use:

```txt
[REDACTED_SECRET_FOUND]
```

---

# AUDIT CATEGORY 17: API AND BACKEND QUALITY

If this Electron app includes or talks to a backend, audit and fix:

- Inconsistent route handlers
- Missing method checks
- Missing validation
- Missing auth
- Missing ownership checks
- Missing pagination limits
- Overly large responses
- Bad error shapes
- Leaky internal errors
- Inconsistent response formats
- Missing rate limits where appropriate
- Unsafe mutation logic
- Missing idempotency
- Race conditions
- Duplicate side effects
- Non-transactional writes
- Unsafe deletes
- Missing soft-delete handling
- Inconsistent status codes

API responses should be:

- Predictable
- Minimal
- Safe
- Properly typed
- Consistent
- Validated
- Secure

---

# AUDIT CATEGORY 18: DATA LAYER AND DATABASE

If the app uses local storage, SQLite, IndexedDB, file-based storage, remote DBs, or an ORM, audit and fix:

- Missing ownership filters
- Missing tenant/org filters
- Over-fetching private fields
- Unsafe includes/joins
- Missing constraints
- Missing transactions
- Race conditions
- Duplicate records
- Invalid states
- Unsafe deletes
- Missing cascade handling
- Missing soft-delete filtering
- Missing indexes for common queries
- Inconsistent schema naming
- Unsafe migrations
- Seed files with unsafe data
- Test data mixed with production patterns
- Renderer directly modifying storage
- Local data stored insecurely
- Sensitive data stored unencrypted
- Corrupted local database recovery
- Local config file corruption
- Concurrent file write issues

Requirements:

- Data access must enforce ownership and permissions.
- Queries should only return needed fields.
- Mutations should validate state transitions.
- Risky writes should be transactional where needed.
- Database errors should not leak internals to users.
- Sensitive local data should be protected appropriately.
- Local data corruption should fail gracefully.

---

# AUDIT CATEGORY 19: PERFORMANCE

Audit and fix:

- Slow app startup
- Slow first window paint
- Excessive bundle size
- Heavy preload scripts
- Heavy main process work at startup
- Blocking synchronous file operations
- Blocking IPC handlers
- Unnecessary renderer client-side code
- Heavy dependencies
- Unused imports
- Inefficient renders
- Missing memoization where useful
- Over-memoization where harmful
- Expensive calculations in render
- Large images
- Missing lazy loading
- Missing code splitting
- Inefficient API requests
- Waterfall requests
- Duplicate fetches
- Unbounded lists
- Tables rendering too much
- Layout thrashing
- Animation jank
- Memory leaks
- Event listener leaks
- IPC listener leaks
- Unnecessary re-renders
- Blocking scripts
- Poor caching
- Poor loading states
- High idle CPU usage
- High memory usage after long sessions

Electron-specific performance checks:

- Main process responsiveness
- Renderer responsiveness
- Preload size
- IPC frequency
- IPC payload size
- Window creation time
- App ready time
- First meaningful paint
- Long-running background tasks
- Native module startup cost
- Tray/menu event leaks
- Global shortcut leaks

Requirements:

- Improve performance without breaking behavior.
- Prioritize user-visible performance.
- Optimize critical startup and navigation paths first.
- Avoid synchronous main-process blocking work.
- Avoid excessive IPC chatter.
- Do not add complex caching unless needed.
- Avoid premature micro-optimization.

---

# AUDIT CATEGORY 20: ERROR HANDLING AND RESILIENCE

Audit and fix:

- Missing error boundaries
- Unhandled promise rejections
- Uncaught exceptions
- Main process crashes
- Renderer process crashes
- Crashes on missing data
- Crashes on failed requests
- Crashes on malformed responses
- Missing fallback UI
- Poor 404 handling
- Poor 403 handling
- Poor 500 handling
- Unsafe retry behavior
- Infinite loading states
- Duplicate submissions
- Optimistic update failures
- Offline/poor network behavior, if relevant
- Expired session behavior
- Deleted resource behavior
- Permission change behavior
- Update failure behavior
- File access denied behavior
- Disk full behavior
- Corrupt config handling
- Missing preload API behavior
- IPC timeout/failure behavior

Every critical flow should have:

- Loading state
- Success state
- Empty state
- Error state
- Retry or recovery path where appropriate
- Safe logs
- Safe user-facing messages

Main process should handle:

- `uncaughtException`
- `unhandledRejection`
- renderer crash events
- failed window load
- update errors
- file system errors
- permission denial

Do not simply swallow errors. Handle them intentionally.

---

# AUDIT CATEGORY 21: SETTINGS AND PREFERENCES

Audit and fix every setting.

For each setting:

- Default value works
- Change works
- Save works
- Cancel works
- Reset works, if present
- Persistence works
- Reload behavior works
- Relaunch behavior works
- Invalid value rejected
- UI updates correctly
- Accessibility is correct
- Unauthorized changes blocked
- No unrelated settings are mutated
- IPC persistence is safe if settings are stored via main process
- Local config file corruption is handled safely

Settings may include:

- Theme
- Appearance
- Accent color
- Language
- Region
- Time zone
- Notifications
- Privacy
- Security
- Profile
- Billing
- Accessibility
- Developer/admin settings
- Feature flags
- Window size
- Sidebar state
- Startup behavior
- Update channel
- Telemetry preference
- Tray behavior
- Keyboard shortcuts

---

# AUDIT CATEGORY 22: NAVIGATION AND FLOW QUALITY

Audit and fix:

- Broken links
- Incorrect routes
- Missing active states
- Broken breadcrumbs
- Broken back buttons
- Broken tabs
- Mobile/compact nav issues
- Sidebar collapse issues
- Deep links
- Dynamic route errors
- Auth redirects
- Admin redirects
- 404 behavior
- Browser back/forward issues
- Focus after route changes
- Keyboard navigation through menus
- Hidden routes that should be protected
- External links missing safe behavior
- Window-level navigation bypasses
- App menu actions not matching UI state
- Keyboard shortcuts triggering wrong route/actions

Every primary nav path should:

- Be reachable
- Load correctly
- Show correct active state
- Handle auth correctly
- Handle compact layouts correctly
- Preserve usability with keyboard and screen reader
- Not allow unsafe navigation outside the intended app surface

---

# AUDIT CATEGORY 23: TESTING

Audit and improve tests.

Add or improve:

- Unit tests
- Component tests
- Integration tests
- IPC tests
- Main process tests where practical
- Preload API tests where practical
- API tests
- E2E tests
- Accessibility tests
- Responsive/window resize flow tests
- Settings tests
- Navigation tests
- Auth tests
- Authorization tests
- Edge-case tests
- Regression tests for bugs found
- Packaging smoke tests where practical

Testing priorities:

- Main/preload/renderer boundaries
- IPC validation
- Auth
- Authorization
- Core features
- Settings
- Navigation
- Forms
- API routes
- Data validation
- Error states
- Edge cases
- Accessibility
- Security-sensitive flows
- Update and file operation flows where practical

Do not add fake tests.

Do not skip failing tests.

Prefer user-facing selectors in renderer tests:

```ts
getByRole
getByLabelText
getByText
getByPlaceholderText
```

Use `data-testid` only when needed.

For Electron E2E, prefer the existing tool if present:

- Playwright Electron
- Spectron only if already present, but do not introduce it for new projects
- WebdriverIO
- custom smoke scripts
- Testing Library
- Vitest/Jest for unit and component tests

---

# AUDIT CATEGORY 24: EDGE CASES

Test and fix edge cases.

## Input

- Empty strings
- Whitespace-only strings
- Very long strings
- Unicode
- Emoji
- RTL text
- Mixed-direction text
- HTML-like input
- SQL-like input
- Markdown input
- Newlines
- Tabs
- Invalid numbers
- Negative numbers
- Zero
- Huge numbers
- Decimal precision
- Invalid dates
- Leap years
- DST/time zone issues
- Null
- Undefined
- Missing fields
- Malformed JSON

## State

- Loading
- Empty
- Error
- Retry
- Saving
- Saved
- Failed save
- Optimistic rollback
- Expired session
- Permission changed
- Deleted resource
- Stale cache
- Multiple windows
- Multiple tabs/views, if supported
- Duplicate submissions
- Rapid clicks
- App quit during operation
- Window close during save
- Update available during work

## Data

- No records
- One record
- Many records
- Pagination boundaries
- Last item deletion
- Search no results
- Filter no results
- Duplicate names
- Missing images
- Broken images
- Missing metadata
- Archived records
- Soft-deleted records
- Corrupted local config
- Missing local data file
- Locked local file
- Disk full
- Permission denied

## UX

- Modal opened with missing data
- Modal closed during submit
- Toast stacking
- Tiny viewport height
- Browser/app zoom at 200%
- Steam Deck 1280 × 800
- Failed third-party service
- Slow network
- Offline mode, if relevant
- Renderer reload
- Renderer crash
- Main process error
- IPC failure
- External link failure
- Deep link malformed
- Update failed

---

# AUDIT CATEGORY 25: OBSERVABILITY AND LOGGING

Audit and fix:

- Missing safe logs for important actions
- Logs leaking sensitive data
- Logs containing tokens/cookies/passwords
- Full request body logs
- Full file path logs where unnecessary
- Missing main process error logs
- Missing renderer error handling
- Missing update logs
- Missing useful error context
- Unsafe client/renderer logging
- No distinction between user errors and system errors
- Debug logs shipped to production
- Console spam
- Missing audit logs for sensitive actions, if applicable

Requirements:

- Redact sensitive values.
- Use safe structured logs where project supports it.
- Remove production console noise.
- Keep user-facing errors safe.
- Keep developer-facing diagnostics useful.
- Separate dev and production logging behavior.
- Avoid storing logs in unsafe/public locations.
- Document log location and retention if applicable.

---

# AUDIT CATEGORY 26: DOCUMENTATION

Create or update:

```txt
README.md
docs/architecture.md
docs/electron-security.md
docs/development.md
docs/environment.md
docs/security.md
docs/accessibility.md
docs/testing.md
docs/performance.md
docs/packaging.md
docs/release-readiness.md
docs/application-audit-map.md
```

Only create docs that make sense for this repo.

Docs must be specific, not generic.

Documentation should explain:

- How the app is structured
- Main/preload/renderer architecture
- How IPC works
- How to safely add IPC channels
- How to run it
- How to configure env vars
- How auth works
- How Electron security is handled
- How accessibility is handled
- How testing works
- How packaging works
- How auto-updates work, if present
- How to deploy/release
- How to validate release readiness
- Known risks or limitations

---

# AUDIT CATEGORY 27: CI/CD AND RELEASE READINESS

Audit and fix:

- Missing CI
- Broken CI
- Missing lint step
- Missing typecheck step
- Missing test step
- Missing build step
- Missing package step
- Missing security audit step
- Missing dependency update process
- Unsafe workflow permissions
- Missing PR template
- Missing issue templates
- Missing release checklist
- Missing changelog pattern
- Missing environment documentation
- Missing code signing documentation
- Missing platform packaging documentation

CI should run:

- Install
- Lint
- Typecheck
- Tests
- Build
- Electron package check where practical
- Security/dependency audit where practical

Do not create CI that cannot run.

For releases, document:

- Version bump process
- Changelog update
- Platform build process
- Signing requirements
- Notarization requirements, if macOS
- Windows signing requirements
- Linux packaging requirements
- Update channel rules
- Rollback notes
- Smoke test checklist

---

# REQUIRED QUALITY GATES

After fixes, run available commands.

Detect the package manager from the lockfile.

Examples:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm audit
```

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit
```

```bash
yarn lint
yarn typecheck
yarn test
yarn build
yarn audit
```

Also run if available:

```bash
npm run test:e2e
npm run test:coverage
npm run format:check
npm run package
npm run make
npm run dist
npm run analyze
```

For Electron specifically, also validate where scripts exist:

```bash
npm run electron:dev
npm run electron:build
npm run electron:package
npm run electron:make
npm run electron:dist
```

Do not claim checks passed unless they actually pass.

If a check fails:

- Identify the reason
- Fix it if safe
- Re-run the check
- Document remaining failures clearly

---

# IMPLEMENTATION STRATEGY

Follow this process.

## Step 1: Discover

Scan the repo and identify project architecture, Electron setup, quality tools, views, features, auth, data, design system, tests, packaging, and deployment model.

## Step 2: Map

Create or update the application audit map.

## Step 3: Prioritize

Group issues by severity:

- Critical: security/data loss/auth bypass/app crash/Electron privilege escalation
- High: broken core flow/accessibility blocker/performance failure/unsafe IPC
- Medium: UX inconsistency/test gap/edge-case failure/package risk
- Low: polish, cleanup, docs

## Step 4: Fix Electron Foundation First

Prioritize:

- BrowserWindow security
- contextIsolation
- nodeIntegration
- sandboxing
- preload API
- IPC contracts
- navigation blocking
- external URL handling
- permission handlers
- protocol handlers
- file system access
- logging redaction
- packaging excludes

## Step 5: Fix Shared App Systems

Prioritize:

- Auth helpers
- Authorization guards
- Validation schemas
- API helpers
- Error helpers
- Layout shells
- Design tokens
- Shared components
- Accessibility utilities
- Test setup
- Env validation

## Step 6: Fix Feature-Specific Issues

Repair individual views, components, screens, settings, forms, flows, IPC operations, and native integrations.

## Step 7: Add Tests

Add regression tests for fixes and coverage for critical flows.

## Step 8: Validate

Run lint, typecheck, tests, build, Electron packaging checks, and available security checks.

## Step 9: Document

Update docs and produce final report.

---

# REQUIRED OUTPUT REPORT

When finished, provide this report:

```md
# Electron AAAA Codebase & Application Audit Report

## Summary

Briefly summarize the overall quality posture before and after the audit.

## Project Detected

- App name:
- Electron version:
- Framework:
- Runtime:
- Language:
- Package manager:
- Frontend:
- Backend:
- Database/ORM:
- Auth:
- Styling/design system:
- Animation system:
- Testing tools:
- Electron builder/packager:
- Auto-update system:
- Deployment target:
- Packaging targets:

## AAAA Quality Scorecard

| Category | Before | After | Notes |
|---|---:|---:|---|
| Electron Architecture |  |  |  |
| Main Process Quality |  |  |  |
| Preload Security |  |  |  |
| IPC Security |  |  |  |
| Renderer Quality |  |  |  |
| Code Quality |  |  |  |
| Security |  |  |  |
| Accessibility |  |  |  |
| UI Fidelity |  |  |  |
| Animation/Motion |  |  |  |
| Responsive / Window Resizing |  |  |  |
| Performance |  |  |  |
| Packaging / Updates |  |  |  |
| Testing |  |  |  |
| Documentation |  |  |  |
| Release Readiness |  |  |  |

Use practical ratings:

- Critical
- Needs Work
- Solid
- Excellent
- AAAA

## Critical Issues Fixed

For each:

- Issue:
- Location:
- Risk:
- Fix:
- Validation:

## High Issues Fixed

For each:

- Issue:
- Location:
- Risk:
- Fix:
- Validation:

## Medium Issues Fixed

For each:

- Issue:
- Location:
- Risk:
- Fix:
- Validation:

## Low Issues Fixed

For each:

- Issue:
- Location:
- Risk:
- Fix:
- Validation:

## Electron Security Improvements

Confirm:

- `nodeIntegration` reviewed
- `contextIsolation` enabled
- `sandbox` reviewed/enabled where practical
- `enableRemoteModule` disabled
- `webSecurity` enabled
- unsafe navigation blocked
- new window handling secured
- external URLs allowlisted
- permissions denied by default
- webviews reviewed
- preload API narrowed
- raw IPC not exposed
- IPC payloads validated
- file system access restricted
- protocols/deep links validated
- update flow reviewed
- packaging excludes secrets/dev files

## IPC Inventory Summary

List IPC channels reviewed or changed.

| Channel | Purpose | Payload Validation | Permission Check | Status |
|---|---|---:|---:|---|

## Architecture Improvements

List structural, modularity, naming, import, and organization improvements.

## Code Quality Improvements

List type safety, cleanup, refactors, duplication removal, and maintainability improvements.

## Security Hardening

Confirm:

- Auth enforced server-side or main-process-side where applicable
- Authorization enforced server-side or main-process-side where applicable
- Ownership checks reviewed
- Inputs validated
- IPC validated
- API outputs filtered
- Secrets not exposed
- Logs redacted
- Errors safe
- CORS/CSRF reviewed where applicable
- Security headers reviewed where applicable
- Dependencies reviewed

## Accessibility Improvements

Confirm:

- Keyboard navigation works
- Focus states visible
- Forms labeled
- Errors associated
- Dialogs accessible
- Icon buttons named
- Screen reader structure improved
- Reduced motion supported
- 200% zoom considered
- Color is not the only signal
- Custom title bar/menu accessibility reviewed

## UI Fidelity Improvements

List improvements to:

- Layout
- Spacing
- Typography
- Components
- Navigation
- Forms
- Tables
- Modals
- Empty states
- Loading states
- Error states
- Window resizing
- Custom title bar, if present
- Tray/menu UX, if present

## Animation and Motion Improvements

List improvements to:

- Transitions
- View motion
- Modal/drawer motion
- Loading motion
- Hover/focus motion
- Reduced motion support
- Performance

## Responsive and Window Resizing Improvements

Confirm coverage for:

- Small desktop windows
- Standard desktop windows
- Large desktop windows
- Steam Deck / handheld
- Browser/app zoom
- Tiny viewport height
- Minimum window constraints

## Performance Improvements

List improvements to:

- Startup time
- First window paint
- Main process responsiveness
- Renderer responsiveness
- Preload size
- IPC frequency/payloads
- Bundle size
- Rendering
- Data fetching
- Images/assets
- Animation performance
- Caching
- Loading states
- Memory leaks

## Packaging and Release Improvements

List improvements to:

- Builder/Forge config
- App metadata
- Icons
- ASAR/files config
- Excluded files
- Auto-update config
- Signing/notarization docs
- Platform targets
- Release checklist

## Tests Added or Updated

For each test file:

- File:
- Type:
- Coverage:
- Reason:

## Documentation Added or Updated

List docs created or changed.

## Files Changed

For each changed file:

- File:
- What changed:
- Why:

## Commands Run

List commands and results.

Examples:

- `pnpm lint` — passed
- `pnpm typecheck` — passed
- `pnpm test` — passed
- `pnpm build` — passed
- `pnpm audit` — passed / reviewed
- `pnpm package` — passed / reviewed

## Remaining Risks

List anything that could not be fully verified, requires product decision, OS-specific testing, code signing credentials, production credentials, update infrastructure, external service access, or manual QA.

## Final Electron AAAA Release Checklist

- [ ] App builds successfully
- [ ] App packages successfully where practical
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] Critical flows tested
- [ ] Main/preload/renderer boundaries are clean
- [ ] `nodeIntegration` is disabled
- [ ] `contextIsolation` is enabled
- [ ] Sandbox is reviewed/enabled where practical
- [ ] Remote module is disabled
- [ ] Raw IPC is not exposed to renderer
- [ ] IPC payloads are validated
- [ ] Renderer cannot access unsafe Node APIs directly
- [ ] External navigation is controlled
- [ ] Permission requests are controlled
- [ ] File system access is restricted
- [ ] Deep links/protocols are validated
- [ ] Auth protected server-side or main-process-side
- [ ] Authorization protected server-side or main-process-side
- [ ] Secrets are not exposed
- [ ] API routes validate inputs
- [ ] Errors are safe
- [ ] Logs are redacted
- [ ] Accessibility blockers fixed
- [ ] Keyboard navigation works
- [ ] Reduced motion respected
- [ ] Responsive/window resizing layouts verified
- [ ] Steam Deck / handheld layout verified
- [ ] Loading states polished
- [ ] Empty states polished
- [ ] Error states polished
- [ ] Animations are smooth and purposeful
- [ ] Performance risks reviewed
- [ ] Packaging config reviewed
- [ ] Auto-update flow reviewed or documented
- [ ] Code signing requirements documented
- [ ] Documentation updated
- [ ] CI/CD reviewed
- [ ] Repo is release-ready
```

---

# FINAL INSTRUCTION

Begin by scanning the full repository.

Build a complete understanding of the Electron app, including:

- Main process
- Preload scripts
- Renderer process
- BrowserWindow configuration
- IPC channels
- Native OS integrations
- File system access
- Protocol/deep-link handling
- Auto-update flow
- Packaging configuration
- Architecture
- Views/routes
- Features
- Settings
- Navigation
- APIs
- Auth
- Data
- UI system
- Animation system
- Accessibility posture
- Security posture
- Test coverage
- Release process

Create or update:

```txt
docs/application-audit-map.md
```

Then perform a comprehensive Electron AAAA-quality audit and fix pass across the entire codebase.

Fix Electron security issues, IPC issues, preload issues, main process issues, renderer issues, accessibility issues, layout issues, animation issues, code quality issues, performance issues, testing gaps, documentation gaps, packaging issues, and release-readiness problems.

Run all available validation commands.

End with the required Electron AAAA Codebase & Application Audit Report.

Do not stop at recommendations. Implement, validate, and document the improvements.
