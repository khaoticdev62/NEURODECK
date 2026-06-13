export type LabType = 'log-analysis' | 'terminal' | 'soc-alert' | 'ticket' | 'packet' | 'cloud';
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type PathLevel = 'beginner' | 'intermediate' | 'advanced';
export type TaskKind = 'identify' | 'classify' | 'write' | 'command';
export type AcademyTab = 'home' | 'paths' | 'labs' | 'portfolio';

export interface LabTask {
  id: string;
  prompt: string;
  type: TaskKind;
  hint?: string;
  gradingKeywords: string[];   // answer must contain ≥ half of these (case-insensitive)
  gradingPatterns: string[];   // regex patterns for bonus credit
  sampleAnswer: string;        // shown after submission
}

export interface Lab {
  id: string;
  pathId: string;
  title: string;
  type: LabType;
  difficulty: Difficulty;
  estimatedMinutes: number;
  objectives: string[];
  tasks: LabTask[];
  datasetStub: string;
  mitreMappings: string[];    // pre-defined MITRE ATT&CK technique IDs shown on completion
  skillsEarned: SkillKey[];   // skills awarded when lab is completed
}

export interface Module {
  id: string;
  pathId: string;
  title: string;
  objectives: string[];
  labIds: string[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  level: PathLevel;
  iconKey: string;
  modules: Module[];
  locked: boolean;
}

export interface LearnerProgress {
  completedLabs: string[];
  completedModules: string[];
  skillScores: Record<string, number>;
  portfolioEntryIds: string[];
  lastActive: string;
}

export interface PortfolioEntry {
  id: string;
  labId: string;
  labTitle: string;
  summary: string;
  commandsUsed: string[];
  findings: string[];
  mitreMappings: string[];
  skillsEarned: string[];
  timestamp: string;
}

export const SKILL_KEYS = [
  'it-foundations',
  'networking',
  'operating-systems',
  'security-fundamentals',
  'soc-triage',
  'log-analysis',
] as const;

export type SkillKey = typeof SKILL_KEYS[number];

export const SKILL_LABELS: Record<SkillKey, string> = {
  'it-foundations': 'IT Foundations',
  'networking': 'Networking',
  'operating-systems': 'Operating Systems',
  'security-fundamentals': 'Security Fundamentals',
  'soc-triage': 'SOC Triage',
  'log-analysis': 'Log Analysis',
};

export function defaultProgress(): LearnerProgress {
  return {
    completedLabs: [],
    completedModules: [],
    skillScores: Object.fromEntries(SKILL_KEYS.map((k) => [k, 0])),
    portfolioEntryIds: [],
    lastActive: new Date().toISOString(),
  };
}
