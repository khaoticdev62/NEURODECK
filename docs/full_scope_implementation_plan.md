# Implementation Plan: Turning the Full-Scope Claude Plan into Real Production Work

## Purpose

This implementation plan is the execution layer that comes **after** the full-scope Claude development plan.

The goal is to move from:

```txt
Big app vision
```

to:

```txt
Real repo
Real stories
Real production code
Real tests
Real data
Fallow gates
CI/CD
Release certification
```

No fake progress.  
No “we’ll test later.”  
No mocked-data confidence theater.  
No “works on my machine” museum exhibit.

---

# 1. Implementation Strategy

Use this execution model:

```txt
Plan → Validate → Baseline → Build → Test → Harden → Document → Certify → Release
```

Every feature must move through:

```txt
Story Ready
Code Implemented
Real Data Tests Passing
Fallow Reviewed
Security Reviewed
Accessibility Reviewed
CI Passing
Docs Updated
Release Gate Passed
```

The implementation should happen in **small, verifiable work units**, not giant “build the whole app” chaos sprints.

---

# 2. Phase 0: Project Baseline and Repo Setup

## Goal

Create a safe foundation before writing feature code.

## Tasks

### 0.1 Create or inspect the repository

Confirm:

```txt
Language
Framework
Package manager
Runtime
Test framework
Database/storage
Build tool
Lint/format tools
CI/CD status
Docs status
Fallow status
```

### 0.2 Verify real commands

Identify real commands from actual project files.

Check:

```txt
Install command
Dev command
Build command
Test command
Lint command
Type-check command
Format command
Fallow commands, if applicable
CI commands
Release commands
```

If a command is unknown, mark it as unknown and identify which file must be inspected.

Do not invent commands.

### 0.3 Create baseline documentation

Create or update:

```txt
README.md
docs/ARCHITECTURE.md
docs/TESTING.md
docs/DEVELOPER_HANDOFF.md
docs/AI_AGENT_HANDOFF.md
.env.example
```

### 0.4 Validate source control safety

Confirm:

```txt
Git repo exists
Working tree status is known
Ignored files are correct
Secrets are not committed
Generated files are excluded
Environment files are excluded
```

## Deliverables

```txt
Verified repo map
Verified stack table
Verified commands table
Baseline architecture doc
Testing strategy doc
Developer handoff doc
AI-agent handoff doc
.env.example
```

## Required Checks

```txt
Install works
Build works
Dev server starts, if applicable
Test command exists or test framework setup is planned
Lint/type-check commands exist or are planned
No fake scripts exist in docs
```

## Exit Criteria

- Repo can be installed cleanly.
- Project structure is known.
- Real commands are documented.
- No fake scripts exist in docs.
- Secrets are not committed.
- Baseline docs exist.

---

# 3. Phase 1: Architecture Foundation

## Goal

Set up the base structure so features do not get dumped into random files like a junk drawer with imports.

## Recommended Structures

### Typical web/full-stack app

```txt
src/
  app/
  features/
  shared/
  config/
  lib/
  services/
  data/
  tests/
```

### Backend/API-heavy app

```txt
src/
  app/
  domain/
  application/
  infrastructure/
  interfaces/
  config/
  tests/
```

### CLI/tooling app

```txt
src/
  cli/
  core/
  workflows/
  providers/
  config/
  reports/
  safety/
  tests/
```

## Tasks

### 1.1 Define module boundaries

Document:

```txt
What belongs in app/
What belongs in features/
What belongs in shared/
What belongs in data/
What belongs in services/
What should never import what
```

### 1.2 Define dependency direction

Example:

```txt
UI → application/services → domain/core → shared primitives

Infrastructure implements interfaces.
Domain does not import UI.
UI does not import database directly.
```

### 1.3 Create config layer

Include:

```txt
Environment variable loading
Required config validation
Safe defaults
No secret leakage
.env.example
```

### 1.4 Define public contracts

Identify and document:

```txt
API routes
Component props
Package exports
CLI commands
Database schemas
Config keys
Environment variables
File formats
Plugin/mod APIs
```

### 1.5 Define unsafe edit zones

Mark files that should not be casually touched:

```txt
Database migrations
Auth/session logic
Public API contracts
Package scripts
CI/CD workflows
Secrets/config loaders
Generated files
Lockfiles
```

## Exit Criteria

- Folder structure exists or current structure is documented.
- Architecture rules are documented.
- Config access is centralized.
- Public contracts are identified.
- No feature code starts before architecture boundaries are clear.

---

# 4. Phase 2: Real Test Data System

## Goal

Build the testing foundation **before** major feature implementation.

This is where you prevent “it passes because we lied to ourselves” testing.

## Tasks

### 2.1 Define real test data sources

Create:

```txt
tests/fixtures/
tests/seeds/
tests/data/
```

Data must be:

```txt
Production-shaped
Deterministic
Resettable
Safe
No real PII
Schema-valid
Edge-case rich
```

### 2.2 Create seed/reset flow

Examples:

```txt
Seed test users
Seed test projects
Seed edge-case records
Reset test database
Clear temp files
Reset local storage/session state
Reset external sandbox state where applicable
```

### 2.3 Define test environment

Document:

```txt
Local test database
Test filesystem sandbox
Staging API sandbox
External provider sandbox
E2E browser test data
Migration test data
Release artifact test data
```

### 2.4 Create real-data fixture policy

Document:

```txt
What fixtures are allowed
Where fixtures live
How fixtures are generated
How fixtures are validated
How fixtures are refreshed
How schema drift is detected
```

## No-Mocked-Data Rule

Mocks are allowed only for tiny unit isolation.

They are **not allowed** as final proof for:

```txt
Database behavior
API behavior
Auth behavior
File processing
External integrations
E2E flows
Persistence
Migration safety
Release artifact behavior
```

## Exit Criteria

- Real test data plan exists.
- Seed/reset process is defined.
- Critical test data is available before feature build.
- No critical path depends only on mocked tests.
- Test data is deterministic and safe.

---

# 5. Phase 3: Fallow Integration

## Goal

Use Fallow as a code-intelligence quality gate for JavaScript/TypeScript projects.

## Tasks

### 3.1 Verify applicability

Use Fallow if the project is:

```txt
JavaScript
TypeScript
Node
React
Next.js
Vite
Tauri frontend
Electron frontend
```

If not JS/TS, replace Fallow with the closest language-native tools.

### 3.2 Add Fallow dependency

For npm:

```bash
npm install --save-dev fallow
```

For pnpm:

```bash
pnpm add -D fallow
```

For yarn:

```bash
yarn add -D fallow
```

For bun:

```bash
bun add -d fallow
```

Use only the package manager verified in the repo.

### 3.3 Add Fallow scripts

Recommended scripts:

```json
{
  "scripts": {
    "quality:fallow:audit": "fallow audit",
    "quality:fallow:json": "fallow audit --format json",
    "quality:fallow:health": "fallow health --score --hotspots --targets",
    "quality:fallow:dead-code": "fallow dead-code"
  }
}
```

Do not overwrite existing scripts.

### 3.4 Create baseline scan

Run the verified script equivalents:

```bash
npm run quality:fallow:audit
npm run quality:fallow:health
npm run quality:fallow:dead-code
```

Save results:

```txt
docs/reports/fallow-baseline.md
```

### 3.5 Define Fallow gates

Initial gate:

```txt
Warning only
```

After cleanup:

```txt
Blocking on new critical issues
```

## Fallow Must Catch

```txt
Circular dependencies
Dead code
Unused exports
Unused dependencies
Duplicate logic
Architecture boundary drift
Complexity hotspots
Cleanup opportunities
```

## Exit Criteria

- Fallow applicability is verified.
- Fallow baseline exists.
- CI gate strategy exists.
- Epics/stories include Fallow checks.
- New work cannot introduce obvious codebase rot.

---

# 6. Phase 4: Epic Breakdown into Sprint Work

## Goal

Convert the big plan into sprint-ready execution.

## Process

For each epic, create:

```txt
Stories
Acceptance criteria
Technical tasks
Test cases
Real data requirements
Fallow gates
Security checks
Accessibility checks
Performance checks
Definition of done
```

## Story Template

```txt
Story ID:
Epic:
User story:
Priority:
Estimate:
Dependencies:
Acceptance criteria:
Technical tasks:
Real test data:
Test cases:
Fallow checks:
Security checks:
Accessibility checks:
Performance checks:
Docs required:
Definition of done:
```

## Sprint Sizing Rule

Each story should be small enough to complete in:

```txt
0.5 to 3 days
```

If a story is bigger than that, split it.

## Exit Criteria

- Every epic has stories.
- Every story has testable acceptance criteria.
- Every story has real data test needs defined.
- No story says “implement system” or “build feature” without details.

---

# 7. Phase 5: Core Feature Implementation

## Goal

Build features one story at a time.

## Required Implementation Loop

For every story:

```txt
1. Confirm story is ready.
2. Create/verify real test data.
3. Write failing tests where possible.
4. Implement production code.
5. Run tests.
6. Run Fallow.
7. Run lint/type-check/build.
8. Update docs.
9. Mark story done only if all gates pass.
```

## Per-Story Gate

A story is not done until:

```txt
Code implemented
Real data tests pass
Integration behavior proven
No placeholder logic
No fake APIs
No exposed secrets
Fallow reviewed
Docs updated
CI commands known
```

## Feature Implementation Rules

Do not:

```txt
Build multiple unrelated features in one patch
Skip validation
Skip tests
Skip docs
Skip Fallow review
Use fake data as proof
Hide errors behind generic catches
Add dependencies without justification
```

## Exit Criteria

- Core features work end-to-end.
- Tests use production-shaped data.
- No critical Fallow issues added.
- Docs reflect actual behavior.

---

# 8. Phase 6: Data/API Hardening

## Goal

Make all data and API contracts predictable and safe.

## Tasks

### 6.1 Validate all inputs

Check:

```txt
Request body
Query params
Path params
File uploads
Form data
Config values
External API responses
```

### 6.2 Standardize responses

Define:

```txt
Success response shape
Error response shape
Validation error shape
Auth error shape
Not found shape
```

### 6.3 Add contract tests

Tests must verify:

```txt
Valid request works
Invalid request fails safely
Unauthorized request is blocked
Forbidden data is protected
Sensitive fields are not returned
Pagination is bounded
Sorting/filtering is allowlisted
```

### 6.4 Database/migration safety

Require:

```txt
Migration plan
Rollback plan
Seed data
Reset data
Data loss review
```

### 6.5 Authorization check

Verify:

```txt
Backend enforces permissions
Frontend-only hiding is not treated as security
Object ownership is checked
Role checks are tested
Sensitive fields are filtered
```

## Exit Criteria

- API contracts are documented.
- Validation exists at trust boundaries.
- Contract tests pass with real data.
- No frontend-only authorization.
- Migrations are not cowboy-coded.

---

# 9. Phase 7: Security Hardening

## Goal

Remove obvious security risks before release.

## Checklist

```txt
No hardcoded secrets
No API keys in frontend
No unsafe environment handling
No sensitive data in logs
No auth bypass
No missing authorization checks
No unsafe file uploads
No raw HTML injection
No unsafe redirects
No stack traces exposed to users
No overly permissive CORS
No unvalidated inputs
No known dangerous dependencies
```

## Required Tests

Add:

```txt
Auth tests
Authorization tests
Input validation tests
Sensitive field filtering tests
Security regression tests
```

## Required Docs

Update:

```txt
docs/SECURITY.md
.env.example
docs/DEVELOPER_HANDOFF.md
docs/AI_AGENT_HANDOFF.md
```

## Exit Criteria

- Security checklist reviewed.
- Critical/high findings fixed.
- Secrets are not exposed.
- Auth and authorization are tested with real flows.

---

# 10. Phase 8: UX/UI and Accessibility Implementation

## Goal

Make the interface usable, accessible, and production-polished.

## Required UI States

Every user-facing data feature needs:

```txt
Loading state
Empty state
Error state
Success state
Disabled state
Permission-denied state
Retry path
```

## Accessibility Baseline

Check:

```txt
Semantic HTML
Keyboard navigation
Visible focus
Form labels
Error announcements
Color contrast
Screen reader names
Reduced motion
Touch targets
Responsive layout
```

## Controller Support If Needed

For Steam Deck, TV, console, or controller-first apps:

```txt
Default focused element
Directional navigation
Back/cancel behavior
Confirm behavior
Focus trap in modals
Controller hints
```

## Exit Criteria

- Critical flows are keyboard accessible.
- Forms are labeled.
- Error states are clear.
- Layout does not break at target viewports.
- Accessibility gaps are documented or fixed.

---

# 11. Phase 9: Observability and Reliability

## Goal

Make failures diagnosable and safe.

## Tasks

### 9.1 Error handling

Define:

```txt
User-facing errors
Developer logs
Retryable errors
Non-retryable errors
Validation errors
Auth errors
Dependency failures
```

### 9.2 Logging

Logs should include:

```txt
Operation
Status
Request/job ID if applicable
Error code
Duration
Safe context
```

Logs must not include:

```txt
Secrets
Tokens
Passwords
Raw private data
Full database URLs
```

### 9.3 Reliability

Add where applicable:

```txt
Timeouts
Retries with limits
Cancellation
Health checks
Startup validation
Graceful shutdown
Crash boundaries
```

## Exit Criteria

- Errors are user-safe.
- Logs help debugging.
- Secrets are redacted.
- Critical failures have recovery paths.

---

# 12. Phase 10: CI/CD Implementation

## Goal

Automate quality gates.

## Recommended Pipeline

```txt
Install
Build
Type-check
Lint
Unit tests
Integration tests
Contract tests
E2E tests
Security scan
Fallow audit
Artifact build
Release certification
```

## First CI Version

Start small:

```txt
Install
Build
Test
Type-check
Lint
```

Then add:

```txt
Fallow
Security
E2E
Release artifact
```

## Fallow CI Strategy

Start as:

```txt
Non-blocking warning gate
```

Then promote to:

```txt
Blocking gate for new critical issues
```

## Exit Criteria

- CI runs real commands.
- CI does not call missing scripts.
- CI fails on build/test errors.
- Release flow is documented.

---

# 13. Phase 11: Documentation and Handoff

## Goal

Make the project understandable by humans and future AI agents.

## Required Docs

```txt
README.md
docs/SETUP.md
docs/ARCHITECTURE.md
docs/TESTING.md
docs/SECURITY.md
docs/RELEASE.md
docs/TROUBLESHOOTING.md
docs/DEVELOPER_HANDOFF.md
docs/AI_AGENT_HANDOFF.md
```

## Documentation Must Include

```txt
Real setup commands
Real dev commands
Real test commands
Real Fallow commands
Real test data setup
Known risks
Architecture rules
Do-not-touch areas
Release process
Rollback process
```

## Exit Criteria

- Docs match the repo.
- No fake commands.
- New developer can run the app.
- AI agent knows safe/danger zones.

---

# 14. Phase 12: Release Certification

## Goal

Make a final go/no-go decision.

## Release Decision Options

```txt
APPROVED
APPROVED WITH WARNINGS
BLOCKED
BLOCKED UNTIL FIXES COMPLETE
```

## Release Checklist

```txt
Install works
Build works
Tests pass
Type-check passes
Lint passes
Fallow reviewed
Security reviewed
No secrets exposed
Data/API contracts tested
Migrations safe
Critical UI flows verified
Accessibility baseline verified
Performance risks reviewed
Runtime errors handled
CI/CD configured
Docs updated
Rollback documented
Known risks documented
```

## Exit Criteria

- Release status is clear.
- Blockers are listed.
- Warnings are listed.
- Next action is obvious.

---

# 15. Suggested Sprint Plan

## Sprint 0: Foundation

```txt
Repo setup
Architecture docs
Config validation
Testing framework
Real test data plan
Fallow baseline
CI skeleton
```

## Sprint 1: Core MVP Path

```txt
Primary user flow
Core data model
Core API/contracts
Real integration tests
Basic UI states
```

## Sprint 2: Feature Completion

```txt
Secondary flows
Validation hardening
Error handling
Accessibility baseline
More E2E coverage
```

## Sprint 3: Hardening

```txt
Security pass
Fallow cleanup
Performance review
Observability
CI/CD gates
Docs
```

## Sprint 4: Release Readiness

```txt
Regression testing
Artifact/release build
Final docs
Rollback plan
Release certification
```

---

# 16. Implementation Board Template

Use this task board:

```txt
BACKLOG
READY
IN PROGRESS
CODE REVIEW
TESTING
FALLOW REVIEW
SECURITY REVIEW
DOCS
DONE
BLOCKED
```

Every story must pass through:

```txt
TESTING
FALLOW REVIEW
DOCS
```

Security-sensitive stories must also pass:

```txt
SECURITY REVIEW
```

UI stories must also pass:

```txt
ACCESSIBILITY REVIEW
```

---

# 17. Definition of Ready

A story is ready when:

```txt
User value is clear
Acceptance criteria are testable
Technical tasks are defined
Real data requirements are defined
Test cases are defined
Security concerns identified
Accessibility concerns identified
Performance concerns identified
Fallow gates defined
Dependencies known
Rollback concerns known
```

---

# 18. Definition of Done

A story is done when:

```txt
Production code implemented
No placeholder logic
No fake APIs
No fake data paths
Real data tests pass
Integration tests pass where relevant
Contract tests pass where relevant
Fallow reviewed
No new critical Fallow findings
Security concerns addressed
Accessibility criteria met
Docs updated
CI gates pass
Rollback documented if risky
```

---

# 19. Claude Follow-Up Prompt for Implementation

Paste this into Claude after it creates the full-scope plan:

```md
Now convert this plan into an implementation execution plan.

Break the work into sprints, epics, stories, technical tasks, real-data test requirements, Fallow gates, CI/CD gates, security checks, accessibility checks, and release certification steps.

Do not use mocked data as final proof.

For each story, include:

- Story ID
- Goal
- Acceptance criteria
- Files/modules likely involved
- Technical tasks
- Real test data setup
- Required tests
- Fallow checks
- Security checks
- Accessibility checks
- Verification commands
- Definition of done
- Rollback notes

Also create:

- Sprint roadmap
- Dependency map
- Risk register
- CI/CD gate plan
- Release checklist
- Developer handoff
- AI-agent handoff

Do not invent commands.
If a command is unknown, mark it as unknown and state what file must be inspected.
```

---

# 20. The Real Execution Rule

Do not start building everything.

Start with:

```txt
Sprint 0
```

Then implement:

```txt
One story at a time
```

Every story must prove itself through:

```txt
Real code
Real data
Real tests
Fallow review
CI verification
Docs
```

That is how you keep the app from becoming a production jump scare.
