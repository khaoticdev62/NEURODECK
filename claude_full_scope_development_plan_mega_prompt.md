# Claude Mega Prompt: Full-Scope Development Plan with Epics, Stories, Production Tests, Fallow Gates, and No Mocked Data

## Purpose

Use this prompt in Claude when you need a professional full-scope application development plan that produces a concrete engineering blueprint instead of vague planning.

This prompt forces Claude to deliver:

- Product scope
- Technical architecture
- Epics
- User stories
- Acceptance criteria
- Technical tasks
- Real production test strategy
- No-mocked-data testing rules
- Fallow quality gates
- CI/CD gates
- Security requirements
- Accessibility requirements
- Performance requirements
- Risk register
- Definition of ready
- Definition of done
- Release plan
- Developer handoff
- AI-agent handoff

This is built for serious software planning, not “here are some bullets, now go fight the repo goblin.”

---

# Copy/Paste Prompt for Claude

```md
# CLAUDE MASTER PROMPT: Full-Scope Development Plan with Epics, Stories, Production Tests, Fallow Gates, and No Mocked Data

You are a senior application developer, principal software engineer, product architect, QA lead, test architect, DevOps engineer, release engineer, and technical product planner with 20+ years of production experience.

Your job is to create a complete, professional, full-scope development plan for this application.

The plan must be concrete enough that a real engineering team, solo developer, or AI coding agent can implement it without guessing.

You must deliver:

1. Product scope
2. Technical architecture
3. Epics
4. User stories
5. Acceptance criteria
6. Technical tasks
7. Implementation phases
8. Production-grade test strategy
9. Real-data testing strategy with no mocked data as final proof
10. Fallow code-intelligence integration
11. CI/CD quality gates
12. Security plan
13. Accessibility plan
14. Performance plan
15. Release plan
16. Risk register
17. Definition of ready
18. Definition of done
19. Developer handoff
20. AI-agent handoff

This must not be vague.
This must not be generic.
This must not contain fake commands.
This must not invent framework behavior.
This must not use placeholder implementation.
This must not depend on mocked data as the final testing strategy.
```

---

## 1. Project Context Template

Paste this into Claude under the master role:

```txt
Application name:
NEURODECK

Application purpose:
AI-native terminal OS for Steam Deck — Electron + Rust sidecar + Gemini

Target users:
Steam Deck users, developers, power users, and gamers seeking AI-terminal gamepad-native integration

Primary platforms:
Steam Deck (SteamOS), Windows, Linux

Application type:
DESKTOP_APP

Primary language:
JavaScript (ES2022+) / Rust (1.92.0)

Framework/runtime:
Electron 36 / Axum bridge server (localhost:9477)

Package manager:
npm (workspaces: frontend, electron) / Cargo

Database/storage:
Cosine-similarity vector DB (persists to data/memory/chat_history.json)

Authentication:
Google OAuth2 Device Flow (keyring keychain helper integration)

Deployment target:
Steam Deck / SteamOS Desktop mode, local desktop installer

Known constraints:
Zero-Tauri (fully migrated to Electron), Fallow duplicate count must remain at 0, no raw tauri invocations, must fit within 1280x800 window

Business goals:
Deliver a premium, gamepad-native AI terminal console environment with interactive canvas and local system/game integration

Technical goals:
100% clean static analysis, zero code duplicates, robust IPC bridge security, and structured modular tab controls

Non-negotiables:
Zero-Tauri, Fallow 0 duplication clone groups, premium dark/glassmorphic styling, no raw localStorage credentials
```

Important constraints:

```txt
No mocked data in final production tests.
No fake APIs.
No fake commands.
No placeholder code.
No fake package scripts.
No fake database schemas.
No fake provider integrations.
No TODO-only implementation.
No undocumented environment variables.
No frontend-only authorization.
No unbounded production endpoints.
No exposed secrets.
No fake CI/CD gates.
```

---

## 2. Initial Verification Rules

Claude must inspect and reason from the provided repo, files, docs, or context.

If a codebase is available, Claude must identify:

- Language
- Framework
- Runtime
- Package manager
- Lockfile
- Build tool
- Test framework
- Linter
- Formatter
- Database/storage
- API style
- Auth system
- CI/CD setup
- Deployment target
- Current file structure
- Existing scripts
- Existing documentation
- Existing tests
- Existing Fallow setup, if present

If something cannot be verified, Claude must write:

```txt
Unknown because [reason].
Required verification:
[file, command, or config needed]
```

Claude must not guess, invent commands, invent package scripts, invent architecture, or invent framework behavior.

---

## 3. Required Final Output Structure

Claude must return the development plan in this structure:

```md
# Full-Scope Development Plan

## Executive Summary

- Application:
- Purpose:
- Target users:
- Release type:
- Recommended architecture:
- Biggest engineering risk:
- Biggest product risk:
- Testing confidence strategy:
- Release-readiness target:

## Verified Stack

| Area | Value | Evidence |
|---|---|---|
| Language | | |
| Runtime | | |
| Framework | | |
| Package Manager | | |
| Build Tool | | |
| Test Framework | | |
| Database/Storage | | |
| Auth | | |
| CI/CD | | |
| Deployment | | |

## Product Scope

### In Scope

### Out of Scope

### Assumptions

### Constraints

### Success Metrics

## Architecture Plan

### System Overview

### Frontend Architecture

### Backend Architecture

### Data Layer

### API Contracts

### Auth and Authorization

### State Management

### Error Handling

### Observability

### Security

### Performance

### Deployment Architecture

## Epic Roadmap

| Epic ID | Epic Name | Goal | Priority | Release Phase |
|---|---|---|---|---|

## Epics and User Stories

### EPIC 1: [Name]

#### Goal

#### Business Value

#### Technical Value

#### Dependencies

#### User Stories

| Story ID | User Story | Priority | Estimate | Dependencies |
|---|---|---:|---:|---|

#### Acceptance Criteria

#### Technical Tasks

#### Test Requirements

#### Fallow Quality Gates

#### Security Considerations

#### Accessibility Considerations

#### Performance Considerations

#### Definition of Done

## Development Phases

### Phase 0: Discovery and Safety Baseline

### Phase 1: Foundation

### Phase 2: Core Feature Build

### Phase 3: Data/API Hardening

### Phase 4: Testing and Reliability

### Phase 5: UX/UI and Accessibility

### Phase 6: Security and Performance

### Phase 7: CI/CD and Release

### Phase 8: Documentation and Handoff

## Production Test Strategy

### Testing Philosophy

### No-Mocked-Data Policy

### Test Data Strategy

### Unit Tests

### Integration Tests

### API Contract Tests

### Database Tests

### Migration Tests

### E2E Tests

### Regression Tests

### Security Tests

### Accessibility Tests

### Performance Tests

### Fallow Code Intelligence Gates

## Real Test Data Plan

### Data Sources

### Seed Strategy

### Reset Strategy

### Sensitive Data Rules

### Test Database Strategy

### Fixture Strategy

### External Service Sandbox Strategy

### E2E Data Strategy

### Data Ownership

### Data Refresh Schedule

## CI/CD Quality Gates

## Release Plan

## Risk Register

## Definition of Ready

## Definition of Done

## Developer Handoff

## AI Agent Handoff

## Final Implementation Checklist
```

---

## 4. Epic Rules

Each epic must include:

```txt
Epic ID:
Epic name:
Business goal:
Technical goal:
User value:
Dependencies:
Risk level:
Release phase:
Primary owner:
Estimated complexity:
```

Each epic must include stories that are specific, testable, and implementation-ready.

Bad epic:

```txt
Build the app.
```

Good epic:

```txt
EPIC 2: Authenticated Project Workspace

Goal:
Allow authenticated users to create, view, update, and manage their project workspaces with validated persistence, protected routes, and production-ready test coverage.
```

---

## 5. User Story Rules

Each story must follow this format:

```txt
As a [user type],
I want [capability],
so that [outcome].
```

Each story must include:

```txt
Story ID:
Epic ID:
Priority:
Estimate:
Dependencies:
User value:
Technical notes:
Acceptance criteria:
Technical tasks:
Test cases:
Real test data needed:
Fallow checks:
Security considerations:
Accessibility considerations:
Performance considerations:
Observability considerations:
Definition of done:
```

Acceptance criteria must be specific and testable.

Bad:

```txt
The dashboard should work.
```

Good:

```txt
Given a user with three saved projects,
when they open the dashboard,
then all three projects are displayed in descending updated-date order,
and each project card shows name, status, last updated time, and primary action.
```

---

## 6. Technical Task Rules

Every story must be broken into technical tasks.

Each task must include:

```txt
Task ID:
Story ID:
Task:
Files/modules likely involved:
Dependencies:
Risk:
Test requirement:
Definition of done:
```

Task examples:

```txt
TASK AUTH-001:
Create server-side session validation helper.

TASK AUTH-002:
Add protected route middleware.

TASK AUTH-003:
Add real integration test using seeded user session and real test database.
```

No task may be vague like:

```txt
Implement auth.
```

---

## 7. Production Code Standards

All implementation planning must enforce:

- Strict type safety where supported
- Real validation at trust boundaries
- No fake data in production paths
- No mocked APIs as final integration proof
- No placeholder services
- No hardcoded secrets
- No exposed API keys
- No silent error swallowing
- No unbounded list endpoints
- No unsafe file handling
- No direct database access from UI
- No auth only enforced in frontend
- No broken accessibility basics
- No untested critical paths
- No fake package scripts
- No undocumented environment variables
- No CI/CD gates that call missing scripts
- No logs that expose secrets
- No destructive migrations without rollback
- No public API changes without migration notes

---

## 8. No-Mocked-Data Testing Policy

Final production tests must not rely on mocked data as the proof that the system works.

Use real, controlled, production-shaped data instead.

Allowed:

- Ephemeral local test database
- Dockerless local database if required by constraints
- Test containers only if allowed
- Seeded test database
- Anonymized production-shaped fixture data
- Contract fixtures generated from real schemas
- Local filesystem sandbox data
- Recorded API fixtures only when legally and safely captured
- Sandbox third-party environments
- Staging APIs
- Deterministic generated data that follows real schema constraints
- Golden files based on real expected outputs
- Real migration fixtures
- Real uploaded sample files that are safe to store
- Real browser E2E flows against a test environment
- Real CLI execution against a temp directory
- Real file inputs with expected outputs

Not allowed as final proof:

- Fake in-memory mocks replacing real data access
- Mocked API responses as the only integration proof
- Mocked auth as the only auth proof
- Mocked database calls as the only persistence proof
- Mocked payment/email/external systems without sandbox verification
- Random toy fixtures that do not match production schemas
- Tests that only assert implementation details
- Tests that pass while the real system is broken
- Snapshot-only testing for critical behavior
- Unit-only proof for cross-system behavior

Mocks may be used only for narrow unit isolation, but they cannot replace integration, contract, database, migration, or E2E proof.

For every test layer, define:

```txt
Data source:
Why it is production-shaped:
How it is seeded:
How it is reset:
How sensitive data is avoided:
How the test proves real behavior:
```

Never use real production PII or secrets.

---

## 9. Real Test Data Plan Requirements

Create a dedicated section:

```md
## Real Test Data Plan

### Data Sources

Define exactly where test data comes from.

### Seed Strategy

Define how test data is created before test runs.

### Reset Strategy

Define how the environment returns to a clean state.

### Sensitive Data Rules

Define how PII, secrets, credentials, and tokens are avoided.

### Test Database Strategy

Define local/staging/test DB setup.

### Fixture Strategy

Define which fixtures exist, where they live, and how they map to real schemas.

### External Service Sandbox Strategy

Define how third-party integrations are tested without fake success.

### E2E Data Strategy

Define browser/user-flow data setup.

### Data Ownership

Define who owns and updates test data.

### Data Refresh Schedule

Define how test data stays realistic over time.
```

Rules:

- Test data must match real schema constraints.
- Test data must include edge cases.
- Test data must include realistic volumes where needed.
- Test data must avoid production PII.
- Test data must be deterministic.
- Test data must be resettable.
- Test data must be documented.
- Test data must fail loudly if schema contracts drift.

---

## 10. Fallow Integration Requirements

For JavaScript/TypeScript projects, integrate Fallow as a code intelligence and quality gate.

Use Fallow for:

- Dead code detection
- Unused exports
- Unused dependencies
- Circular dependency detection
- Duplicate logic detection
- Complexity hotspots
- Architecture boundary violations
- Dependency hygiene
- Cleanup opportunities
- Agent-ready codebase context

Before recommending Fallow commands, verify the package manager and existing scripts.

Recommended command candidates:

```bash
npx fallow audit
npx fallow audit --format json
npx fallow health --score --hotspots --targets
npx fallow dead-code
```

Only document or add these commands if they match the project’s package manager and are valid for the repo.

If the project uses npm:

```bash
npm install --save-dev fallow
```

If the project uses pnpm:

```bash
pnpm add -D fallow
```

If the project uses yarn:

```bash
yarn add -D fallow
```

If the project uses bun:

```bash
bun add -d fallow
```

If the project is not JavaScript/TypeScript, do not pretend Fallow applies directly.

Instead:

1. Mark Fallow as not applicable.
2. Recommend equivalent language-native static analysis tools.
3. Keep the same quality-gate intent.

---

## 11. Required Fallow Scripts

If this is a JavaScript/TypeScript project and Fallow is accepted, recommend scripts such as:

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

Only add these if:

- `package.json` exists
- The package manager is verified
- The command is valid
- The dependency is installed or included in the plan

Do not overwrite existing scripts.

---

## 12. Fallow Quality Gates

Define Fallow gates per epic.

Each epic must include:

```txt
Fallow gate:
- No new circular dependencies
- No new unused dependencies
- No new unlisted imports
- No new duplicate exports
- No new high-risk complexity hotspots without justification
- No architecture boundary violations
- No dead code introduced
- No dependency drift introduced
```

For risky refactors:

```txt
Required Fallow evidence:
- Before scan
- After scan
- Diff summary
- Hotspot comparison
- Dead-code comparison
- Dependency hygiene comparison
```

For CI/CD:

```txt
Fallow must run as a non-blocking warning gate first.
After baseline cleanup, promote to blocking gate for new issues only.
```

Do not block the first CI run on existing legacy issues unless the team explicitly wants that.

---

## 13. Testing Requirements Per Story

Every story must include test cases.

Required format:

```txt
Test ID:
Story ID:
Test type:
Scenario:
Real data required:
Setup:
Steps:
Expected result:
Failure path:
Edge cases:
Automation level:
```

Test types must include where relevant:

- Unit
- Integration
- API contract
- Database
- Migration
- E2E
- Accessibility
- Security
- Performance
- Regression
- CLI smoke test
- File-processing test
- Release artifact test

Every critical story must have at least:

- Happy path test
- Failure path test
- Edge case test
- Real data integration test
- Regression test if fixing existing behavior

---

## 14. CI/CD Test Gates

Define a CI/CD pipeline plan with these gates:

```txt
Install gate:
Build gate:
Type-check gate:
Lint gate:
Unit test gate:
Integration test gate:
API contract test gate:
Database/migration test gate:
E2E test gate:
Accessibility gate:
Security gate:
Fallow audit gate:
Fallow health gate:
Artifact build gate:
Release certification gate:
```

Each gate must include:

```txt
Command:
Required before merge:
Required before release:
Failure behavior:
Artifacts:
```

Do not invent commands.

If a command is missing, recommend the exact script addition instead of pretending it exists.

---

## 15. Security Requirements

Every epic/story must account for security where relevant:

- Input validation
- Authentication
- Authorization
- Secrets
- API keys
- Sensitive data
- Logging
- File uploads
- CORS
- Cookies
- Sessions
- Rate limiting
- Error leakage
- Dependency risk
- Frontend exposure
- API contract abuse
- Data privacy
- Safe redirects
- Safe serialization
- Safe markdown/HTML rendering

For each security-sensitive story:

```txt
Threat:
Mitigation:
Test:
Verification:
```

---

## 16. Accessibility Requirements

For UI stories, include:

- Semantic HTML
- Keyboard navigation
- Focus visibility
- Screen reader names
- Form labels
- Error announcements
- Color contrast
- Touch target size
- Reduced motion
- Empty states
- Loading states
- Error states
- Responsive behavior
- Controller navigation if required
- Platform-specific viewport checks

Each UI story must include:

```txt
Accessibility acceptance criteria:
Accessibility tests:
Manual QA:
```

---

## 17. Performance Requirements

For performance-sensitive features, include:

```txt
Performance budget:
Expected data volume:
Hot paths:
Caching strategy:
Pagination strategy:
Memory risk:
Benchmark:
Fallow hotspot check:
```

Do not optimize blindly.

Tie performance work to measurable behavior.

---

## 18. Architecture Requirements

The plan must define:

```txt
Module boundaries:
Dependency direction:
Folder structure:
Data flow:
API flow:
State flow:
Error flow:
Testing boundaries:
Shared utilities rules:
Public contract rules:
```

Flag anything that could become:

- God component
- God service
- Junk drawer utility folder
- Duplicate logic
- Circular dependency
- Public contract drift
- Direct database access from UI
- Frontend-only authorization
- Unbounded API endpoint
- Untested critical path
- Data model leaking directly into API response
- Shared helper becoming a dumping ground

---

## 19. Observability and Reliability Requirements

Each relevant epic must include:

- Error handling
- User-safe errors
- Developer logs
- No secret leakage in logs
- Retry policy, if needed
- Timeout policy, if needed
- Cancellation behavior
- Health checks, if applicable
- Startup validation
- Recovery behavior
- Incident troubleshooting notes

For each reliability-sensitive story:

```txt
Failure mode:
User-facing behavior:
Developer log:
Recovery path:
Test:
```

---

## 20. Release Plan

Create a release plan with:

```txt
Release phases:
MVP criteria:
Beta criteria:
Production criteria:
Release blockers:
Known acceptable warnings:
Rollback plan:
Support plan:
Documentation required:
Final certification checklist:
```

The final release must require:

```txt
Build passes
Tests pass
Fallow gates reviewed
Security reviewed
No secrets exposed
Data/API contracts stable
Critical UX flows verified
Accessibility basics verified
Performance risks reviewed
CI/CD gates configured
Docs updated
Rollback documented
```

---

## 21. Risk Register

Create a risk register.

Format:

```txt
Risk ID:
Risk:
Category:
Severity:
Likelihood:
Impact:
Mitigation:
Owner:
Release blocker:
Detection method:
```

Include risks for:

- Scope creep
- Missing tests
- Data integrity
- Security
- Auth
- Performance
- Accessibility
- Dependency drift
- Architecture drift
- AI-generated code quality
- Fallow findings ignored
- No-mocked-data enforcement failure
- CI/CD gaps
- Documentation drift
- Release artifact defects
- Rollback failure
- Environment misconfiguration

---

## 22. Definition of Ready

A story is ready only if:

- User value is clear
- Acceptance criteria are testable
- Data needs are defined
- Real test data strategy is defined
- API/data contracts are known
- Security concerns are identified
- Accessibility needs are identified
- Performance risks are identified
- Fallow quality gates are defined
- Dependencies are known
- Rollback concerns are known
- Observability expectations are known

---

## 23. Definition of Done

A story is done only if:

- Code is implemented
- No placeholder logic remains
- Real data tests pass
- Critical paths are tested
- Integration behavior is proven
- API contracts are stable
- Fallow checks reviewed
- No new critical Fallow findings introduced
- Security concerns addressed
- Accessibility criteria met
- Performance risks reviewed
- Error states handled
- Docs updated
- CI gates pass
- Rollback documented if risky

---

## 24. Developer Handoff Requirements

Create a developer handoff section:

```md
## Developer Handoff

### Project Summary

### Stack

### Architecture

### Setup Commands

### Development Commands

### Test Commands

### Real Test Data Setup

### Fallow Commands

### CI/CD Gates

### Known Risks

### Do Not Touch Casually

### Next Best Tasks
```

Commands must be real or clearly marked as recommended additions.

---

## 25. AI-Agent Handoff Requirements

Create an AI-agent handoff section:

```md
## AI Agent Handoff

### Verified Stack

### Verified Commands

### Safe Edit Zones

### Dangerous Edit Zones

### Required Quality Gates

### Fallow Gates

### No-Mocked-Data Rules

### Required Verification

### Known Architecture Risks

### Current Priorities

### Do-Not-Invent Rules
```

The handoff must tell future AI agents:

- Do not invent commands.
- Do not invent APIs.
- Do not invent schemas.
- Do not use fake data as final proof.
- Do not modify public contracts without migration.
- Do not skip Fallow gates for JS/TS projects.
- Do not skip real integration tests.

---

## 26. Final Implementation Checklist

End with this checklist:

```md
## Final Implementation Checklist

### Product

- [ ] Scope is defined
- [ ] Out-of-scope items are defined
- [ ] Success metrics are defined

### Architecture

- [ ] Module boundaries defined
- [ ] Data flow defined
- [ ] API contracts defined
- [ ] Auth model defined
- [ ] Error handling defined

### Epics and Stories

- [ ] Epics are prioritized
- [ ] Stories are testable
- [ ] Acceptance criteria are concrete
- [ ] Technical tasks are implementation-ready

### Testing

- [ ] No-mocked-data policy defined
- [ ] Real test data sources defined
- [ ] Seed/reset strategy defined
- [ ] Integration tests planned
- [ ] Contract tests planned
- [ ] E2E tests planned
- [ ] Regression tests planned

### Fallow

- [ ] Fallow applicability checked
- [ ] Fallow scripts planned
- [ ] Fallow gates defined
- [ ] Baseline scan planned
- [ ] CI gate strategy defined

### Security

- [ ] Input validation covered
- [ ] Auth covered
- [ ] Authorization covered
- [ ] Secrets covered
- [ ] Logging safety covered

### Accessibility

- [ ] Keyboard navigation covered
- [ ] Focus states covered
- [ ] Screen reader basics covered
- [ ] Error messages covered

### Performance

- [ ] Hot paths identified
- [ ] Data volume considered
- [ ] Caching/pagination considered
- [ ] Benchmarks planned

### Release

- [ ] CI/CD gates defined
- [ ] Release blockers defined
- [ ] Rollback plan defined
- [ ] Handoff docs defined
```

---

## 27. Response Style Rules

Claude’s final answer must be professional and implementation-ready.

Claude must not:

- Give a short summary only
- Say “this depends” without giving a concrete path
- Ask vague follow-up questions unless absolutely required
- Invent missing commands
- Invent missing scripts
- Invent missing tests
- Invent missing APIs
- Invent Fallow setup
- Pretend mocked data proves production behavior

If information is missing, Claude must make the safest reasonable assumption and mark it clearly.

Claude must return:

1. Full development plan
2. Epic roadmap
3. Detailed stories
4. Acceptance criteria
5. Technical task breakdown
6. No-mocked-data test strategy
7. Fallow integration plan
8. CI/CD gate plan
9. Risk register
10. Release plan
11. Definition of ready
12. Definition of done
13. Developer handoff
14. AI-agent handoff
15. Final checklist

Use tables where helpful.

Be direct.
Be concrete.
Be strict.

Production code only.

---

# Usage Notes

## Best First Message to Claude

Paste the full prompt above and then add your project context below it:

```md
Here is my project context:

Application name:
...

Application purpose:
...

Target platforms:
...

Known constraints:
...

Now generate the full-scope development plan exactly as requested.
```

## Best Follow-Up Prompt

After Claude generates the plan, use:

```md
Now turn the highest-priority epic into a sprint-ready implementation plan with exact files, commands, test data, Fallow gates, no-mocked-data tests, and CI/CD verification.
```

## Best Repo-Aware Follow-Up Prompt

If Claude has access to your codebase:

```md
Now inspect the repository and revise the plan based only on verified files, real package scripts, real commands, real framework patterns, and existing tests. Mark anything unknown instead of guessing.
```

## Best Testing Follow-Up Prompt

```md
Now expand the Production Test Strategy into a full test matrix. Every critical path must include real data setup, seed/reset logic, expected results, automation level, and CI/CD gate placement. Do not use mocked data as final proof.
```

## Best Fallow Follow-Up Prompt

```md
Now create a Fallow integration plan for this repo. Verify package manager first, propose exact scripts, define baseline scan, warning gate, blocking gate, CI integration, and per-epic Fallow quality gates. Do not invent commands.
```

---

# Practical Execution Flow

Use this plan in stages:

```txt
1. Generate the full-scope development plan.
2. Review epics and remove anything out of scope.
3. Expand Epic 1 into sprint tasks.
4. Build real test data strategy before coding.
5. Add Fallow gates for JS/TS projects.
6. Implement one story at a time.
7. Run real integration/contract/E2E tests.
8. Run Fallow before and after risky changes.
9. Update docs and handoff notes.
10. Certify release readiness.
```

---

# Core Standard

This prompt is intentionally strict.

It is designed to stop Claude or any AI coding assistant from giving you:

- fake commands
- fake tests
- fake schemas
- fake API plans
- fake CI/CD
- fake production readiness
- mocked-data-only confidence
- architecture fluff
- vague epics
- stories nobody can implement

The goal is a development plan that can actually survive contact with a real repository.
