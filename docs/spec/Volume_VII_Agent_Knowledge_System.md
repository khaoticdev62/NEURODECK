# Volume VII — Agent Knowledge System

## Philosophy
PromptDrive agents are specialized cognitive workers, not chat personas. Each agent has role, capabilities, limitations, memory rules, routing rules, escalation rules, and output rules.

## Agent Lifecycle
Load → initialize → receive task → process context → execute → validate → return result → persist memory.

## Built-In Agents

- Architect Agent: PRDs, SDS, architecture reviews, epic planning.
- Developer Agent: code generation, bug fixes, features, refactors, implementation.
- Refactor Agent: cleanup, simplification, performance, maintainability.
- Testing Agent: unit, integration, E2E, regression, edge cases.
- Security Agent: OWASP, Electron security, IPC validation, secret detection.
- UX Agent: controller UX, accessibility, navigation, design systems.
- Documentation Agent: README, API docs, release notes, migration guides.
- Release Agent: packaging, CI/CD, version validation, release notes.
- Steam Deck QA Agent: L4/L5/R4/R5, focus graphs, suspend/resume, docked mode.
- Research Agent: evidence-based technology research and best practices.

## Routing Engine
Routes by prompt category, tags, project context, user history, active workspace.

## Agent Chaining
Architect → Developer → Testing → Security → Release is the default production chain.

## Certification
Agents cannot ship without defined routing, escalation, memory, validation, output, and failure recovery rules.
