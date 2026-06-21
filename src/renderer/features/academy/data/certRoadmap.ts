import type { Certification, ThmRoom } from '../types';

// ── TryHackMe Room Suggestions ────────────────────────────────────────────────

export const THM_ROOMS: ThmRoom[] = [
  {
    slug: 'introtonetworking',
    title: 'Intro to Networking',
    difficulty: 'easy',
    estimatedMinutes: 60,
    description: 'OSI model, TCP/IP stack, key protocols (DNS, DHCP, HTTP, ICMP). Essential for any SOC/security role.',
    skillKeys: ['networking', 'it-foundations'],
    certIds: ['comptia-secplus', 'comptia-cysa'],
  },
  {
    slug: 'nmap',
    title: 'Nmap',
    difficulty: 'easy',
    estimatedMinutes: 90,
    description: 'Port scanning, OS detection, service enumeration with Nmap. Hands-on from the fundamentals.',
    skillKeys: ['networking', 'threat-hunting'],
    certIds: ['comptia-secplus'],
  },
  {
    slug: 'burpsuitebasics',
    title: 'Burp Suite: The Basics',
    difficulty: 'easy',
    estimatedMinutes: 60,
    description: 'Web proxy, intercepting requests, repeater, intruder. Essential for web app testing and SecOps.',
    skillKeys: ['security-fundamentals', 'threat-hunting'],
    certIds: ['comptia-secplus'],
  },
  {
    slug: 'windowseventlogs',
    title: 'Windows Event Logs',
    difficulty: 'easy',
    estimatedMinutes: 75,
    description: 'Read and interpret Windows Security, System, and Application event logs. Key SOC skill.',
    skillKeys: ['log-analysis', 'soc-triage'],
    certIds: ['comptia-secplus', 'comptia-cysa'],
  },
  {
    slug: 'splunk101',
    title: 'Splunk 101',
    difficulty: 'easy',
    estimatedMinutes: 60,
    description: 'Splunk SPL basics — searching, filtering, piping, and building dashboards for SOC use cases.',
    skillKeys: ['log-analysis', 'soc-triage'],
    certIds: ['comptia-cysa'],
  },
  {
    slug: 'phishingemails1',
    title: 'Phishing Emails in Action',
    difficulty: 'easy',
    estimatedMinutes: 90,
    description: 'Dissect phishing emails, analyze headers, extract IOCs, and classify email-based threats.',
    skillKeys: ['soc-triage', 'security-fundamentals'],
    certIds: ['comptia-secplus', 'comptia-cysa'],
  },
  {
    slug: 'wireshark',
    title: 'Wireshark: The Basics',
    difficulty: 'easy',
    estimatedMinutes: 75,
    description: 'Capture and analyze network packets. Filter, follow streams, extract files from PCAP.',
    skillKeys: ['networking', 'log-analysis'],
    certIds: ['comptia-secplus', 'comptia-cysa'],
  },
  {
    slug: 'linuxfundamentalspart1',
    title: 'Linux Fundamentals Part 1',
    difficulty: 'easy',
    estimatedMinutes: 60,
    description: 'File system navigation, permissions, processes, and essential commands. Foundation for any security work.',
    skillKeys: ['operating-systems', 'it-foundations'],
    certIds: ['comptia-secplus'],
  },
  {
    slug: 'mitre',
    title: 'MITRE ATT&CK Framework',
    difficulty: 'easy',
    estimatedMinutes: 60,
    description: 'ATT&CK tactics and techniques, Navigator, threat group profiles, detection engineering.',
    skillKeys: ['soc-triage', 'threat-hunting'],
    certIds: ['comptia-cysa', 'oscp-ready'],
  },
  {
    slug: 'yara',
    title: 'YARA',
    difficulty: 'medium',
    estimatedMinutes: 90,
    description: 'Write YARA rules to detect malware patterns. Used in threat hunting and malware analysis.',
    skillKeys: ['threat-hunting', 'log-analysis'],
    certIds: ['comptia-cysa', 'oscp-ready'],
  },
  {
    slug: 'networkminer',
    title: 'NetworkMiner',
    difficulty: 'easy',
    estimatedMinutes: 60,
    description: 'Passive network forensics tool — extract hosts, sessions, credentials, and files from captures.',
    skillKeys: ['networking', 'log-analysis'],
    certIds: ['comptia-cysa'],
  },
  {
    slug: 'volatility',
    title: 'Volatility',
    difficulty: 'medium',
    estimatedMinutes: 120,
    description: 'Memory forensics with Volatility. Identify injected code, extract process artifacts, uncover malware.',
    skillKeys: ['threat-hunting', 'security-fundamentals'],
    certIds: ['comptia-cysa', 'oscp-ready'],
  },
  {
    slug: 'kerberos',
    title: 'Attacktive Directory',
    difficulty: 'medium',
    estimatedMinutes: 120,
    description: 'Active Directory enumeration, Kerberoasting, AS-REP roasting, and privilege escalation.',
    skillKeys: ['operating-systems', 'threat-hunting'],
    certIds: ['oscp-ready'],
  },
  {
    slug: 'introtoshells',
    title: 'What the Shell?',
    difficulty: 'medium',
    estimatedMinutes: 90,
    description: 'Reverse shells, bind shells, web shells, and shell stabilisation techniques.',
    skillKeys: ['security-fundamentals', 'operating-systems'],
    certIds: ['oscp-ready'],
  },
  {
    slug: 'commonattacks',
    title: 'Common Attacks',
    difficulty: 'easy',
    estimatedMinutes: 60,
    description: 'Social engineering, phishing, password attacks, and common web vulnerabilities overview.',
    skillKeys: ['security-fundamentals', 'soc-triage'],
    certIds: ['comptia-secplus'],
  },
];

// ── Certifications ────────────────────────────────────────────────────────────

export const CERTIFICATIONS: Certification[] = [
  {
    id: 'comptia-secplus',
    shortName: 'Sec+',
    name: 'CompTIA Security+',
    vendor: 'CompTIA',
    level: 'entry',
    color: 'nd-accent',
    requiredSkillScores: {
      'it-foundations': 40,
      'networking': 40,
      'operating-systems': 35,
      'security-fundamentals': 50,
      'soc-triage': 35,
      'log-analysis': 30,
    },
    thmRooms: THM_ROOMS.filter((r) => r.certIds.includes('comptia-secplus')),
    domains: [
      {
        name: 'Threats, Attacks & Vulnerabilities',
        weight: 24,
        objectives: [
          {
            code: '1.1',
            title: 'Compare and contrast different types of social engineering techniques',
            labIds: ['phishing-triage-001'],
            skillKeys: ['security-fundamentals', 'soc-triage'],
          },
          {
            code: '1.2',
            title: 'Given a scenario, analyze potential indicators to determine the type of attack',
            labIds: ['ssh-bruteforce-001', 'malware-persistence-001'],
            skillKeys: ['log-analysis', 'soc-triage'],
          },
          {
            code: '1.3',
            title: 'Explain threat intelligence concepts and vulnerability management',
            labIds: ['malware-persistence-001'],
            skillKeys: ['threat-hunting', 'security-fundamentals'],
          },
        ],
      },
      {
        name: 'Architecture & Design',
        weight: 21,
        objectives: [
          {
            code: '2.1',
            title: 'Explain the importance of security concepts in an enterprise environment',
            labIds: [],
            skillKeys: ['security-fundamentals'],
          },
          {
            code: '2.2',
            title: 'Summarize virtualization and cloud computing concepts',
            labIds: [],
            skillKeys: ['it-foundations'],
          },
        ],
      },
      {
        name: 'Implementation',
        weight: 25,
        objectives: [
          {
            code: '3.1',
            title: 'Implement secure protocols and network configurations',
            labIds: ['network-scan-001'],
            skillKeys: ['networking', 'security-fundamentals'],
          },
          {
            code: '3.2',
            title: 'Implement host/application security solutions and controls',
            labIds: ['windows-event-4624-001', 'malware-persistence-001'],
            skillKeys: ['operating-systems', 'log-analysis'],
          },
        ],
      },
      {
        name: 'Operations & Incident Response',
        weight: 16,
        objectives: [
          {
            code: '4.1',
            title: 'Given a scenario, use appropriate incident response procedures',
            labIds: ['ssh-bruteforce-001', 'data-exfil-http-001'],
            skillKeys: ['soc-triage', 'log-analysis'],
          },
          {
            code: '4.2',
            title: 'Apply basic digital forensics concepts',
            labIds: ['malware-persistence-001'],
            skillKeys: ['threat-hunting'],
          },
        ],
      },
      {
        name: 'Governance, Risk & Compliance',
        weight: 14,
        objectives: [
          {
            code: '5.1',
            title: 'Compare and contrast various types of controls',
            labIds: [],
            skillKeys: ['security-fundamentals'],
          },
          {
            code: '5.2',
            title: 'Explain the importance of applicable regulations and frameworks',
            labIds: [],
            skillKeys: ['security-fundamentals'],
          },
        ],
      },
    ],
  },
  {
    id: 'comptia-cysa',
    shortName: 'CySA+',
    name: 'CompTIA CySA+',
    vendor: 'CompTIA',
    level: 'associate',
    color: 'nd-warning',
    requiredSkillScores: {
      'security-fundamentals': 60,
      'log-analysis': 65,
      'soc-triage': 65,
      'threat-hunting': 55,
      'networking': 55,
    },
    thmRooms: THM_ROOMS.filter((r) => r.certIds.includes('comptia-cysa')),
    domains: [
      {
        name: 'Threat & Vulnerability Management',
        weight: 22,
        objectives: [
          {
            code: '1.1',
            title: 'Utilize threat intelligence to support organizational security',
            labIds: ['malware-persistence-001', 'data-exfil-http-001'],
            skillKeys: ['threat-hunting', 'soc-triage'],
          },
          {
            code: '1.2',
            title: 'Given a scenario, implement vulnerability management activities',
            labIds: ['network-scan-001'],
            skillKeys: ['networking', 'security-fundamentals'],
          },
        ],
      },
      {
        name: 'Software & Systems Security',
        weight: 18,
        objectives: [
          {
            code: '2.1',
            title: 'Apply security solutions for infrastructure management',
            labIds: ['windows-event-4624-001', 'malware-persistence-001'],
            skillKeys: ['operating-systems', 'log-analysis'],
          },
        ],
      },
      {
        name: 'Security Operations & Monitoring',
        weight: 25,
        objectives: [
          {
            code: '3.1',
            title: 'Analyze data as part of continuous security monitoring activities',
            labIds: ['ssh-bruteforce-001', 'network-scan-001', 'data-exfil-http-001'],
            skillKeys: ['log-analysis', 'soc-triage'],
          },
          {
            code: '3.2',
            title: 'Implement configuration changes to existing controls',
            labIds: [],
            skillKeys: ['security-fundamentals'],
          },
        ],
      },
      {
        name: 'Incident Response',
        weight: 22,
        objectives: [
          {
            code: '4.1',
            title: 'Apply the appropriate incident response procedure',
            labIds: ['data-exfil-http-001', 'malware-persistence-001'],
            skillKeys: ['soc-triage', 'threat-hunting'],
          },
          {
            code: '4.2',
            title: 'Apply digital forensics and artifact analysis',
            labIds: ['malware-persistence-001'],
            skillKeys: ['threat-hunting', 'log-analysis'],
          },
        ],
      },
      {
        name: 'Compliance & Assessment',
        weight: 13,
        objectives: [
          {
            code: '5.1',
            title: 'Understand the importance of data privacy and protection',
            labIds: [],
            skillKeys: ['security-fundamentals'],
          },
        ],
      },
    ],
  },
  {
    id: 'oscp-ready',
    shortName: 'OSCP',
    name: 'OSCP Readiness',
    vendor: 'Offensive Security',
    level: 'professional',
    color: 'nd-danger',
    requiredSkillScores: {
      'networking': 75,
      'operating-systems': 75,
      'security-fundamentals': 75,
      'log-analysis': 70,
      'threat-hunting': 80,
    },
    thmRooms: THM_ROOMS.filter((r) => r.certIds.includes('oscp-ready')),
    domains: [
      {
        name: 'Penetration Testing Methodology',
        weight: 20,
        objectives: [
          {
            code: '1.1',
            title: 'Conduct structured penetration tests: recon, scanning, exploitation, post-exploitation',
            labIds: ['network-scan-001'],
            skillKeys: ['networking', 'threat-hunting'],
          },
        ],
      },
      {
        name: 'Active Directory Attacks',
        weight: 25,
        objectives: [
          {
            code: '2.1',
            title: 'Enumerate and attack Active Directory environments',
            labIds: ['windows-event-4624-001', 'malware-persistence-001'],
            skillKeys: ['operating-systems', 'threat-hunting'],
          },
        ],
      },
      {
        name: 'Linux Privilege Escalation',
        weight: 20,
        objectives: [
          {
            code: '3.1',
            title: 'Identify and exploit Linux privilege escalation paths',
            labIds: [],
            skillKeys: ['operating-systems', 'security-fundamentals'],
          },
        ],
      },
      {
        name: 'Windows Privilege Escalation',
        weight: 20,
        objectives: [
          {
            code: '4.1',
            title: 'Identify and exploit Windows privilege escalation paths',
            labIds: ['malware-persistence-001'],
            skillKeys: ['operating-systems', 'security-fundamentals'],
          },
        ],
      },
      {
        name: 'Web Application Attacks',
        weight: 15,
        objectives: [
          {
            code: '5.1',
            title: 'Exploit common web vulnerabilities (SQLi, LFI, RCE, SSRF)',
            labIds: [],
            skillKeys: ['security-fundamentals', 'networking'],
          },
        ],
      },
    ],
  },
];

export function getCertById(id: string): Certification | undefined {
  return CERTIFICATIONS.find((c) => c.id === id);
}

export function computeCertReadiness(
  cert: Certification,
  skillScores: Record<string, number>,
  completedLabs: string[],
): {
  overallPercent: number;
  skillReadiness: { key: string; current: number; required: number; ready: boolean }[];
  labCoverage: number;
  ready: boolean;
} {
  const skillReadiness = Object.entries(cert.requiredSkillScores).map(([key, required]) => {
    const current = skillScores[key] ?? 0;
    return { key, current, required, ready: current >= required };
  });

  const allSkillsMet = skillReadiness.every((s) => s.ready);

  const allObjectiveLabs = cert.domains.flatMap((d) =>
    d.objectives.flatMap((o) => o.labIds),
  );
  const uniqueLabs = [...new Set(allObjectiveLabs)];
  const completedCount = uniqueLabs.filter((id) => completedLabs.includes(id)).length;
  const labCoverage = uniqueLabs.length > 0
    ? Math.round((completedCount / uniqueLabs.length) * 100)
    : 100;

  const skillPercent = skillReadiness.length > 0
    ? Math.round(
        skillReadiness.reduce((sum, s) => sum + Math.min(100, (s.current / s.required) * 100), 0) /
          skillReadiness.length,
      )
    : 100;

  const overallPercent = Math.round((skillPercent + labCoverage) / 2);

  return {
    overallPercent,
    skillReadiness,
    labCoverage,
    ready: allSkillsMet && labCoverage >= 60,
  };
}
