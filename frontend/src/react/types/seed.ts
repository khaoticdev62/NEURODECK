import { Activity, Bot, BrainCircuit, Command, Database, FileText, FolderOpen, Gauge, HardDrive, History, LayoutDashboard, Plug, Settings, ShieldCheck, Sparkles, TerminalSquare, Workflow, Wrench } from 'lucide-react';
import type { Agent, AIMessage, CacheEntry, LocalModel, MemoryItem, NavItem, PluginCard, PromptTemplate, SessionNode, ThemeTokenSet } from '../types/neurodeck';

export const STORE_KEY = 'neurodeck:v5:state';

export const navItems: NavItem[] = [
  { id: 'workspace', label: 'Workspace', description: 'AI console and mission control', icon: LayoutDashboard, shortcut: '1' },
  { id: 'execution', label: 'Execution', description: 'AI runs and tool audit trail', icon: Workflow, shortcut: '2' },
  { id: 'project', label: 'Project', description: 'Folder scan and repo signals', icon: FolderOpen, shortcut: '3' },
  { id: 'models', label: 'Models', description: 'Local model inventory', icon: BrainCircuit, shortcut: '4' },
  { id: 'agents', label: 'Agents', description: 'Specialized task operators', icon: Bot, shortcut: '5' },
  { id: 'memory', label: 'Memory', description: 'Local-first knowledge vault', icon: Database, shortcut: '6' },
  { id: 'sessions', label: 'Sessions', description: 'Conversation graph and exports', icon: History, shortcut: '7' },
  { id: 'cache', label: 'Offline', description: 'Cache and sync health', icon: HardDrive, shortcut: '8' },
  { id: 'plugins', label: 'Plugins', description: 'Tools and extensions', icon: Plug, shortcut: '9' },
  { id: 'diagnostics', label: 'Diagnostics', description: 'IPC logs and runtime health', icon: Activity, shortcut: 'D' },
  { id: 'settings', label: 'Settings', description: 'Theme, Deck mode, privacy', icon: Settings, shortcut: '0' }
];

export const themes: ThemeTokenSet[] = [
  { name: 'Blacksite', background: '#0A0D10', surface: '#11161C', surfaceRaised: '#161D25', accent: '#5EEBFF', success: '#7CFFB2', warning: '#FFC857', danger: '#FF5A6A', text: '#E8F4FF', muted: '#8DA1B3', glow: 'rgba(94,235,255,0.18)' },
  { name: 'Tactical Glass', background: '#091015', surface: '#101923', surfaceRaised: '#182430', accent: '#6AF0D5', success: '#8CFFB8', warning: '#FFD166', danger: '#FF6B7A', text: '#ECFBFF', muted: '#9BB5C8', glow: 'rgba(106,240,213,0.16)' },
  { name: 'Ghost Terminal', background: '#080A0B', surface: '#101314', surfaceRaised: '#171B1D', accent: '#B8F7FF', success: '#A5FFCE', warning: '#FFE08A', danger: '#FF7A8A', text: '#F0FCFF', muted: '#A0ADB5', glow: 'rgba(184,247,255,0.12)' },
  { name: 'Hologrid', background: '#070B14', surface: '#0E1628', surfaceRaised: '#16213A', accent: '#7AA7FF', success: '#8EFFC1', warning: '#FFD36A', danger: '#FF647D', text: '#EEF5FF', muted: '#93A6C2', glow: 'rgba(122,167,255,0.18)' },
  { name: 'Minimal Ops', background: '#0D0F12', surface: '#15181D', surfaceRaised: '#1C2027', accent: '#D8DEE9', success: '#A3BE8C', warning: '#EBCB8B', danger: '#BF616A', text: '#ECEFF4', muted: '#9CA3AF', glow: 'rgba(216,222,233,0.09)' },
  { name: 'Night Watch', background: '#070B10', surface: '#101722', surfaceRaised: '#182234', accent: '#A78BFA', success: '#7CFFB2', warning: '#FACC15', danger: '#FB7185', text: '#F5F3FF', muted: '#A7A0C4', glow: 'rgba(167,139,250,0.18)' },
  { name: 'Broadcast', background: '#0C0A12', surface: '#171321', surfaceRaised: '#221A31', accent: '#FF4FD8', success: '#65F4A3', warning: '#FFD166', danger: '#FF5A6A', text: '#FFF3FC', muted: '#BDAFC2', glow: 'rgba(255,79,216,0.16)' }
];

export const personas = ['Developer', 'Architect', 'Security Analyst', 'Researcher', 'Writer', 'Educator'];

export const starterPrompts = [
  'Audit this Electron app for security, IPC boundaries, and renderer risk.',
  'Create a production PRD and SDS for my current app feature.',
  'Scan my repo structure and recommend a cleaner architecture.',
  'Generate a QA checklist for desktop, Steam Deck, keyboard, and controller navigation.'
];

export const agents: Agent[] = [
  { id: 'architect', name: 'Architect', role: 'System design and PRD alignment', status: 'idle', model: 'Llama 3.1 8B', memoryAccess: 'project', lastAction: 'Reviewed workspace layout', task: 'Waiting for project scope' },
  { id: 'coder', name: 'Coder', role: 'Implementation and refactor pass', status: 'thinking', model: 'Qwen Coder 7B', memoryAccess: 'session', lastAction: 'Prepared component split', task: 'Map UI modules to IPC-safe state' },
  { id: 'security', name: 'Security', role: 'Electron hardening and OWASP checks', status: 'idle', model: 'Llama 3.1 8B', memoryAccess: 'project', lastAction: 'Verified preload-only bridge', task: 'Awaiting audit target' },
  { id: 'docs', name: 'Docs', role: 'Markdown, specs, and release notes', status: 'complete', model: 'Phi 3.5 Mini', memoryAccess: 'global', lastAction: 'Updated implementation notes', task: 'Ready' }
];

export const models: LocalModel[] = [
  { id: 'neurodraft-local', name: 'NeuroDraft Offline Engine', provider: 'Local Built-in', size: 'embedded', quantization: 'N/A', context: 4096, bestFor: ['planning fallback', 'offline guidance'], status: 'ready', ramEstimate: '<1 GB' },
  { id: 'llama31', name: 'Llama 3.1 8B Instruct', provider: 'Local', size: '4.7 GB', quantization: 'Q4_K_M', context: 8192, bestFor: ['planning', 'chat', 'docs'], status: 'ready', ramEstimate: '6-8 GB' },
  { id: 'qwen-coder', name: 'Qwen2.5 Coder 7B', provider: 'Local', size: '4.4 GB', quantization: 'Q4_K_M', context: 32768, bestFor: ['code', 'refactor', 'tests'], status: 'indexed', ramEstimate: '7-9 GB' },
  { id: 'phi-mini', name: 'Phi 3.5 Mini', provider: 'Local', size: '2.2 GB', quantization: 'Q4_K_M', context: 4096, bestFor: ['fast replies', 'summaries'], status: 'ready', ramEstimate: '4-5 GB' },
  { id: 'deepseek-lite', name: 'DeepSeek Coder Lite', provider: 'External', size: 'missing', quantization: 'N/A', context: 16384, bestFor: ['code reasoning'], status: 'missing', ramEstimate: 'N/A' }
];

export const memories: MemoryItem[] = [
  { id: 'project-vision', title: 'Project Vision', body: 'NEURODECK should feel like a premium AI workstation OS, not a browser wrapper or generic chatbot.', scope: 'Project', pinned: true, updatedAt: 'local cache' },
  { id: 'design-language', title: 'Tactical Glass', body: 'Use thin borders, glass panels, restrained glow, and fast motion. Avoid particle soup.', scope: 'Project', pinned: true, updatedAt: 'local cache' },
  { id: 'workflow', title: 'Solo Dev Workflow', body: 'Prefer production-ready docs, implementation plans, and code that can run without Docker or WSL.', scope: 'Global', pinned: false, updatedAt: 'local cache' }
];

export const sessions: SessionNode[] = [
  { id: 'root', title: 'NEURODECK Workspace', type: 'root', status: 'active', children: ['prd', 'ui-audit', 'security'] },
  { id: 'prd', title: 'PRD / SDS Buildout', type: 'planning', status: 'complete', children: ['export'] },
  { id: 'ui-audit', title: 'Electron UI Upgrade', type: 'build', status: 'active', children: [] },
  { id: 'security', title: 'Secure IPC Boundary', type: 'audit', status: 'draft', children: [] },
  { id: 'export', title: 'Markdown Package', type: 'export', status: 'complete', children: [] }
];

export const cacheEntries: CacheEntry[] = [
  { id: 'sessions', label: 'Session cache', status: 'ready', size: '18.4 MB', updatedAt: '2 min ago' },
  { id: 'memory', label: 'Memory vault index', status: 'ready', size: '4.2 MB', updatedAt: 'local' },
  { id: 'models', label: 'Model manifest', status: 'stale', size: '312 KB', updatedAt: 'yesterday' },
  { id: 'plugins', label: 'Plugin registry', status: 'queued', size: 'pending', updatedAt: 'offline queue' }
];

export const plugins: PluginCard[] = [
  { id: 'promptgen', name: 'PromptGen', description: 'Reusable AI prompt packs and command palette actions.', status: 'enabled', permissions: ['local-files:read', 'clipboard:write'] },
  { id: 'github-helper', name: 'GitHub Helper', description: 'Repo summaries, issue drafts, and PR checklist generation.', status: 'disabled', permissions: ['network:optional', 'local-files:read'] },
  { id: 'security-scan', name: 'Security Scan', description: 'Static guardrail checks for secrets, frontend leaks, and IPC risk.', status: 'needs review', permissions: ['local-files:read', 'shell:blocked'] }
];

export const commandGroups = [
  { label: 'Navigation', icon: TerminalSquare },
  { label: 'Agents', icon: Sparkles },
  { label: 'Security', icon: ShieldCheck },
  { label: 'Maintenance', icon: Wrench },
  { label: 'System', icon: Activity },
  { label: 'Inventory', icon: Command },
  { label: 'Exports', icon: FileText },
  { label: 'Diagnostics', icon: Gauge }
];


export const initialMessages: AIMessage[] = [
  {
    id: 'system-welcome',
    role: 'assistant',
    content: 'NEURODECK v5 execution layer is armed. Pick a local runtime, attach project context, then run a prompt or agent task. Local-first, no browser wrapper energy.',
    createdAt: 'local cache',
    provider: 'offline-draft',
    model: 'NeuroDraft'
  }
];

export const promptTemplates: PromptTemplate[] = [
  {
    id: 'repo-audit',
    title: 'Repo Audit',
    category: 'Audit',
    agentId: 'architect',
    prompt: 'Audit the attached project context for architecture, missing docs, build risks, and production readiness. Return prioritized fixes with file-level recommendations.'
  },
  {
    id: 'electron-security',
    title: 'Electron Security Review',
    category: 'Security',
    agentId: 'security',
    prompt: 'Review the Electron app for contextIsolation, preload API design, IPC allowlists, filesystem boundaries, secret exposure, and renderer privilege risks.'
  },
  {
    id: 'qa-gate',
    title: 'QA Gate',
    category: 'QA',
    agentId: 'docs',
    prompt: 'Create a complete QA gate for Windows, Linux, Steam Deck 1280x800, keyboard navigation, controller navigation, persistence, packaging, and offline behavior.'
  },
  {
    id: 'implementation-plan',
    title: 'Implementation Plan',
    category: 'Build',
    agentId: 'coder',
    prompt: 'Turn the current context into an implementation plan with epics, tasks, acceptance criteria, tests, and release gates. No placeholders.'
  }
];
