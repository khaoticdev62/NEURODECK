# MASTER INDEX — NEURODECK PromptDrive Full Spec

## Core Volumes

1. PRD + SDS Master Blueprint
2. Steam Deck UX Bible Volume I — Controller Navigation Foundations
3. Steam Deck UX Bible Volume II — Screen Specifications
4. Steam Deck UX Bible Volume III — Controller Runtime & Navigation Architecture
5. Design System Core Volume IV — Tactical Glass Design System
6. Component Library Volume V — Component System Specification
7. Prompt Library Volume VI — Prompt Pack Architecture
8. Agent Knowledge System Volume VII
9. Memory Engine Architecture Volume VIII
10. Plugin SDK & Hermes Integration Volume IX
11. Accessibility Bible Volume X
12. Telemetry & Diagnostics Volume XI
13. QA & Certification Volume XII
14. Release Engineering & CI/CD Volume XIII
15. Security Architecture Volume XIV
16. Future Platform Roadmap Volume XV
17. Production Implementation Suite Phase XVI

## Key Production Gates

PromptDrive is production-ready only when:

- Controller-only workflows pass on Steam Deck handheld and docked mode.
- L4/L5/R4/R5 mappings are fully functional and remappable.
- Prompt Composer vertical slice works end-to-end.
- Autocomplete returns suggestions under 50ms.
- SQLite persistence works for prompts, macros, agents, memory, and controller profiles.
- Electron renderer has no direct filesystem/database/OS access.
- Accessibility, QA, security, and release gates pass.

## Implementation Priority

1. Electron shell
2. Design tokens + component primitives
3. Controller runtime + focus graph
4. Prompt composer + prompt library
5. Autocomplete
6. Command runtime
7. Macro engine
8. Agent runtime
9. Memory engine
10. Plugin SDK
11. Telemetry and diagnostics
12. QA/security/release hardening
