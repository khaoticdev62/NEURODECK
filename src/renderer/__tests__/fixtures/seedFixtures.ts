/**
 * Test-only fixture data that used to live in `types/seed.ts`.
 * These samples are for unit tests and Storybook-style previews only;
 * they must NOT be shipped as production runtime state.
 */

import type {
  Agent,
  AIMessage,
  CacheEntry,
  MemoryItem,
  PluginCard,
  PromptTemplate,
  SessionNode,
} from "../../types/neurodeck";

export const personas = [
  "Developer",
  "Architect",
  "Security Analyst",
  "Researcher",
  "Writer",
  "Educator",
];

export const agents: Agent[] = [
  {
    id: "architect",
    name: "Architect",
    role: "System design and PRD alignment",
    status: "idle",
    model: "Llama 3.1 8B",
    memoryAccess: "project",
    lastAction: "Reviewed workspace layout",
    task: "Waiting for project scope",
  },
  {
    id: "coder",
    name: "Coder",
    role: "Implementation and refactor pass",
    status: "thinking",
    model: "Qwen Coder 7B",
    memoryAccess: "session",
    lastAction: "Prepared component split",
    task: "Map UI modules to IPC-safe state",
  },
  {
    id: "security",
    name: "Security",
    role: "Electron hardening and OWASP checks",
    status: "idle",
    model: "Llama 3.1 8B",
    memoryAccess: "project",
    lastAction: "Verified preload-only bridge",
    task: "Awaiting audit target",
  },
  {
    id: "docs",
    name: "Docs",
    role: "Markdown, specs, and release notes",
    status: "complete",
    model: "Phi 3.5 Mini",
    memoryAccess: "global",
    lastAction: "Updated implementation notes",
    task: "Ready",
  },
];

export const models = [
  {
    id: "neurodraft-local",
    name: "NeuroDraft Offline Engine",
    provider: "Local Built-in",
    backendProvider: "offline-draft" as const,
    backendModel: "NeuroDraft",
    size: "embedded",
    quantization: "N/A",
    context: 4096,
    bestFor: ["planning fallback", "offline guidance"],
    status: "ready" as const,
    ramEstimate: "<1 GB",
  },
  {
    id: "llama31",
    name: "Llama 3.1 8B Instruct",
    provider: "Local",
    backendProvider: "ollama" as const,
    backendModel: "llama3.1:8b",
    size: "4.7 GB",
    quantization: "Q4_K_M",
    context: 8192,
    bestFor: ["planning", "chat", "docs"],
    status: "ready" as const,
    ramEstimate: "6-8 GB",
  },
  {
    id: "qwen-coder",
    name: "Qwen2.5 Coder 7B",
    provider: "Local",
    backendProvider: "ollama" as const,
    backendModel: "qwen2.5-coder:7b",
    size: "4.4 GB",
    quantization: "Q4_K_M",
    context: 32768,
    bestFor: ["code", "refactor", "tests"],
    status: "indexed" as const,
    ramEstimate: "7-9 GB",
  },
  {
    id: "phi-mini",
    name: "Phi 3.5 Mini",
    provider: "Local",
    backendProvider: "ollama" as const,
    backendModel: "phi3.5:mini",
    size: "2.2 GB",
    quantization: "Q4_K_M",
    context: 4096,
    bestFor: ["fast replies", "summaries"],
    status: "ready" as const,
    ramEstimate: "4-5 GB",
  },
  {
    id: "deepseek-lite",
    name: "DeepSeek Coder Lite",
    provider: "External",
    backendProvider: "ollama" as const,
    backendModel: "deepseek-coder-lite",
    size: "missing",
    quantization: "N/A",
    context: 16384,
    bestFor: ["code reasoning"],
    status: "missing" as const,
    ramEstimate: "N/A",
  },
];

export const memories: MemoryItem[] = [
  {
    id: "project-vision",
    title: "Project Vision",
    body: "NEURODECK should feel like a premium AI workstation OS, not a browser wrapper or generic chatbot.",
    scope: "Project",
    pinned: true,
    updatedAt: "local cache",
  },
  {
    id: "design-language",
    title: "Tactical Glass",
    body: "Use thin borders, glass panels, restrained glow, and fast motion. Avoid particle soup.",
    scope: "Project",
    pinned: true,
    updatedAt: "local cache",
  },
  {
    id: "workflow",
    title: "Solo Dev Workflow",
    body: "Prefer production-ready docs, implementation plans, and code that can run without Docker or WSL.",
    scope: "Global",
    pinned: false,
    updatedAt: "local cache",
  },
];

export const sessions: SessionNode[] = [
  {
    id: "s1",
    created_at: new Date().toISOString(),
    message_count: 5,
    preview: "test",
    name: "NEURODECK Workspace",
  },
  {
    id: "s2",
    created_at: new Date().toISOString(),
    message_count: 10,
    preview: "planning",
    name: "PRD / SDS Buildout",
  },
];

export const cacheEntries: CacheEntry[] = [
  {
    id: "sessions",
    label: "Session cache",
    status: "ready",
    size: "18.4 MB",
    updatedAt: "2 min ago",
  },
  {
    id: "memory",
    label: "Memory vault index",
    status: "ready",
    size: "4.2 MB",
    updatedAt: "local",
  },
  {
    id: "models",
    label: "Model manifest",
    status: "stale",
    size: "312 KB",
    updatedAt: "yesterday",
  },
  {
    id: "plugins",
    label: "Plugin registry",
    status: "queued",
    size: "pending",
    updatedAt: "offline queue",
  },
];

export const plugins: PluginCard[] = [
  {
    id: "promptgen",
    name: "PromptGen",
    description: "Reusable AI prompt packs and command palette actions.",
    status: "enabled",
    permissions: ["local-files:read", "clipboard:write"],
  },
  {
    id: "github-helper",
    name: "GitHub Helper",
    description: "Repo summaries, issue drafts, and PR checklist generation.",
    status: "disabled",
    permissions: ["network:optional", "local-files:read"],
  },
  {
    id: "security-scan",
    name: "Security Scan",
    description: "Static guardrail checks for secrets, frontend leaks, and IPC risk.",
    status: "needs review",
    permissions: ["local-files:read", "shell:blocked"],
  },
];

export const initialMessages: AIMessage[] = [
  {
    id: "system-welcome",
    role: "assistant",
    content:
      "NEURODECK v6 execution layer is armed. Pick a local runtime, attach project context, then run a prompt or agent task. Local-first, no browser wrapper energy.",
    createdAt: "local cache",
    provider: "offline-draft",
    model: "NeuroDraft",
  },
];

export const promptTemplates: PromptTemplate[] = [
  {
    id: "repo-audit",
    title: "Repo Audit",
    category: "Audit",
    agentId: "architect",
    prompt:
      "Audit the attached project context for architecture, missing docs, build risks, and production readiness. Return prioritized fixes with file-level recommendations.",
  },
  {
    id: "electron-security",
    title: "Electron Security Review",
    category: "Security",
    agentId: "security",
    prompt:
      "Review the Electron app for contextIsolation, preload API design, IPC allowlists, filesystem boundaries, secret exposure, and renderer privilege risks.",
  },
  {
    id: "qa-gate",
    title: "QA Gate",
    category: "QA",
    agentId: "docs",
    prompt:
      "Create a complete QA gate for Windows, Linux, Steam Deck 1280x800, keyboard navigation, controller navigation, persistence, packaging, and offline behavior.",
  },
  {
    id: "implementation-plan",
    title: "Implementation Plan",
    category: "Build",
    agentId: "coder",
    prompt:
      "Turn the current context into an implementation plan with epics, tasks, acceptance criteria, tests, and release gates. No placeholders.",
  },
];
