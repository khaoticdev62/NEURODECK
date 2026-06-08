# NEURODECK Design System v3.0
## Production PRD / SDS / Implementation Blueprint

Generated: 2026-06-07T18:37:16Z

NEURODECK is a local-first, controller-first AI workspace for Steam Deck, Linux, and Windows. It combines persistent chat, project knowledge, protected memory, context packs, universal search, research mode, safe automation, plugin extensibility, privacy controls, production packaging, and crash recovery into a professional-grade AI workstation.

## Product Identity

**Name:** NEURODECK  
**Primary target:** Steam Deck LCD/OLED, SteamOS Game Mode, Linux desktop, Windows 10/11  
**Core design language:** Tactical Glass, controller-first, modern AI workstation, Steam Deck-optimized 1280x800 layout  
**Core architecture:** Electron shell + React/TypeScript renderer + Rust runtime sidecar + SQLite persistence  
**Default philosophy:** Local-first, private-by-default, no hidden context injection, explicit permissions, user-owned data.

## 1.0 Release Definition

NEURODECK 1.0 is not a prototype or MVP. It is the first trustworthy production release where the core product is installable, usable, stable, recoverable, private by default, secure by design, controller-first, Steam Deck-ready, documented, test-covered, and release-repeatable.

## Required 1.0 Capabilities

- Electron desktop shell
- Rust runtime sidecar
- SQLite persistence
- Session management
- Message timeline
- Provider runtime
- Ollama support
- Remote provider support
- Credential vault
- Prompt draft recovery
- Memory system
- Project knowledge spaces
- Context packs
- Universal search
- Privacy levels
- Sealed memory
- Workspace dashboard
- Model context builder
- Research Mode
- Knowledge export/import
- Safe local agents
- Workflow engine
- Permission system
- Automation builder
- Plugin SDK runtime
- Plugin manager
- Marketplace foundation
- Plugin QA gate
- Production installers
- Steam Deck launcher
- Recovery system
- Support bundle

# Chapter Index

## Volume 2 — Design System Core
- 1. Design Principles
- 2. Tailwind-Based Design Token Architecture
- 3. Layout, Grid & Screen Density
- 4. Component Architecture & Primitive Library
- 5. Screen Architecture & Workspace Specs
- 6. Interaction Architecture, Controller UX & Focus Graph
- 7. Visual Language, Iconography & Tactical Glass
- 8. Motion System
- 9. Audio Design
- 10. Accessibility & Internationalization
- 11. Theme Engine & Personalization
- 12. State Management, Data Architecture & Runtime
- 13. Security Architecture, Privacy & Enterprise Hardening
- 14. Performance Engineering & Steam Deck Optimization
- 15. Multi-Agent Framework
- 16. Plugin SDK & Extension Platform

## Volume 3 — Engineering & Platform Architecture
- 17. Repository Architecture

## Volume 4 — Product Execution & Delivery
- 18. Product Roadmap, Epics & Sprints
- 19. Production PRD Master

## Volume 5 — Production Engineering Specifications
- 20. SDS
- 21. Database Architecture
- 22. Electron Architecture
- 23. Rust Runtime
- 24. IPC Contracts/API
- 25. State Management
- 26. Testing/QA
- 27. DevOps/CI/CD/Release
- 28. Marketplace
- 29. Enterprise
- 30. Production Launch Blueprint

## Volume 6 — Production Build Specifications
- 31. Electron Folder Structure & Source Tree
- 32. Rust Workspace & Crate Specs
- 33. Complete Production DB Schema
- 34. API & IPC Contract Catalog
- 35. UI Component Library
- 36. Controller Navigation Graph
- 37. Agent Runtime Implementation
- 38. Workflow Engine
- 39. Security Hardening
- 40. GitHub Repo, CI/CD & Release Files

## Volume 7 — Implementation Artifacts & Production Assets
- 41. Complete GitHub Repository Structure
- 42. Full Electron Application Source Layout
- 43. Full Rust Service Implementations
- 44. Production Database SQL
- 45. Tailwind + Design Token System
- 46. Complete Component Catalog
- 47. Steam Deck UX & Navigation Maps
- 48. Plugin SDK & Marketplace SDK
- 49. Multi-Agent Orchestration Engine
- 50. Sprint Plan: 0.1 → 1.0

## Volume 8 — Execution Package
- 51. GitHub Project Structure, Epics & Program Management
- 52. Complete Product Backlog
- 53. Production UI Screens, Navigation Flows & Wireframes
- 54. Database Migration Files & SQL Deployment Architecture
- 55. IPC Schema Files, Runtime Contracts & Typed API Definitions
- 56. Rust Crate Scaffolds & Service Bootstrapping
- 57. Electron Application Scaffolds & Frontend Architecture
- 58. Plugin SDK Source Templates & Marketplace Development Kit
- 59. CI/CD YAML Files & Release Automation
- 60. Production Implementation Roadmap: 0.1 → 1.0

## Volume 9 — Production Repository Generation Package
- 61. Complete GitHub Repository Tree
- 62. package.json, Cargo.toml & Workspace Configuration
- 63. Electron Main Process Source Architecture
- 64. React Application Bootstrap
- 65. Tactical Glass Theme Source System
- 66. Rust Runtime Bootstrap Code & Service Registry
- 67. Database Migration Source Files
- 68. IPC Source Implementations
- 69. GitHub Actions YAML Files & Release Automation
- 70. Build-Ready Repository Scaffolding

## Volume 10 — Production Build Validation & Hardening
- 71. Scaffold Validation, First Build Runbook & Repository Hardening
- 72. Foundation Milestone 0.1.0
- 73. Foundation Implementation Patch Plan
- 74. SQLite-Backed Runtime Bridge
- 75. Logging, Error Boundaries, Crash Recovery & Diagnostics Panel
- 76. Prompt Draft Recovery, Autosave & Session Restore
- 77. Local Encryption, Secret Vault & Safe Provider Credentials
- 78. Provider Runtime Integration
- 79. Chat Workspace v0.2.0
- 80. Session Management v0.2.0

## Volume 11 — Intelligence Layer
- 81. Memory System v0.3.0
- 82. Project Knowledge Spaces v0.3.0
- 83. Context Packs & Prompt Context Injection v0.3.0
- 84. Universal Search v0.3.0
- 85. Memory Privacy, Permissions & Encryption Upgrade v0.3.0
- 86. Workspace Intelligence Dashboard v0.3.0
- 87. Model Context Builder v0.3.0
- 88. Research Mode v0.4.0
- 89. Knowledge Export / Import v0.4.0
- 90. Intelligence Layer QA & Release Gate

## Volume 12 — Automation, Agents & Workflow Engine
- 91. Agent Runtime v0.5.0
- 92. Workflow Engine v0.5.0
- 93. Tool Permission System v0.5.0
- 94. Automation Builder v0.5.0

## Volume 13 — Extension Platform, Marketplace & Release Hardening
- 95. Plugin SDK Runtime v0.6.0
- 96. Plugin Marketplace Foundation v0.6.0
- 97. Plugin QA, Compatibility & Security Review Gate v0.6.0
- 98. Production Packaging, Installers & Steam Deck Release Channel v0.7.0
- 99. Production Observability, Crash Recovery & Support Bundle v0.7.0
- 100. Final Production Release Gate, 1.0 Readiness & Master Spec Closure


## Architecture Summary

```text
Renderer UI
  ↓ explicit preload allowlist
Electron Main Process
  ↓ JSON-RPC style bridge
Rust Runtime Sidecar
  ↓ service registry
Domain Services
  ↓
SQLite + local app data
```

Domain services include sessions, messages, models, security, recovery, memory, projects, context-packs, search, privacy, dashboard, model-context, research, knowledge-archive, agents, workflows, permissions, automation, plugins, marketplace, and observability.

## Security Rules

- Context isolation enabled.
- Node integration disabled in renderer.
- Explicit IPC allowlist only.
- No wildcard IPC forwarding.
- No raw SQL IPC.
- No vault-read IPC.
- Provider credentials encrypted.
- Sealed memory encrypted.
- Support bundles redacted.
- Plugin APIs permission-gated.
- Agents and workflows permission-gated.
- No hidden context injection.
- No automatic memory use without user approval.

## Steam Deck Rules

- Primary viewport: 1280x800.
- No horizontal overflow.
- Controller-first navigation.
- Steam keyboard support.
- No mouse-only critical paths.
- No hover-only actions.
- Modals must fit viewport.
- Prompt console must remain reachable.
- Recovery flows must be usable in Game Mode.

## Final Release Gates

1. Product Gate
2. Engineering Gate
3. Security Gate
4. Privacy Gate
5. Steam Deck Gate
6. Accessibility Gate
7. Performance Gate
8. Persistence Gate
9. Installer Gate
10. Plugin Gate
11. Documentation Gate
12. Support Gate

## Final Statement

NEURODECK Design System v3.0 is a complete production blueprint for a local-first AI workstation optimized for Steam Deck, Linux, and Windows.
