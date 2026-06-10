# Volume XIV — Security Architecture & Platform Hardening

## Philosophy
Inputs are hostile, plugins are untrusted, models can hallucinate, users make mistakes, networks are compromised. Follow zero trust, least privilege, defense in depth, secure by default.

## Threat Categories
Prompt injection, plugin abuse, IPC exploitation, data leakage, privilege escalation, memory poisoning, credential exposure, supply chain attacks.

## Electron Hardening
Required: contextIsolation true, sandbox true, nodeIntegration false, enableRemoteModule false, webSecurity true.

Forbidden: nodeIntegration=true, remote module usage, unsafe eval.

## IPC Security
Renderer never accesses filesystem, database, plugins, or OS APIs directly. Every IPC request validates, authorizes, executes, audits.

## Prompt Injection Defense
System prompt isolation, memory segmentation, context sanitization, agent guardrails. User prompts must never modify agent definitions, security policies, or routing rules.

## Plugin Sandboxing
Default permissions none. Plugins cannot access credentials, secrets, system memory, other plugin storage, raw database, raw IPC, or OS shell.

## Secrets
Never stored in source, prompt packs, plugin manifests, renderer state, localStorage, JSON, or Git. Approved: OS keychain, Windows Credential Manager, encrypted vault.

## Memory Security
Protect project context, agent context, workspace state with encryption, retention, deletion, export controls.

## Telemetry Privacy
Local only by default. Never collect passwords, API keys, tokens, personal information.

## OWASP Alignment
OWASP Top 10, OWASP ASVS, Electron Security Guide.

## Incident Response
Detect → contain → investigate → remediate → recover → review.

## Certification
Cannot ship unless Electron hardened, IPC validated, secrets protected, plugin sandbox enforced, permissions enforced, OWASP mapped, telemetry privacy verified, dependency scans pass, incident response documented.
