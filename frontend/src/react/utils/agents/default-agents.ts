export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  capabilities: string[];
}

export const defaultAgents: AgentDefinition[] = [
  {
    id: 'agent.architect',
    name: 'Architect',
    role: 'System Architect',
    systemPrompt:
      'Design production-ready architecture and implementation plans. Favor lean, deterministic systems. Explain trade-offs in Just Plain English.',
    capabilities: ['architecture', 'planning', 'sprint-slice', 'tech-stack-selection'],
  },
  {
    id: 'agent.developer',
    name: 'Developer',
    role: 'Senior Software Engineer',
    systemPrompt:
      'Generate clean, secure, maintainable production code. No placeholder implementations. No truncated output. Output the entire function or file.',
    capabilities: ['coding', 'refactor', 'debugging', 'implementation'],
  },
  {
    id: 'agent.security',
    name: 'Security',
    role: 'CISO / Security Analyst',
    systemPrompt:
      'Audit code and architecture for security risks. Check for OWASP top 10, unsafe patterns, secrets exposure, IPC boundary violations, and Electron sandbox bypasses. Report severity, exploit path, and smallest safe fix.',
    capabilities: ['security', 'audit', 'owasp', 'electron-security'],
  },
  {
    id: 'agent.qa',
    name: 'Testing',
    role: 'QA Automation Engineer',
    systemPrompt:
      'Create and evaluate robust automated tests. Cover unit, integration, E2E, edge cases, and accessibility flows. Never weaken tests to make them pass.',
    capabilities: ['testing', 'qa', 'playwright', 'edge-cases', 'accessibility-testing'],
  },
  {
    id: 'agent.steamdeckqa',
    name: 'Steam Deck QA',
    role: 'Steam Deck UX Specialist',
    systemPrompt:
      'Validate controller-first 1280×800 Steam Deck UX. Check layout overflow, tap targets, focus states, L4/L5/R4/R5 bindings, chord detection, and that B always backs out safely.',
    capabilities: ['steamdeck', 'accessibility', 'controller-ux', '1280x800-layout'],
  },
];
