import {
  Activity, ArrowLeftRight, BookOpen, Bot, BrainCircuit, CalendarClock,
  Code, Database, Download, FlaskConical,
  FolderOpen, GitBranch, Globe, GraduationCap, HardDrive, History, Layers,
  LayoutDashboard, Lock, Magnet, Network, Paintbrush, Palette,
  Plug, Radio, RotateCcw, Settings, Share2, ShieldCheck,
  Terminal, TerminalSquare, Type, Webhook, Wrench, Workflow
} from 'lucide-react';
import type { FontOption, NavItem, ThemeTokenSet } from '../types/neurodeck';

export const STORE_KEY = 'neurodeck:v6:state';

export const navItems: NavItem[] = [
  // ── Mission Control ──
  { id: 'chat', label: 'Chat', description: 'AI console and chat', icon: LayoutDashboard, shortcut: '1', section: 'Mission Control' },
  { id: 'execution', label: 'Execution', description: 'AI runs and audit trail', icon: Workflow, shortcut: '2', section: 'Mission Control' },
  { id: 'agent', label: 'Agent', description: 'Specialized task operator', icon: Bot, shortcut: '3', section: 'Mission Control' },
  { id: 'memory', label: 'Memory', description: 'Local-first knowledge vault', icon: Database, shortcut: '4', section: 'Mission Control' },

  // ── Dev Tools ──
  { id: 'canvas', label: 'Canvas', description: 'Live code editor and preview', icon: Paintbrush, shortcut: '', section: 'Dev Tools' },
  { id: 'terminal', label: 'Terminal', description: 'PTY shell sessions', icon: Terminal, shortcut: '', section: 'Dev Tools' },
  { id: 'ssh', label: 'SSH', description: 'Secure shell connections', icon: Lock, shortcut: '', section: 'Dev Tools' },
  { id: 'ide', label: 'IDE', description: 'Integrated code workspace', icon: Code, shortcut: '', section: 'Dev Tools' },
  { id: 'git', label: 'Git', description: 'Repository and branch management', icon: GitBranch, shortcut: '', section: 'Dev Tools' },
  { id: 'api-lab', label: 'API Lab', description: 'HTTP request builder and tester', icon: Webhook, shortcut: '', section: 'Dev Tools' },
  { id: 'cli-maker', label: 'CLI Maker', description: 'Custom command builder', icon: TerminalSquare, shortcut: '', section: 'Dev Tools' },

  // ── Network ──
  { id: 'browser', label: 'Browser', description: 'Embedded web browser', icon: Globe, shortcut: '', section: 'Network' },
  { id: 'tunnel', label: 'Tunnel', description: 'SteamOS Game/Desktop bridge', icon: ArrowLeftRight, shortcut: '', section: 'Network' },
  { id: 'share', label: 'Share', description: 'LAN, SFTP, FTP transfers', icon: Share2, shortcut: '', section: 'Network' },
  { id: 'torrent', label: 'Torrent', description: 'BitTorrent downloads', icon: Magnet, shortcut: '', section: 'Network' },
  { id: 'remote', label: 'Remote', description: 'Mobile remote control server', icon: Radio, shortcut: '', section: 'Network' },

  // ── Knowledge ──
  { id: 'project', label: 'Project', description: 'Folder scan and repo signals', icon: FolderOpen, shortcut: '5', section: 'Knowledge' },
  { id: 'docs', label: 'Docs', description: 'Knowledge base and indexed docs', icon: BookOpen, shortcut: '', section: 'Knowledge' },
  { id: 'prompt-lab', label: 'Prompt Lab', description: 'Prompt engineering formulas', icon: FlaskConical, shortcut: '', section: 'Knowledge' },
  { id: 'academy', label: 'Academy', description: 'SOC training, labs, and portfolio', icon: GraduationCap, shortcut: '', section: 'Knowledge' },
  { id: 'graph', label: 'Graph', description: 'Relationship visualizations', icon: Network, shortcut: '', section: 'Knowledge' },
  { id: 'sessions', label: 'Sessions', description: 'Conversation graph and exports', icon: History, shortcut: '', section: 'Knowledge' },

  // ── Automation ──
  { id: 'scheduler', label: 'Scheduler', description: 'Task scheduling and cron', icon: CalendarClock, shortcut: '', section: 'Automation' },
  { id: 'orchestrator', label: 'Orchestrator', description: 'Workflow automation builder', icon: Layers, shortcut: '', section: 'Automation' },

  // ── System ──
  { id: 'models', label: 'Models', description: 'Local model inventory', icon: BrainCircuit, shortcut: '6', section: 'System' },
  { id: 'cache', label: 'Offline', description: 'Cache and sync health', icon: HardDrive, shortcut: '7', section: 'System' },
  { id: 'plugins', label: 'Plugins', description: 'Tools and extensions', icon: Plug, shortcut: '8', section: 'System' },
  { id: 'diagnostics',  label: 'Diagnostics',  description: 'IPC logs and runtime health',         icon: Activity,    shortcut: 'D', section: 'System' },
  { id: 'settings',     label: 'Settings',     description: 'Theme, Deck mode, privacy',            icon: Settings,    shortcut: '0', section: 'System' },
  { id: 'fonts',        label: 'Fonts',        description: 'Typography and font manager',           icon: Type,        shortcut: '',  section: 'System' },

  // ── Security & Operations ──
  { id: 'security',     label: 'Security',     description: 'Hardening, credentials, audit log',    icon: ShieldCheck, shortcut: '',  section: 'Security & Ops' },
  { id: 'themes',       label: 'Themes',       description: 'Theme manager and color preview',      icon: Palette,     shortcut: '',  section: 'Security & Ops' },
  { id: 'exports',      label: 'Exports',      description: 'Session and diagnostics exports',      icon: Download,    shortcut: '',  section: 'Security & Ops' },
  { id: 'maintenance',  label: 'Maintenance',  description: 'Version info and system health',       icon: Wrench,      shortcut: '',  section: 'Security & Ops' },
  { id: 'recovery',     label: 'Recovery',     description: 'Error recovery and event log',         icon: RotateCcw,   shortcut: '',  section: 'Security & Ops' },
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

export const fontOptions: FontOption[] = [
  { id: 'inter', name: 'Inter', family: '"Inter", sans-serif', category: 'Sans Serif', weights: [400, 500, 600, 700] },
  { id: 'jetbrains-mono', name: 'JetBrains Mono', family: '"JetBrains Mono", monospace', category: 'Monospace', weights: [400, 500, 600, 700] },
  { id: 'orbitron', name: 'Orbitron', family: '"Orbitron", sans-serif', category: 'Sci-Fi', weights: [400, 500, 600, 700] },
  { id: 'rajdhani', name: 'Rajdhani', family: '"Rajdhani", sans-serif', category: 'Sci-Fi', weights: [400, 500, 600, 700] },
  { id: 'space-grotesk', name: 'Space Grotesk', family: '"Space Grotesk", sans-serif', category: 'Sans Serif', weights: [400, 500, 600, 700] },
  { id: 'exo-2', name: 'Exo 2', family: '"Exo 2", sans-serif', category: 'Sci-Fi', weights: [400, 500, 600, 700] },
  { id: 'fira-code', name: 'Fira Code', family: '"Fira Code", monospace', category: 'Monospace', weights: [400, 500, 600, 700] },
  { id: 'source-code-pro', name: 'Source Code Pro', family: '"Source Code Pro", monospace', category: 'Monospace', weights: [400, 500, 600, 700] },
  { id: 'dm-sans', name: 'DM Sans', family: '"DM Sans", sans-serif', category: 'Sans Serif', weights: [400, 500, 600, 700] },
  { id: 'work-sans', name: 'Work Sans', family: '"Work Sans", sans-serif', category: 'Sans Serif', weights: [400, 500, 600, 700] },
  { id: 'quicksand', name: 'Quicksand', family: '"Quicksand", sans-serif', category: 'Sans Serif', weights: [400, 500, 600, 700] },
  { id: 'nunito', name: 'Nunito', family: '"Nunito", sans-serif', category: 'Sans Serif', weights: [400, 500, 600, 700] },
  { id: 'manrope', name: 'Manrope', family: '"Manrope", sans-serif', category: 'Sans Serif', weights: [400, 500, 600, 700] },
  { id: 'chakra-petch', name: 'Chakra Petch', family: '"Chakra Petch", sans-serif', category: 'Sci-Fi', weights: [400, 500, 600, 700] },
  { id: 'teko', name: 'Teko', family: '"Teko", sans-serif', category: 'Display', weights: [400, 500, 600, 700] },
  { id: 'merriweather', name: 'Merriweather', family: '"Merriweather", serif', category: 'Serif', weights: [400, 500, 600, 700] },
  { id: 'playfair-display', name: 'Playfair Display', family: '"Playfair Display", serif', category: 'Serif', weights: [400, 500, 600, 700] },
  { id: 'cormorant-garamond', name: 'Cormorant Garamond', family: '"Cormorant Garamond", serif', category: 'Serif', weights: [400, 500, 600, 700] },
  { id: 'oxygen', name: 'Oxygen', family: '"Oxygen", sans-serif', category: 'Sans Serif', weights: [400, 500, 600, 700] },
  { id: 'titillium-web', name: 'Titillium Web', family: '"Titillium Web", sans-serif', category: 'Sans Serif', weights: [400, 500, 600, 700] },
];

export const starterPrompts = [
  'Audit this Electron app for security, IPC boundaries, and renderer risk.',
  'Create a production PRD and SDS for my current app feature.',
  'Scan my repo structure and recommend a cleaner architecture.',
  'Generate a QA checklist for desktop, Steam Deck, keyboard, and controller navigation.'
];
