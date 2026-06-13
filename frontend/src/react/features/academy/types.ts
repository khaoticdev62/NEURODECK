export type LabType = 'log-analysis' | 'terminal' | 'soc-alert' | 'ticket' | 'packet' | 'cloud';
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type PathLevel = 'beginner' | 'intermediate' | 'advanced';
export type TaskKind = 'identify' | 'classify' | 'write' | 'command';
export type AcademyTab = 'home' | 'paths' | 'labs' | 'portfolio' | 'soc' | 'query' | 'exam' | 'roadmap';

// ── SOC Console types ────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertDisposition = 'true-positive' | 'false-positive' | 'benign';
export type AlertSource = 'edr' | 'siem' | 'ids' | 'firewall' | 'av' | 'email-gw';

export interface SocAlert {
  id: string;
  title: string;
  severity: AlertSeverity;
  source: AlertSource;
  timestamp: string;
  description: string;
  context: string;             // analyst background notes
  rawLogs: string;
  correctDisposition: AlertDisposition;
  correctMitreTechniques: string[];  // base IDs — e.g. ['T1059', 'T1059.001']
  escalationKeywords: string[];      // grading: must-contain terms for escalation note
}

export interface AlertGradeResult {
  score: number;
  dispositionScore: number;   // 0 or 50
  mitreScore: number;         // 0–25
  escalationScore: number;    // 0–25
  dispositionCorrect: boolean;
  mitreMapped: boolean;
  feedback: string;
}

export interface AlertAnalysisState {
  mitreTags: string[];
  disposition: AlertDisposition | '';
  escalationNote: string;
  graded: boolean;
  gradeResult?: AlertGradeResult;
}

export interface LabTask {
  id: string;
  prompt: string;
  type: TaskKind;
  hint?: string;
  gradingKeywords: string[];   // answer must contain ≥ half of these (case-insensitive)
  gradingPatterns: string[];   // regex patterns for bonus credit
  sampleAnswer: string;        // shown after submission
}

export type DatasetFormat = 'log' | 'json' | 'csv' | 'text' | 'pcap' | 'xml';

export interface DatasetSection {
  label: string;
  content: string;
  format: DatasetFormat;
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
  datasetStub: string;            // backward-compat plain text
  datasetSections?: DatasetSection[]; // rich multi-tab data; overrides datasetStub when present
  mitreMappings: string[];
  skillsEarned: SkillKey[];
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
  'threat-hunting',
] as const;

export type SkillKey = typeof SKILL_KEYS[number];

export const SKILL_LABELS: Record<SkillKey, string> = {
  'it-foundations': 'IT Foundations',
  'networking': 'Networking',
  'operating-systems': 'Operating Systems',
  'security-fundamentals': 'Security Fundamentals',
  'soc-triage': 'SOC Triage',
  'log-analysis': 'Log Analysis',
  'threat-hunting': 'Threat Hunting',
};

// ── Practice Exam types ──────────────────────────────────────────────────────

export interface ExamQuestion {
  id: string;
  domain: string;
  difficulty: 'easy' | 'medium' | 'hard';
  stem: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation: string;
  mitreTechnique?: string;
}

export type ExamPhase = 'config' | 'running' | 'review';

export interface ExamSession {
  questionIds: string[];
  answers: Record<string, number>;  // questionId → chosen option index (-1 = unanswered)
  flagged: Set<string>;
  startedAt: number;                // Date.now()
  finishedAt?: number;
  timeLimitSeconds: number;
}

// ── Certification Roadmap types ───────────────────────────────────────────────

export interface CertObjective {
  code: string;
  title: string;
  labIds: string[];
  skillKeys: SkillKey[];
}

export interface CertDomain {
  name: string;
  weight: number;   // exam percentage weight
  objectives: CertObjective[];
}

export interface ThmRoom {
  slug: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
  description: string;
  skillKeys: SkillKey[];
  certIds: string[];
}

export interface Certification {
  id: string;
  shortName: string;
  name: string;
  vendor: string;
  level: 'entry' | 'associate' | 'professional';
  color: string;      // Tailwind color token suffix, e.g. 'nd-accent'
  domains: CertDomain[];
  requiredSkillScores: Partial<Record<SkillKey, number>>;
  thmRooms: ThmRoom[];
}

export function defaultProgress(): LearnerProgress {
  return {
    completedLabs: [],
    completedModules: [],
    skillScores: Object.fromEntries(SKILL_KEYS.map((k) => [k, 0])),
    portfolioEntryIds: [],
    lastActive: new Date().toISOString(),
  };
}
