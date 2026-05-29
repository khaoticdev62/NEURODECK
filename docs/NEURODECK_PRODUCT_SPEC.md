# NEURODECK — Product Specification & Vision
## AI Operating System for the Steam Deck Era
### Version: v1.2.x (Codename: Ra)
### KFMS Governance: Thoth → Ra → Anubis

---

> **This is not a chatbot. This is not a sidebar assistant. This is an AI Operating System.**
> NEURODECK turns a Steam Deck — or any desktop — into a fullscreen AI workstation:
> autonomous agents, live code canvas, real shell, SSH, P2P file sharing, vector memory,
> voice I/O, gamepad-native UX, and a remote control layer — all in a single
> 1280×800 Tauri window built in Rust.

---

# TABLE OF CONTENTS

1. Vision
2. Product Philosophy
3. Core Design Principles
4. System Architecture
5. Feature Registry (Shipped vs. Planned)
6. Agent Architecture
7. Workspace & View System
8. Memory Infrastructure
9. Tool & Plugin Ecosystem
10. Desktop & Shell Layer
11. Runtime & Execution Infrastructure
12. IDE & Canvas Environment
13. Autonomous Task System
14. Voice & Realtime Interaction
15. Artifact System
16. AI-Native UX/UI Design
17. Visualization Systems
18. Security Architecture
19. Permissions & Safety Layer
20. Workflow Engine
21. Multi-Model Orchestration
22. Plugin & Extension System
23. Performance Requirements
24. Tech Stack (Locked)
25. Database Architecture
26. Local-First Architecture
27. Cloud Synchronization
28. Offline Support
29. Telemetry & Observability
30. Deployment Targets
31. Monetization Strategy
32. Future Expansion
33. MVP Status
34. Long-Term Roadmap
35. Competitive Advantages
36. Closing Vision

---

# 1. VISION

NEURODECK is the world's first AI OS designed natively for handheld gaming hardware.

The Steam Deck is a supercomputer running SteamOS with a full x86-64 processor,
16GB RAM, and a growing developer ecosystem. It sits in millions of hands —
and almost zero productivity software targets it.

NEURODECK changes that.

The system functions as:

- An autonomous AI assistant and coding copilot
- A multi-agent orchestration environment
- A persistent memory and knowledge system
- A real terminal OS with PTY shell, SSH, and FTP
- A live code and artifact canvas
- A remote-controllable workstation (access from phone/tablet)
- A gamepad-native AI interface
- A self-hosted local-inference platform (Ollama)
- A plugin-extensible runtime (Lua 5.4)

The application feels like VSCode + Warp + Obsidian + Discord + Docker Desktop —
unified, fullscreen, controller-ready, AI-first.

---

# 2. PRODUCT PHILOSOPHY

## Primary Goal

Replace fragmented developer and creator workflows with a single intelligent
operating environment that runs on the most portable powerful computer available:
the Steam Deck.

## Secondary Goals

- Zero context switching — everything in one window
- Gamepad-first, keyboard-second, touch-optional
- Local inference by default — privacy and offline capability
- Autonomous execution with human-in-the-loop approval
- Persistent intelligence — the system remembers everything important
- Remote accessibility — control from phone, tablet, or another machine

## Product Identity

NEURODECK must feel:

- **Alive** — boot sequence, typing animations, live system stats
- **Contextual** — game detection, active persona, RAG-injected memory
- **Spatial** — multi-view navigation, canvas, graph-ready
- **Persistent** — sessions, memory, config, plugins survive reboots
- **Gamepad-native** — every action reachable without a keyboard
- **Hackable** — Lua plugins, custom personas, custom themes

NOT:

- A chat popup bolted onto another app
- A browser extension
- A cloud-only product with no offline mode
- A framework demo with no real functionality

---

# 3. CORE DESIGN PRINCIPLES

## 3.1 AI-Native UX

Every view assumes:
- AI is always available in the active context
- AI understands what the user is doing (game context, active file, shell history)
- AI can execute autonomously with approval gates
- AI adapts its persona to the task

## 3.2 Human-in-the-Loop

Users maintain:
- Final approval on destructive agent actions
- Visibility into every agent step (agent log)
- Rollback access via session snapshots
- Permission control via config and keychain

## 3.3 Persistent State

Everything persists:
- Chat sessions (JSON serialization)
- Vector memory (cosine-similarity DB)
- PTY session state (restart on reconnect)
- Config (llm-term.toml + keychain)
- Plugins (Lua runtime reloads at startup)
- Custom personas and themes

## 3.4 Controller-First Interaction

All systems support:
- D-Pad navigation within views
- L1/R1 tab switching
- L2 radial menu (8 quick-access segments)
- A/B/X/Y action buttons
- Grip buttons (L4/R4/L5/R5) for sidebar and canvas
- Virtual keyboard (Y button toggle)
- Controller prompt picker (X button — 50+ AI prompts, no typing required)

## 3.5 Local-First, Cloud-Optional

- Default: Ollama local inference, local memory, local PTY
- Optional: Gemini API (streaming SSE), OAuth, cloud sync (planned)
- All core features work fully offline

---

# 4. SYSTEM ARCHITECTURE

## Current Architecture

```
┌──────────────────────────────────────────────────────┐
│              NEURODECK FRONTEND (Tauri WebView)      │
│   Vite + Vanilla JS — 11 views, gamepad loop,        │
│   xterm.js, canvas, chat, memory, agent, SSH/FTP/    │
│   transfer, remote control, prompt lab, radial menu  │
└──────────────────────────────────────────────────────┘
                         │  Tauri IPC (invoke / emit)
                         ▼
┌──────────────────────────────────────────────────────┐
│              RUST BACKEND (Tauri v2)                 │
│                                                      │
│  lib.rs        — command handlers, AppState,         │
│                   themes, personas, game detection   │
│  llm.rs        — Gemini SSE + Ollama providers,      │
│                   embedding generation               │
│  pty_manager.rs — multi-session PTY (portable-pty)   │
│  memory.rs     — vector DB, cosine similarity,       │
│                   RAG injection                      │
│  lua.rs        — Lua 5.4 plugin runtime (mlua)       │
│  remote_control.rs — HTTP server + WebSocket remote  │
│  canvas_collab.rs  — TCP canvas collaboration        │
│  transfer.rs   — LAN P2P + Warpinator gRPC           │
│  tunnel.rs     — SteamOS Game↔Desktop bridge         │
│  ftp.rs        — FTP/SFTP via suppaftp               │
│  config.rs     — llm-term.toml parser                │
│  storage.rs    — session JSON persistence            │
└──────────────────────────────────────────────────────┘
         │                    │                  │
         ▼                    ▼                  ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
│  MEMORY      │   │  LLM PROVIDERS   │   │  PLUGIN      │
│  Vector DB   │   │  Gemini (cloud)  │   │  SYSTEM      │
│  chat_history│   │  Ollama (local)  │   │  Lua 5.4     │
│  .json       │   │  Multi-agent     │   │  auto_resp.  │
│              │   │  profiles        │   │  bmad.lua    │
│              │   │                  │   │  ip_lookup.  │
│              │   │                  │   │  promptgen.  │
└──────────────┘   └──────────────────┘   └──────────────┘

         │                    │                  │
         ▼                    ▼                  ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
│  INFRA CRATE │   │  NETWORKING      │   │  SYSTEM      │
│  secrets.rs  │   │  mDNS discovery  │   │  PTY shell   │
│  oauth.rs    │   │  Warpinator gRPC │   │  SSH client  │
│  warpinator  │   │  HTTP remote     │   │  FTP/SFTP    │
│  .rs         │   │  TCP collab      │   │  Steam ACF   │
└──────────────┘   └──────────────────┘   └──────────────┘
```

## Target Architecture (v2.0)

```
┌──────────────────────────────────────────────────────┐
│              NEURODECK FRONTEND                      │
│   + Infinite workspace canvas (spatial computing)    │
│   + Monaco editor integration                        │
│   + Knowledge graph visualization                    │
│   + Workflow visual builder                          │
│   + Multi-agent dashboard                            │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│              RUST BACKEND                            │
│   + Multi-agent orchestrator (LangGraph-style)       │
│   + Task scheduler + queue                           │
│   + Browser automation (headless Chromium)           │
│   + Desktop computer use layer                       │
│   + WASM sandbox runtime                             │
│   + Docker/container integration                     │
│   + Webhook + trigger engine                         │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│              DATA LAYER                              │
│   SQLite (structured local data) — current           │
│   Qdrant (vector store) — planned upgrade            │
│   Neo4j/graph (knowledge graph) — planned            │
│   PostgreSQL (cloud sync backend) — planned          │
└──────────────────────────────────────────────────────┘
```

---

# 5. FEATURE REGISTRY

## Legend: ✅ Shipped | 🔧 Partial | 📋 Planned | 🚀 Stretch

| Feature | Status | Notes |
|---|---|---|
| LLM Chat (Gemini + Ollama) | ✅ | Streaming SSE, RAG injection, persona |
| Multi-Agent Profiles | ✅ | Named agents, live switching, 6 defaults |
| PTY Shell (multi-session) | ✅ | Up to 5 tabs, shell switcher, AI history |
| SSH Client | ✅ | Password + key auth, PTY-backed |
| FTP/SFTP Client | ✅ | File browser, saved profiles, drag-drop |
| Code Canvas | ✅ | HTML/CSS/JS live preview, Python/Bash exec, Lua |
| Canvas Collaboration | ✅ | TCP P2P host/join, real-time sync |
| Vector Memory + RAG | ✅ | Cosine similarity, CRUD, top-3 injection |
| Autonomous Agent Loop | ✅ | 5-step max, Gemini+Ollama, tool calls |
| LAN P2P File Transfer | ✅ | Warpinator gRPC, mDNS discovery |
| Remote Control Webapp | ✅ | Mobile web UI: Chat/Term/Actions/Prompts tabs |
| SteamOS Game Mode Tunnel | ✅ | TCP loopback Game↔Desktop bridge |
| Lua Plugin System | ✅ | Hot-load at startup, registerCommand/Hook |
| Voice STT/TTS | ✅ | arecord + espeak (Linux); Windows SAPI |
| Gamepad Navigation | ✅ | Full D-pad/button/radial menu/VK |
| Controller Prompt Picker | ✅ | 50+ templates, D-pad nav, no-type workflow |
| Persona System | ✅ | 9 built-in + custom, Lua BMAD integration |
| Theme System | ✅ | 6+ themes, custom color picker |
| Prompt Lab | ✅ | AIDA/SCQA/PASTOR/CoT/ToT/PAS + JPE explain |
| Game Context Detection | ✅ | ACF scanner, badge, persona switch, ask AI |
| Onboarding Wizard | ✅ | 6-slide, diagnostics, controller guide |
| Boot Sequence | ✅ | Cinematic ASCII boot with real system stats |
| Settings Modal | ✅ | Provider, API key, model, plugins, themes |
| Notification Center | ✅ | Toast + modal, agent/SSH/FTP/transfer hooks |
| KFMS Version Governance | ✅ | meta.json, CI schema validation |
| Agent Recommended Models | ✅ | 11 curated Gemini+Ollama with VRAM/Deck badges |
| XSS Hardening | ✅ | escapeHtml, sanitizeHtml, scheme allowlist |
| Monaco Editor | 📋 | Replace basic canvas textarea |
| Knowledge Graph View | 📋 | Memory relationship visualization |
| Workflow Visual Builder | 📋 | Drag-drop automation chains |
| Task Scheduler | 📋 | Cron-style scheduled agent runs |
| Browser Automation | 📋 | Headless Chromium integration |
| Desktop Computer Use | 📋 | Mouse/keyboard/screen capture layer |
| Cloud Sync | 📋 | Memory + session encrypted sync |
| Plugin Marketplace | 📋 | Lua plugin registry + install from URL |
| Multi-Agent Orchestration | 📋 | Parallel agents with coordinator |
| Container/Docker Integration | 🚀 | Docker Desktop-like management |
| WASM Sandbox Runtime | 🚀 | Isolated code execution |
| AR/XR Interface | 🚀 | Spatial computing layer |
| Mobile Companion App | 🚀 | Native iOS/Android (beyond web remote) |

---

# 6. AGENT ARCHITECTURE

## Current State (v1.2)

```
User message
     │
     ▼
send_command (lib.rs)
     │
     ├── RAG: embed query → cosine search → top-3 inject
     ├── Game context inject
     ├── Persona inject
     │
     ▼
Active LLM Provider (Arc<dyn LlmProvider>)
     │
     ├── GeminiProvider (streaming SSE)
     └── OllamaProvider (local HTTP)
     │
     ▼
Stream chunks → frontend via emit("stream_chunk")
     │
     ▼
Memory store (embedding + text)
```

## Agent Loop (5-step autonomous)

```
invoke("start_agent_loop", { goal })
     │
     ▼
Step 1-5:
  ├── think: LLM reasons about next action
  ├── act: exec_code / shell / search / remember
  ├── observe: capture output
  └── emit("agent_step", payload) → frontend log
     │
     ▼
Done or max_steps reached → emit("agent_done")
```

## Target State (v2.0 — Multi-Agent Orchestrator)

```
User goal
     │
     ▼
Task Parser → intent extraction
     │
     ▼
Agent Dispatcher
     │
     ├── Development Agent  (code, debug, refactor)
     ├── Research Agent     (search, summarize, docs)
     ├── System Agent       (files, shell, desktop)
     └── Creative Agent     (canvas, design, writing)
     │
     ▼
Coordinator (inter-agent message bus)
     │
     ▼
Execution Engine (parallel + sequential)
     │
     ▼
Validation + Approval Gate
     │
     ▼
User confirmation → result delivery
```

## Agent Capabilities Roadmap

| Capability | v1.2 | v2.0 |
|---|---|---|
| LLM reasoning | ✅ | ✅ |
| Code execution | ✅ | ✅ |
| Shell commands | ✅ | ✅ |
| Memory retrieval | ✅ | ✅ |
| File manipulation | 🔧 | ✅ |
| Browser control | ❌ | ✅ |
| Desktop interaction | ❌ | ✅ |
| Parallel sub-agents | ❌ | ✅ |
| Workflow chaining | ❌ | ✅ |
| Task scheduling | ❌ | ✅ |
| Inter-agent comms | ❌ | ✅ |

---

# 7. WORKSPACE & VIEW SYSTEM

## Current Views (11 tabs)

| View | ID | Purpose |
|---|---|---|
| Chat | `#view-chat` | AI conversation, RAG, streaming |
| Canvas | `#view-canvas` | Code editor, live HTML preview, Python/Bash exec |
| Terminal | `#view-terminal` | Multi-session PTY, AI shell history |
| SSH | `#view-ssh` | Remote shell via system SSH binary |
| Tunnel | `#view-tunnel` | SteamOS Game↔Desktop bridge |
| Share | `#view-share` | LAN transfer + FTP/SFTP tabs |
| Browser | `#view-browser` | In-app web browser |
| Agent | `#view-agent` | Autonomous loop with step log |
| Memory | `#view-memory` | Vector DB CRUD, search, pin |
| Prompt Lab | `#view-prompt-lab` | 15 prompt formulas + JPE explainer |
| Remote | `#view-remote` | Remote control server + QR code |

## Planned Workspace Extensions (v2.0)

- **Infinite canvas** — pan/zoom workspace with draggable panels
- **Knowledge Graph view** — D3.js or Cytoscape memory relationship graph
- **Workflow Builder view** — visual node editor for automation chains
- **Multi-Agent Dashboard** — live status grid of running agents
- **Artifact Gallery** — versioned canvas outputs, diff view, export

---

# 8. MEMORY INFRASTRUCTURE

## Current Implementation

```
memory.rs
├── MemoryRecord { text, embedding: Vec<f32>, metadata }
├── cosine_similarity(a, b) → f32
├── search(query_embedding, top_k) → Vec<MemoryRecord>
├── store(text, embedding)
└── Persistence: data/memory/chat_history.json
```

RAG is active in `send_command`: every user message generates an embedding,
searches top-3, and prepends context to the LLM prompt.

## Memory Categories (Current)

- **Chat history** — every message pair stored as embedding
- **Pinned records** — user-marked important memories
- **Custom docs** — user-uploaded text indexed via `/remember`

## Target Memory Architecture (v2.0)

```
┌─────────────────────────────────────────────┐
│              MEMORY LAYER                   │
│                                             │
│  Semantic Memory    → Qdrant vector store   │
│  Procedural Memory  → workflow recordings   │
│  Preference Memory  → user style profiles   │
│  Temporal Memory    → timeline event log    │
│  Session Memory     → conversation graphs   │
└─────────────────────────────────────────────┘
```

| Category | Storage | Status |
|---|---|---|
| Semantic (chat) | custom JSON vector DB | ✅ |
| Pinned records | memory.rs flags | ✅ |
| Session state | sessions/*.json | ✅ |
| Preference (config) | llm-term.toml + localStorage | ✅ |
| Procedural (workflows) | workflow engine | 📋 |
| Graph relationships | Neo4j / SQLite graph | 📋 |
| Qdrant upgrade | Qdrant REST API | 📋 |

---

# 9. TOOL & PLUGIN ECOSYSTEM

## Current Lua Plugin System

Plugins live in `plugins/` and are auto-loaded at startup via `lua.rs`.

### Built-in Plugins

| Plugin | Commands | Hooks |
|---|---|---|
| `auto_responder.lua` | — | `onMessage`, `onAIResponse` |
| `bmad.lua` | `/john /sally /winston /amelia /paige /mary` | — |
| `ip_lookup.lua` | `/ip_lookup` | — |
| `promptgen.lua` | `/promptlab /promptgen /formula` | — |

### Lua Plugin API

```lua
registerCommand("/cmd", function(args) ... end)
registerHook("onMessage", function(msg) ... end)
setPersona("name")
execute("shell command")
print("log to console")
```

## Planned Tool Extensions

| Tool | Integration | Priority |
|---|---|---|
| GitHub / GitLab | MCP server | High |
| Docker Desktop | REST API | High |
| Browser automation | Headless Chromium | High |
| Notion / Obsidian | REST API | Medium |
| Slack / Discord | Webhook + API | Medium |
| Figma | REST API | Low |
| Kubernetes | kubectl wrapper | Low |

## MCP Integration Plan

Model Context Protocol servers can be registered as Lua plugins or native Rust
MCP clients. Each MCP server gets a scoped permission set and runs in isolation.

---

# 10. DESKTOP & SHELL LAYER

## Current Shell Capabilities

- PTY shell (bash/zsh/fish/powershell) via `portable-pty`
- Up to 5 concurrent sessions with independent xterm.js instances
- AI shell history overlay (Ctrl+H) with semantic search
- SSH client (password + key auth) as PTY session
- FTP client (suppaftp) with file browser
- SFTP client (system sftp binary, batch mode)

## Planned Desktop Layer (v2.0)

```
Desktop Computer Use Layer
├── Screen capture (screenshots for AI context)
├── Mouse control (xdotool on Linux, SendInput on Windows)
├── Keyboard injection
├── UI element detection (OCR + accessibility tree)
└── Browser DOM control (headless Chromium CDP)
```

This enables NEURODECK agents to:
- Control any desktop application
- Fill web forms autonomously
- Navigate GUIs without keyboard
- Perform visual testing

---

# 11. RUNTIME & EXECUTION INFRASTRUCTURE

## Current Execution Environments

| Environment | How | Status |
|---|---|---|
| Shell (bash/sh/pwsh) | PTY via portable-pty | ✅ |
| Python | `python -c` subprocess | ✅ |
| Bash scripts | `bash -c` subprocess | ✅ |
| Lua scripts | mlua runtime (in-process) | ✅ |
| HTML/CSS/JS | Tauri WebView iframe | ✅ |
| SSH remote | system ssh binary | ✅ |

## Planned Runtime Extensions

| Runtime | Technology | Priority |
|---|---|---|
| WASM sandbox | wasmtime crate | High |
| Docker containers | Docker REST API | High |
| Node.js scripts | node subprocess | Medium |
| Deno scripts | deno subprocess | Medium |
| Firecracker VMs | virtio-net | Low (stretch) |

---

# 12. IDE & CANVAS ENVIRONMENT

## Current Canvas

- Language tabs: HTML/CSS/JS, Python, Bash, Markdown, Lua
- HTML: live iframe preview with hot reload
- Python/Bash: exec via subprocess, stdout in preview pane
- Lua: execute via mlua runtime
- TCP canvas collaboration: host/join with real-time text sync
- Basic textarea editor (no syntax highlighting)

## Planned IDE Features

| Feature | Technology | Priority |
|---|---|---|
| Monaco Editor | `@monaco-editor/react` or direct CDN | High |
| Syntax highlighting | Monaco built-in | High |
| Inline AI editing | invoke("ai_edit_code") | High |
| Diff previews | Monaco diff editor | Medium |
| Git integration | git2 crate | Medium |
| LSP support | tower-lsp | Low |
| Multi-file workspace | virtual FS in Monaco | Low |

---

# 13. AUTONOMOUS TASK SYSTEM

## Current Agent Loop

- 5-step max autonomous execution
- Actions: code exec, shell, memory store, LLM reason
- Works with Gemini and Ollama
- Per-step emit to frontend agent log
- Manual trigger via "Start Agent" button

## Planned Task Engine

```
Task Queue
├── Immediate tasks (user-triggered)
├── Scheduled tasks (cron-style)
├── Event-triggered tasks (file change, webhook, timer)
└── Dependency chains (task A unlocks task B)

Task Types
├── Code generation + execution
├── File operations
├── Web scraping / research
├── System administration
├── Workflow automation
└── Data transformation
```

| Feature | Status |
|---|---|
| Manual agent trigger | ✅ |
| 5-step autonomous loop | ✅ |
| Tool call routing | ✅ |
| Scheduled execution | 📋 |
| Dependency chains | 📋 |
| Retry logic | 📋 |
| Task queue UI | 📋 |
| Webhook triggers | 📋 |

---

# 14. VOICE & REALTIME INTERACTION

## Current Voice System

- **STT**: `arecord` (Linux ALSA) → raw audio → system transcription
- **TTS**: `espeak`/`espeak-ng` (Linux), SAPI (Windows), `say` (macOS)
- Voice button in chat header
- Remote control webapp has Web Speech API voice input

## Planned Voice Upgrades

| Feature | Technology | Priority |
|---|---|---|
| Whisper STT (local) | whisper.cpp via Rust FFI | High |
| Streaming voice response | real-time audio chunk emit | High |
| Wake word detection | "Hey Deck" trigger | Medium |
| Voice activity detection | WebRTC VAD | Medium |
| Meeting transcription | continuous VAD + Whisper | Low |

---

# 15. ARTIFACT SYSTEM

## Current Artifacts

- Canvas outputs (HTML apps, Python results, Markdown docs)
- Chat message history (JSON session)
- Memory records (vector DB entries)
- Agent log (step-by-step execution trace)

## Planned Artifact Gallery

| Artifact Type | Storage | Status |
|---|---|---|
| Canvas HTML apps | localStorage | ✅ |
| Canvas code files | localStorage | ✅ |
| Chat sessions | sessions/*.json | ✅ |
| Agent logs | in-memory (ephemeral) | 🔧 |
| Generated images | data/artifacts/ | 📋 |
| Workflow definitions | workflows/*.yaml | 📋 |
| Code diffs | git2 | 📋 |
| Exported reports | PDF via webview print | 📋 |

---

# 16. AI-NATIVE UX/UI DESIGN

## Design Language

NEURODECK uses a glass morphism + terminal aesthetic:

```css
Background:   #06080e  (near-black)
Accent:       #00f0ff  (cyan)
Response:     #d9f7ff  (ice blue)
Error:        #ff4466  (red)
Success:      #00ff88  (green)
Warning:      #ffaa00  (amber)

Glass panels: linear-gradient fill, border-top highlight lift,
              inset box-shadow — NO backdrop-filter (Steam Deck GPU)
```

## Interaction Model

```
Primary:   Gamepad (D-pad nav, buttons, radial, VK)
Secondary: Keyboard (shortcuts, command palette)
Tertiary:  Touch (Steam Deck touchscreen, tap targets)
Optional:  Mouse (desktop mode)
```

## Key UX Patterns

- **Radial Menu** — L2 or backtick → 8 view segments, instant navigation
- **Controller Prompt Picker** — X button → 50+ templates, zero typing
- **Virtual Keyboard** — Y button → full QWERTY with gamepad control
- **Notification Center** — toast + expandable modal, system-aware
- **Boot Screen** — cinematic ASCII art with real system diagnostics
- **Onboarding Wizard** — 6-slide setup with controller guide + diagnostics

## Planned UX Additions

| Feature | Priority |
|---|---|
| Command palette (Ctrl+P / Select+X) | High |
| Spatial infinite canvas with pan/zoom | High |
| Knowledge graph visualization | Medium |
| Workflow visual builder | Medium |
| Split-view panels (two views side-by-side) | Medium |
| Dark/light mode auto-switch by time | Low |

---

# 17. VISUALIZATION SYSTEMS

## Planned Visualization Views

### Knowledge Graph
```
D3.js force-directed graph
Nodes: memory records, sessions, personas, files
Edges: semantic similarity, temporal links, references
Actions: click node → expand, open in chat, delete
```

### Workflow Graph
```
Node editor (similar to n8n / Comfy UI)
Nodes: LLM call, shell exec, file read/write, HTTP, condition
Edges: data flow connections
Actions: drag to connect, run, schedule
```

### Agent Activity Graph
```
Live tree view of multi-agent execution
Shows: agent identity, current task, tool calls, timing
Updates: via emit("agent_activity") stream
```

### Memory Timeline
```
Horizontal timeline of memory records
Filter by date, session, tag, similarity
Click: expand full record
```

---

# 18. SECURITY ARCHITECTURE

## Current Security

| Layer | Implementation |
|---|---|
| API key storage | OS keychain (keyring 2.x) |
| URL scheme allowlist | http/https only in browser commands |
| XSS prevention | window.escapeHtml() + window.sanitizeHtml() |
| IPC security | Tauri CSP + allowlisted commands |
| Config isolation | llm-term.toml + keychain, not env vars |
| Plugin sandboxing | Lua runtime (no FS/net access by default) |

## Planned Security Enhancements

| Feature | Priority |
|---|---|
| Plugin permission manifest (scope FS/net/exec) | High |
| Agent action approval gates (destructive ops) | High |
| Encrypted session export | Medium |
| 2FA for remote control webapp PIN | Medium |
| Audit log of all agent actions | Medium |
| Memory encryption at rest | Low |
| Biometric unlock (Windows Hello / fingerprint) | Low |

---

# 19. PERMISSIONS & SAFETY LAYER

## Current Gates

- Remote control requires PIN authentication
- Browser restricted to http/https URLs only
- Agent loop capped at 5 steps (configurable)
- Lua plugins cannot access FS/net by default

## Planned Approval System

```
Approval Gate — required for:
├── File deletion (agent-triggered)
├── Shell command with sudo/admin
├── External API calls with user credentials
├── Deployment or git push actions
└── Purchases or payment API calls

Rollback System:
├── Session snapshots before agent runs
├── File operation undo (trash before delete)
└── Config rollback (previous llm-term.toml)
```

---

# 20. WORKFLOW ENGINE

## Planned Workflow System

```yaml
# Example workflow definition
name: "Nightly Code Review"
trigger: cron("0 2 * * *")
steps:
  - agent: development
    action: git_diff_summary
    output: diff_text
  - agent: research
    action: llm_review
    input: diff_text
    output: review_md
  - action: save_artifact
    input: review_md
    path: "reviews/{{date}}.md"
  - action: notify
    message: "Nightly review complete"
```

## Workflow Builder UI

- Visual node editor (drag-and-drop)
- Trigger: manual, cron, file watcher, webhook
- Nodes: LLM call, shell, file op, HTTP, condition, loop
- Live execution trace with step highlighting
- Save/load workflow YAML

---

# 21. MULTI-MODEL ORCHESTRATION

## Current State

```
AgentConfig {
    id, name, provider ("gemini"|"ollama"), model, base_url
}

Active agent stored in AppState.provider (Arc<dyn LlmProvider>)
Live swap via switch_agent command + agent_changed event
6 default agents seeded at first run
```

## Recommended Models (Curated)

### Cloud (Gemini)
| Model | Use Case | Deck OK |
|---|---|---|
| gemini-2.0-flash | Speed + reasoning | ✅ (cloud) |
| gemini-2.5-pro | Complex tasks | ✅ (cloud) |
| gemini-1.5-flash-8b | Ultra-fast | ✅ (cloud) |

### Local (Ollama — Steam Deck VRAM tiers)
| Model | VRAM | Tier | tok/s |
|---|---|---|---|
| qwen2.5-coder:0.5b | 600MB | Nano | 35 |
| llama3.2:1b | 800MB | Micro | 28 |
| phi4-mini:3.8b | 2500MB | Standard | 12 |
| deepseek-coder:6.7b | 4000MB | Heavy | 8 |

## Planned Router

```
Task → Model Router
├── Code generation → deepseek-coder / gemini-2.5-pro
├── Quick answers → llama3.2:1b / gemini-2.0-flash-8b
├── Long context → gemini-1.5-pro
├── Private/offline → Ollama model
└── Cost-sensitive → gemini-1.5-flash-8b
```

---

# 22. PLUGIN & EXTENSION SYSTEM

## Current Lua Plugin API

```lua
-- Register a slash command
registerCommand("/mycommand", function(args)
    return "response text"
end)

-- Register an event hook
registerHook("onMessage", function(msg)
    if msg:find("keyword") then
        execute("notify-send 'Keyword detected'")
    end
end)

-- Switch active persona
setPersona("Developer")

-- Execute shell command
local output = execute("ls -la")
```

## Planned Plugin Manifest Format

```toml
[plugin]
name = "my_plugin"
version = "1.0.0"
author = "developer"
description = "Does something useful"

[permissions]
filesystem = ["read:~/Documents", "write:/tmp"]
network = ["api.example.com"]
shell = false
system = false

[commands]
"/myplugin" = "main.lua:onCommand"

[hooks]
"onMessage" = "main.lua:onMessage"
"onAIResponse" = "main.lua:onResponse"
```

## Plugin Marketplace Plan

- GitHub-hosted registry (JSON index)
- Install from URL in Settings modal (already partially wired)
- Sandbox permission review before install
- Version pinning and update checks

---

# 23. PERFORMANCE REQUIREMENTS

| Metric | Target | Current |
|---|---|---|
| App startup (cold) | < 2s | ~1.5s ✅ |
| Boot sequence complete | < 3s | ~2s ✅ |
| First LLM token (Gemini) | < 1s | ~0.8s ✅ |
| First LLM token (Ollama) | < 2s | ~1.5s ✅ |
| PTY spawn | < 100ms | ~50ms ✅ |
| Tab switch | < 50ms | ~30ms ✅ |
| Memory search (top-3) | < 100ms | ~20ms ✅ |
| Agent step cycle | < 5s | ~3s ✅ |
| Remote control latency | < 200ms | ~100ms ✅ |
| Canvas collaboration sync | < 100ms | ~80ms ✅ |

---

# 24. TECH STACK (LOCKED)

## Core Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop runtime | Tauri v2 | 2.x |
| Backend language | Rust | 1.85.0 (pinned) |
| Frontend | Vite + Vanilla JS | Vite 8.x |
| Scripting | Lua 5.4 via mlua | vendored |
| Terminal | portable-pty + xterm.js | latest |
| LLM (cloud) | Google Gemini | gemini-2.0-flash default |
| LLM (local) | Ollama HTTP API | 0.x |
| Memory | Custom cosine-similarity vector DB | custom |
| FTP | suppaftp 6.x | 6.x |
| gRPC | tonic 0.11 | 0.11 |
| DNS | mdns-sd 0.11 | 0.11 |
| OAuth | Custom Device Flow | — |
| Keychain | keyring 2.3 | 2.3 |
| Build | npm workspaces | — |

## No-Go List

- No React/Vue/Svelte (frontend is intentionally zero-framework)
- No npm packages added to frontend bundle (CDN or vendored only)
- No `unwrap()` in Tauri command handlers
- No `display: flex` on `#view-*` ID selectors
- No `pty_spawn` without preceding `pty_kill` for same ID
- No hardcoded config paths

---

# 25. DATABASE ARCHITECTURE

## Current

```
data/memory/chat_history.json  → vector records (text + embedding float array)
data/personas.json             → custom persona definitions
sessions/*.json                → serialized chat session state
src-tauri/llm-term.toml       → runtime config
~/.config/neurodeck/env        → API key env file (Gemini key)
OS keychain                    → Gemini API key (secure)
localStorage                   → theme, onboarding state, FTP profiles
```

## Target Data Architecture

```
SQLite (structured, local)
├── sessions           (id, title, created, messages JSONB)
├── agent_runs         (id, goal, steps JSONB, result, timestamp)
├── workflows          (id, name, yaml, last_run, status)
├── artifacts          (id, type, content, metadata, session_id)
└── plugin_registry    (name, version, enabled, manifest JSONB)

Qdrant (vector store — upgrade from custom)
├── Collection: chat_memory     (768d embeddings)
├── Collection: code_snippets   (semantic code search)
└── Collection: document_store  (uploaded docs)

Neo4j / SQLite FTS5 (graph / knowledge)
├── concept nodes
├── session nodes
├── file nodes
└── relationship edges (related_to, derived_from, references)

PostgreSQL (cloud sync — future)
├── Mirrors SQLite schema
├── Encrypted sync delta
└── Team collaboration layer
```

---

# 26. LOCAL-FIRST ARCHITECTURE

NEURODECK is fundamentally local-first:

- **Inference**: Ollama runs entirely on-device
- **Memory**: vector DB is a local JSON file (upgrade to local Qdrant)
- **Sessions**: persisted to local filesystem
- **Config**: local TOML + OS keychain
- **Plugins**: local Lua files

**Sync is additive, never required.**

Cloud features enhance but never gate core functionality.

---

# 27. CLOUD SYNCHRONIZATION (PLANNED)

```
Sync Architecture:
├── Delta sync (only changed records)
├── End-to-end encryption (user key)
├── Conflict resolution (last-write-wins + manual merge UI)
└── Sync targets:
    ├── Memory records (cross-device RAG)
    ├── Sessions (resume on another machine)
    ├── Workflows (shared automation)
    └── Artifacts (generated outputs)
```

---

# 28. OFFLINE SUPPORT

## Currently Offline-Capable

- ✅ Ollama local inference (no network)
- ✅ PTY shell (no network)
- ✅ Canvas code execution (no network)
- ✅ Vector memory (local JSON)
- ✅ All UI/navigation
- ✅ Plugin system
- ✅ SSH (network, but LAN-capable)
- ✅ LAN P2P transfer (LAN only)

## Gemini Dependency (Network Required)

- Gemini API calls (streaming chat)
- Gemini embedding generation (RAG)
- OAuth flow

Workaround: Switch to Ollama agent profile for full offline mode.

---

# 29. TELEMETRY & OBSERVABILITY

## Current Observability

- Boot sequence shows real system stats (plugin count, persona count, LLM status)
- Context drawer (📊) shows live: provider, model, RAM, memory count, session
- Agent log shows per-step tool calls and results
- Diagnostic check in onboarding wizard (6 system checks)

## Planned Telemetry

| Signal | Source | Destination |
|---|---|---|
| Agent step timing | lib.rs emit | frontend timeline |
| Token usage | LLM provider headers | context drawer |
| Memory hit rate | memory.rs | stats panel |
| PTY session lifetime | pty_manager.rs | sessions view |
| Plugin execution errors | lua.rs | notification center |
| Workflow run history | workflow engine | workflow view |

---

# 30. DEPLOYMENT TARGETS

## Current

| Platform | Build | Status |
|---|---|---|
| Steam Deck (SteamOS) | AppImage / install.sh | ✅ |
| Windows | MSI via package_release.ps1 | ✅ |
| Linux (generic) | AppImage | ✅ |
| macOS | ⚠️ Not tested | — |

## Planned

| Platform | Target Version |
|---|---|
| macOS (Apple Silicon) | v2.0 |
| Android (companion) | v3.0 |
| iOS (companion) | v3.0 |
| Web dashboard | v2.5 |
| Raspberry Pi | v2.0 |

---

# 31. MONETIZATION STRATEGY

## Free Tier

- Full local-only experience (Ollama inference)
- All 11 views
- All gamepad features
- Plugin system (community plugins)
- Remote control

## Pro Tier (NEURODECK Pro)

- Cloud memory sync
- Cross-device session resume
- Priority Gemini API integration
- Team collaboration workspaces
- Premium plugin marketplace access
- Cloud-hosted agent compute

## Marketplace

- Lua plugin packs (community + verified)
- Custom persona packs
- Workflow automation templates
- Steam Deck hardware profiles

---

# 32. FUTURE EXPANSION

## v3.0 — Full AI OS

- Multi-user collaborative workspaces (real-time, Figma-style)
- Autonomous business process agents (finance, marketing, ops)
- AI-generated operating environments (dynamic UIs per task)
- Spatial computing (AR overlay on Steam Deck + external display)

## v4.0 — Distributed

- Agent mesh (multiple NEURODECK instances collaborate)
- Federated memory (shared knowledge with privacy controls)
- Robotic process automation bridges
- XR/VR spatial workspace

---

# 33. MVP STATUS

## Phase 1 (SHIPPED ✅)

- AI chat with streaming + RAG
- PTY terminal (multi-session)
- SSH client
- Code canvas (HTML/Python/Bash)
- Vector memory system
- Gamepad navigation
- Lua plugin system
- Onboarding wizard
- Boot sequence

## Phase 2 (SHIPPED ✅)

- Multi-agent profiles + live switching
- Remote control webapp
- LAN P2P file transfer (Warpinator)
- FTP/SFTP client
- Canvas collaboration
- Prompt Lab
- Controller prompt picker
- XSS hardening + security audit
- SteamOS tunnel

## Phase 3 (IN PROGRESS 🔧)

- Monaco Editor integration
- Knowledge graph visualization
- Workflow visual builder
- Task scheduler
- Whisper STT upgrade

## Phase 4 (PLANNED 📋)

- Multi-agent orchestration (parallel agents)
- Browser automation
- Desktop computer use layer
- Plugin marketplace
- Cloud sync

---

# 34. LONG-TERM ROADMAP

| Version | Codename | Theme |
|---|---|---|
| v1.1.x | Thoth | Foundation — all core features shipped |
| v1.2.x | Ra | Agent intelligence — multi-agent, hardening |
| v1.3.x | Anubis | IDE layer — Monaco, git, diff, LSP |
| v2.0.x | Osiris | Orchestration — workflow engine, parallel agents |
| v2.5.x | Horus | Cloud — sync, collaboration, marketplace |
| v3.0.x | Amun | Full OS — computer use, spatial, XR |
| v4.0.x | Ptah | Distributed — agent mesh, federated memory |

---

# 35. COMPETITIVE ADVANTAGES

| Differentiator | Why It Matters |
|---|---|
| **Steam Deck Native** | Only AI OS designed for the most powerful portable computer |
| **Gamepad-First UX** | Full functionality without keyboard — unique in the market |
| **Local-First AI** | Ollama on-device — privacy, offline, no API costs |
| **Persistent Intelligence** | Memory survives sessions — the system learns your workflow |
| **Unified Environment** | Chat + terminal + canvas + SSH + memory + agent in one window |
| **Hackable** | Lua plugins, custom personas, custom themes — power user native |
| **Remote Control** | Control your Deck from phone — unique productivity pattern |
| **Zero Framework** | Vanilla JS frontend — fast, small, no dependency hell |
| **Rust Backend** | Memory safety, concurrency, performance on constrained hardware |

---

# 36. CLOSING VISION

The Steam Deck already changed portable gaming.
NEURODECK makes it change portable computing.

When a developer boards a plane, they don't open a laptop.
They take out their Deck, launch NEURODECK, and:

- Chat with an AI that remembers their entire codebase
- Run a terminal with real bash sessions
- SSH into their production server
- Let an autonomous agent refactor a module while they sleep
- Control everything from the controller, no keyboard required

This is not a feature add-on to an existing OS.
This is a new computing paradigm built around intelligence, persistence, and portability.

The model becomes infrastructure.
The controller becomes the cursor.
The Deck becomes the workstation.

**NEURODECK is the operating system that AI was always supposed to run on.**
