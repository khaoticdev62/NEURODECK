import type { Lab, LearningPath } from '../types';

// ─── Starter Labs ────────────────────────────────────────────────────────────

export const STARTER_LABS: Lab[] = [
  {
    id: 'ssh-bruteforce-001',
    pathId: 'soc-analyst-l1',
    title: 'SSH Brute-Force Detection',
    type: 'log-analysis',
    difficulty: 2,
    estimatedMinutes: 15,
    objectives: [
      'Identify the source IP of repeated failed login attempts',
      'Determine whether the attacker achieved a successful login',
      'Draft a one-sentence SOC escalation note',
    ],
    mitreMappings: ['T1110.001 — Brute Force: Password Guessing'],
    skillsEarned: ['log-analysis', 'soc-triage'],
    tasks: [
      {
        id: 'task-1',
        prompt: 'What IP address is responsible for the failed login attempts?',
        type: 'identify',
        hint: 'Look for the "from" field in each sshd log line.',
        gradingKeywords: ['192.168.1.105'],
        gradingPatterns: ['192\\.168\\.1\\.105', '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}'],
        sampleAnswer: '192.168.1.105 — it appears in all four "Failed password" log lines as the source of the brute-force attempts.',
      },
      {
        id: 'task-2',
        prompt: 'Was the final login attempt successful? How can you tell from the log?',
        type: 'classify',
        hint: '"Accepted password" indicates a successful authentication.',
        gradingKeywords: ['yes', 'accepted', 'successful'],
        gradingPatterns: ['accepted password|success|yes'],
        sampleAnswer: 'Yes — the last log line reads "Accepted password for root from 192.168.1.105", confirming the attacker gained access after four failed attempts.',
      },
      {
        id: 'task-3',
        prompt: 'Write a one-sentence escalation note describing what happened.',
        type: 'write',
        hint: 'Include: what happened, the source IP, the target account, and whether access was gained.',
        gradingKeywords: ['192.168.1.105', 'root', 'ssh'],
        gradingPatterns: ['brute.?force|credential|password.*guess', '192\\.168\\.1\\.105', 'root'],
        sampleAnswer: 'Brute-force SSH attack from 192.168.1.105 against the root account resulted in a successful login at 02:41:44 — recommend immediate host isolation and credential rotation.',
      },
    ],
    datasetStub: `Jun 13 02:41:15 server sshd[12847]: Failed password for root from 192.168.1.105 port 52341 ssh2
Jun 13 02:41:17 server sshd[12847]: Failed password for root from 192.168.1.105 port 52342 ssh2
Jun 13 02:41:19 server sshd[12847]: Failed password for root from 192.168.1.105 port 52343 ssh2
Jun 13 02:41:21 server sshd[12848]: Failed password for root from 192.168.1.105 port 52344 ssh2
Jun 13 02:41:44 server sshd[12849]: Accepted password for root from 192.168.1.105 port 52345 ssh2
Jun 13 02:41:44 server sshd[12849]: pam_unix(sshd:session): session opened for user root by (uid=0)`,
  },
  {
    id: 'phishing-triage-001',
    pathId: 'it-soc-bridge',
    title: 'Phishing Email Triage',
    type: 'ticket',
    difficulty: 1,
    estimatedMinutes: 10,
    objectives: [
      'Identify indicators that mark an email as phishing',
      'Classify the threat accurately',
      'Provide a clear, actionable response to the user',
    ],
    mitreMappings: ['T1566.001 — Phishing: Spearphishing Link'],
    skillsEarned: ['it-foundations', 'security-fundamentals'],
    tasks: [
      {
        id: 'task-1',
        prompt: 'Is the sender domain legitimate? What is suspicious about it?',
        type: 'identify',
        hint: "Compare the sender domain against the company's real domain. Look for lookalike TLDs or extra subdomains.",
        gradingKeywords: ['company-helpdesk.net', 'not legitimate', 'lookalike', 'suspicious', 'fake'],
        gradingPatterns: ['company-helpdesk\\.net', 'corp\\.company\\.com', 'lookalike|fake|not.*legit|suspicious'],
        sampleAnswer: 'The sender domain "company-helpdesk.net" is NOT the legitimate corporate domain "corp.company.com". It is a lookalike domain — a classic phishing indicator.',
      },
      {
        id: 'task-2',
        prompt: 'Classify this email: Phishing / Spear-phishing / Legitimate / Uncertain',
        type: 'classify',
        hint: 'Phishing uses urgency and fake domains. Spear-phishing is targeted at a specific person or role.',
        gradingKeywords: ['phishing'],
        gradingPatterns: ['phishing|spear.?phishing'],
        sampleAnswer: 'Phishing (could also be spear-phishing). The email uses urgency ("24 hours"), a lookalike domain, and requests credential verification — all canonical phishing indicators.',
      },
      {
        id: 'task-3',
        prompt: 'What three actions should you tell the user to take right now?',
        type: 'write',
        hint: 'Think: do not click, do not reply, and escalate. Should the account be checked for compromise?',
        gradingKeywords: ['do not click', 'do not reply', 'report'],
        gradingPatterns: ['do not click|don.*t click', 'do not reply|don.*t reply|ignore', 'report|escalat|security team'],
        sampleAnswer: '1. Do not click any links in the email. 2. Do not reply to the sender. 3. Forward the email to the security team and have your account reviewed for unauthorized access.',
      },
    ],
    datasetStub: `User Report (Help Desk Ticket #10492):
"Hi helpdesk, I got an email from IT-Support@company-helpdesk.net saying my
account will be suspended in 24 hours unless I verify my credentials at:
http://secure-login.company-helpdesk.net/verify

The subject line was: [URGENT] Account Verification Required — Action Needed Now
I haven't clicked anything. Is this real?"

Sender:    IT-Support@company-helpdesk.net
Reply-To:  no-reply@company-helpdesk.net
Received:  from mail3.company-helpdesk.net (185.220.101.47)
Real corp domain: corp.company.com`,
  },
  {
    id: 'windows-event-4624-001',
    pathId: 'soc-analyst-l1',
    title: 'Windows Logon Event Analysis',
    type: 'log-analysis',
    difficulty: 2,
    estimatedMinutes: 20,
    objectives: [
      'Parse Windows Security Event ID 4624 and 4625',
      'Determine whether a logon sequence is suspicious',
      'Identify the authentication protocol and its implications',
    ],
    mitreMappings: ['T1078 — Valid Accounts', 'T1110 — Brute Force'],
    skillsEarned: ['log-analysis', 'security-fundamentals'],
    tasks: [
      {
        id: 'task-1',
        prompt: 'What user account logged on successfully? What does Logon Type 3 mean?',
        type: 'identify',
        hint: 'Logon Type 3 is a network logon — typically file shares, RDP without NLA, or pass-the-hash.',
        gradingKeywords: ['jsmith', 'network logon', 'logon type 3'],
        gradingPatterns: ['jsmith', 'logon type 3|type 3|network logon'],
        sampleAnswer: 'jsmith logged on successfully. Logon Type 3 is a network logon — used when accessing shared resources over the network, or potentially during a pass-the-hash attack.',
      },
      {
        id: 'task-2',
        prompt: 'There is a failed logon (4625) before the success (4624) from the same IP. Is this suspicious?',
        type: 'classify',
        hint: 'One failure before success could be a typo. Multiple failures from the same external source is more concerning.',
        gradingKeywords: ['yes', 'suspicious', 'investigate'],
        gradingPatterns: ['yes|suspicious|investigate|concern', '4625.*4624|failed.*success'],
        sampleAnswer: 'Yes, this warrants investigation. A failed logon immediately before a success from the same external IP using NTLM is consistent with a credential guessing attempt, especially from an unrecognized workstation (LAPTOP-EXTERN).',
      },
      {
        id: 'task-3',
        prompt: 'What authentication protocol was used? Is NTLM a concern in a modern corporate environment?',
        type: 'identify',
        hint: 'NTLM is older and vulnerable to relay attacks. Kerberos is preferred in modern AD environments.',
        gradingKeywords: ['ntlm', 'yes', 'concern'],
        gradingPatterns: ['ntlm', 'relay|pass.the.hash|vulnerable|older|kerberos'],
        sampleAnswer: 'NTLM was used (AuthPackageName: NTLM). Yes, NTLM is a concern — it is vulnerable to relay attacks and pass-the-hash. In modern environments, Kerberos is preferred. NTLM usage from an unrecognized external workstation is a strong escalation signal.',
      },
    ],
    datasetStub: `Event 4625 — Logon Failure
  TimeCreated:      2026-06-13T03:19:43Z
  Computer:         WORKSTATION-07.corp.company.com
  TargetUserName:   jsmith
  TargetDomain:     CORP
  LogonType:        3 (Network)
  IpAddress:        10.10.5.99
  FailureReason:    Unknown username or bad password
  Status:           0xC000006D
  SubStatus:        0xC000006A

Event 4624 — Logon Success
  TimeCreated:      2026-06-13T03:22:11Z
  Computer:         WORKSTATION-07.corp.company.com
  TargetUserName:   jsmith
  TargetDomain:     CORP
  LogonType:        3 (Network)
  IpAddress:        10.10.5.99
  AuthPackageName:  NTLM
  WorkstationName:  LAPTOP-EXTERN`,
  },
];

// ─── Learning Paths ──────────────────────────────────────────────────────────

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'it-soc-bridge',
    title: 'IT Support → SOC Bridge',
    description:
      'Build the service-desk skills that transfer directly into a SOC role: ticket triage, identity verification, phishing escalation, and endpoint basics.',
    level: 'beginner',
    iconKey: 'Headphones',
    locked: false,
    modules: [
      { id: 'itb-01', pathId: 'it-soc-bridge', title: 'Password Reset & Identity Verification', objectives: ['Verify user identity before credential changes', 'Document actions in the ticket'], labIds: [] },
      { id: 'itb-02', pathId: 'it-soc-bridge', title: 'Phishing Email Triage', objectives: ['Identify phishing indicators', 'Advise users correctly'], labIds: ['phishing-triage-001'] },
      { id: 'itb-03', pathId: 'it-soc-bridge', title: 'Endpoint Basics', objectives: ['Identify running processes', 'Understand AV alerts'], labIds: [] },
      { id: 'itb-04', pathId: 'it-soc-bridge', title: 'VPN Connection Issues', objectives: ['Diagnose common VPN failures', 'Escalate network-layer issues'], labIds: [] },
      { id: 'itb-05', pathId: 'it-soc-bridge', title: 'Suspicious Login Tickets', objectives: ['Identify indicators of account compromise', 'Follow escalation procedures'], labIds: [] },
      { id: 'itb-06', pathId: 'it-soc-bridge', title: 'MFA Enrollment & Issues', objectives: ['Walk users through MFA enrollment', 'Handle bypass requests safely'], labIds: [] },
      { id: 'itb-07', pathId: 'it-soc-bridge', title: 'Escalation Writing', objectives: ['Write clear, factual escalation notes', 'Include who/what/when/where/severity'], labIds: [] },
    ],
  },
  {
    id: 'soc-analyst-l1',
    title: 'SOC Analyst Level 1',
    description:
      'Core analyst skills: alert triage, log reading, SIEM queries, MITRE ATT&CK mapping, and writing incident notes under pressure.',
    level: 'intermediate',
    iconKey: 'Shield',
    locked: false,
    modules: [
      { id: 'soc-01', pathId: 'soc-analyst-l1', title: 'Alert Triage Fundamentals', objectives: ['Prioritize alerts by severity and context', 'Identify true positives vs. noise'], labIds: [] },
      { id: 'soc-02', pathId: 'soc-analyst-l1', title: 'Log Reading', objectives: ['Parse syslog, auth.log, and Windows Event logs', 'Extract key fields without a SIEM'], labIds: ['ssh-bruteforce-001', 'windows-event-4624-001'] },
      { id: 'soc-03', pathId: 'soc-analyst-l1', title: 'SIEM Query Basics', objectives: ['Write basic search queries', 'Use time ranges and field filters'], labIds: [] },
      { id: 'soc-04', pathId: 'soc-analyst-l1', title: 'MITRE ATT&CK Mapping', objectives: ['Map observed behaviors to tactics and techniques', 'Use the ATT&CK Navigator mindset'], labIds: [] },
      { id: 'soc-05', pathId: 'soc-analyst-l1', title: 'False Positive vs. True Positive', objectives: ['Apply context to reduce noise', 'Document false positive determinations'], labIds: [] },
      { id: 'soc-06', pathId: 'soc-analyst-l1', title: 'Incident Notes', objectives: ['Write timeline-based notes', 'Capture evidence with precision'], labIds: [] },
      { id: 'soc-07', pathId: 'soc-analyst-l1', title: 'Containment Decisions', objectives: ['Decide when to isolate vs. monitor', 'Understand blast radius'], labIds: [] },
      { id: 'soc-08', pathId: 'soc-analyst-l1', title: 'Threat Intel Basics', objectives: ['Use IOCs to enrich alerts', 'Understand threat actor profiles'], labIds: [] },
    ],
  },
  {
    id: 'secplus-companion',
    title: 'Security+ / Network+ Companion',
    description:
      'Practice-first companion for certification study. Each module ties exam objectives to hands-on log and packet analysis.',
    level: 'intermediate',
    iconKey: 'Award',
    locked: false,
    modules: [
      { id: 'sec-01', pathId: 'secplus-companion', title: 'Networking Fundamentals', objectives: ['OSI model applied to real traffic', 'TCP/IP header fields in context'], labIds: [] },
      { id: 'sec-02', pathId: 'secplus-companion', title: 'Threats & Vulnerabilities', objectives: ['Recognize common attack patterns', 'Distinguish vulnerability classes'], labIds: [] },
      { id: 'sec-03', pathId: 'secplus-companion', title: 'Identity & Access Management', objectives: ['AAA concepts in practice', 'MFA, SSO, and federation'], labIds: [] },
      { id: 'sec-04', pathId: 'secplus-companion', title: 'Cryptography Basics', objectives: ['Symmetric vs. asymmetric in real configs', 'Certificate chain validation'], labIds: [] },
      { id: 'sec-05', pathId: 'secplus-companion', title: 'Risk Management', objectives: ['Qualitative vs. quantitative risk', 'Risk register basics'], labIds: [] },
      { id: 'sec-06', pathId: 'secplus-companion', title: 'Incident Response', objectives: ['IR lifecycle phases', 'Evidence handling basics'], labIds: [] },
      { id: 'sec-07', pathId: 'secplus-companion', title: 'Security Architecture', objectives: ['Defense-in-depth in real environments', 'Segmentation and DMZ patterns'], labIds: [] },
      { id: 'sec-08', pathId: 'secplus-companion', title: 'Governance & Compliance', objectives: ['NIST CSF 2.0 core functions', 'Policy vs. procedure vs. standard'], labIds: [] },
    ],
  },
  {
    id: 'portfolio-builder',
    title: 'Portfolio Builder',
    description:
      'Turn your lab work into job ammunition: investigation writeups, resume bullets, mock interview answers, and GitHub-ready exports.',
    level: 'beginner',
    iconKey: 'Briefcase',
    locked: false,
    modules: [
      { id: 'port-01', pathId: 'portfolio-builder', title: 'Writing Investigation Writeups', objectives: ['Structure a clear narrative from raw logs', 'Include evidence, timeline, and conclusion'], labIds: [] },
      { id: 'port-02', pathId: 'portfolio-builder', title: 'Screenshot Evidence', objectives: ['Capture relevant log sections', 'Annotate screenshots for clarity'], labIds: [] },
      { id: 'port-03', pathId: 'portfolio-builder', title: 'Command History Documentation', objectives: ['Record commands used during analysis', 'Explain what each command revealed'], labIds: [] },
      { id: 'port-04', pathId: 'portfolio-builder', title: 'Resume Bullets', objectives: ['Convert lab completions to quantified bullets', 'Use action-verb + skill + impact format'], labIds: [] },
      { id: 'port-05', pathId: 'portfolio-builder', title: 'Mock Interview Prep', objectives: ['Answer "tell me about a time you…" using lab stories', 'Handle technical screener questions'], labIds: [] },
      { id: 'port-06', pathId: 'portfolio-builder', title: 'GitHub Export', objectives: ['Structure a portfolio repo', 'Write a professional README for your evidence'], labIds: [] },
    ],
  },
];

export function getLabById(id: string): Lab | undefined {
  return STARTER_LABS.find((l) => l.id === id);
}

export function getPathById(id: string): LearningPath | undefined {
  return LEARNING_PATHS.find((p) => p.id === id);
}

export function getLabsForPath(pathId: string): Lab[] {
  return STARTER_LABS.filter((l) => l.pathId === pathId);
}

export function pathCompletionPercent(pathId: string, completedLabs: string[]): number {
  const path = getPathById(pathId);
  if (!path) return 0;
  const allLabIds = path.modules.flatMap((m) => m.labIds);
  if (!allLabIds.length) return 0;
  const done = allLabIds.filter((id) => completedLabs.includes(id)).length;
  return Math.round((done / allLabIds.length) * 100);
}
