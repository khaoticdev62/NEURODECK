# NeuroDeckOS Built-In Warpinator / Winpinator-Compatible LAN Share
## Production Implementation Mega-Prompt

Use this prompt with a repository-aware coding agent. It extends the existing NeuroDeckOS shell, controller runtime, spatial focus engine, typed IPC, permission broker, File Manager, Universal Share Sheet, Transfer Center, Activity Center, Notification Center, workflow engine, capability registry, diagnostics, and SteamOS packaging.

# MASTER DIRECTIVE

Act as principal network-transfer architect, Electron engineer, Rust systems engineer, SteamOS integrator, protocol interoperability engineer, security engineer, controller UX lead, and QA lead.

Implement a real built-in **LAN Share** subsystem that is compatible with the Warpinator ecosystem and usable entirely by Steam Deck controls.

The feature must send and receive:

- Files
- Multiple files
- Folders
- Mixed file/folder selections
- Clipboard text when the remote protocol supports it
- Screenshots and voice notes
- Workspace exports
- Workflow packages
- Diagnostic bundles
- Any safe file reference passed through the Universal Share Sheet

Do not ship a mock UI, fake devices, simulated progress, a browser-only sender, a hidden GTK window, or a shell wrapper that merely launches external Warpinator.

Do not claim interoperability, encryption, resume, sandboxing, or trust unless tested.

---

# 1. Product and Naming

User-facing name:

**LAN Share**  
**Warpinator-Compatible Transfers**

Do not imply official affiliation with Linux Mint, Warpinator, Winpinator, or third-party clients.

Internal names:

```text
ndx-lan-share
LanShareService
WarpCompatibilityAdapter
ndx.transfer.warp
```

LAN Share must work without an internet account and must default to local-network-only behavior.

---

# 2. Compatibility Baseline

Support:

- Linux Mint Warpinator
- Flathub/package-distributed Warpinator
- Compatible unofficial Windows clients
- Compatible Android clients
- Other NeuroDeckOS devices
- Manual local-IP connections

Implement and test:

- gRPC/protobuf-based compatible protocol
- Zeroconf/mDNS/DNS-SD discovery
- Registration protocol v1
- Registration protocol v2
- Authentication and transfer services
- Compatible group-code behavior
- Encrypted sessions
- File and directory transfer
- Multiple simultaneous transfers
- Optional compatible compression
- Manual connection
- Transfer history

Default compatibility ports:

```text
42000  transfer
42001  authentication/registration
5353   mDNS
```

Ports must be configurable and validated. Current operation should prefer TCP; legacy UDP behavior may be enabled only when compatibility requires it.

IPv4 is required. IPv6 must remain capability-gated until real interoperability passes.

---

# 3. License and Compliance Gate

The upstream and common compatible implementations are GPL-licensed.

Before coding:

1. Inventory every upstream source, protobuf file, constant, test fixture, and generated binding under consideration.
2. Record exact licenses and source hashes.
3. Choose and document one strategy:
   - Clean-room compatible implementation
   - Separate GPL service distributed compliantly
   - Integration with system-installed Warpinator
   - Another legally reviewed architecture
4. Preserve notices and attribution.
5. Generate an SBOM.
6. Do not copy upstream code into an incompatible licensing structure.
7. Create:

```text
docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md
```

Do not make unreviewed legal claims.

---

# 4. Source Safety

Only reference official or explicitly allowlisted project sources.

Warn that unrelated Warpinator-named download websites may be malicious.

Never:

- Download executables from search results
- Auto-install Windows clients
- Trust remote device names or TXT records
- Execute received files
- Treat unsigned mirrors as official

---

# 5. Architecture

Build an isolated local service:

```text
React Renderer
  → typed preload API
Electron Main
  → authenticated local RPC
NDX Core
  → LAN Share Supervisor
      ├── Interface Manager
      ├── mDNS Discovery
      ├── Manual Connection
      ├── Registration v1 Adapter
      ├── Registration v2 Adapter
      ├── Authentication Manager
      ├── gRPC Transfer Service
      ├── Compatibility Negotiator
      ├── Transfer Queue
      ├── Incoming Approval Gate
      ├── Destination Sandbox
      ├── Integrity Validator
      ├── Compression Adapter
      ├── Trust Store
      ├── History Store
      └── Diagnostics
```

Preferred implementation: dedicated Rust service or strongly isolated core module.

Potential Rust dependencies, selected only after audit:

```text
tokio
tonic
prost
rustls
mdns-sd
serde
thiserror
tracing
rusqlite or sqlx
sha2
flate2
tempfile
uuid
bytes
tokio-util
zeroize
secrecy
landlock
```

Large file bytes must never pass through Electron IPC or React state.

---

# 6. Security Boundaries

Renderer may display state and submit typed actions. It may not open sockets, hold private keys, write incoming data directly, or bypass approvals.

Preload must expose a frozen, versioned, validated API. Never expose raw `ipcRenderer`.

The transfer service owns discovery, sockets, authentication, streaming, staging, integrity checks, and atomic destination commit.

Untrusted remote metadata must be normalized before reaching the renderer.

---

# 7. Capability Registry

Register:

```text
lanShare.available
lanShare.discovery.mdns
lanShare.discovery.manual
lanShare.registration.v1
lanShare.registration.v2
lanShare.files
lanShare.directories
lanShare.text
lanShare.parallel
lanShare.compression
lanShare.resume.ndx
lanShare.landlock
lanShare.bubblewrap
lanShare.ipv4
lanShare.ipv6
lanShare.firewall.detect
lanShare.firewall.configure
lanShare.backgroundReceive
```

Each reports available, permission-required, dependency-required, unsupported, degraded, or temporarily unavailable, with remediation.

Never hide degraded filesystem isolation.

---

# 8. Routes and Screens

Main route:

```text
/tools/lan-share
```

Subroutes:

```text
devices
send
transfers
history
trust
groups
settings
diagnostics
```

Implement:

```text
ND-LAN-001 LAN Share Home
ND-LAN-002 Nearby Devices
ND-LAN-003 Device Detail
ND-LAN-004 Send Composer
ND-LAN-005 Selection Review
ND-LAN-006 Incoming Transfer Approval
ND-LAN-007 Active Transfers
ND-LAN-008 Transfer Detail
ND-LAN-009 Transfer History
ND-LAN-010 Trusted Devices
ND-LAN-011 Device Trust Review
ND-LAN-012 Group Code and Secure Mode
ND-LAN-013 Manual Connection
ND-LAN-014 Network Interface Selection
ND-LAN-015 Receive Destination Rules
ND-LAN-016 Compression and Performance
ND-LAN-017 Settings
ND-LAN-018 Firewall Assistant
ND-LAN-019 Connectivity Diagnostics
ND-LAN-020 Compatibility Detail
ND-LAN-021 Quick Send Overlay
ND-LAN-022 Background Receive Notification
ND-LAN-023 Conflict Resolver
ND-LAN-024 Insufficient Storage Recovery
ND-LAN-025 Quarantined Item
ND-LAN-026 Help
ND-LAN-027 First-Run Secure Setup
ND-LAN-028 Service Health and Logs
```

Every view requires initial focus, deterministic traversal, loading, empty, error, offline, restricted, large-text, high-contrast, and controller tests.

---

# 9. Controller Contract

```text
A       open/select/confirm
B       back/close
X       context actions
Y       explain/troubleshoot
LB/RB   Devices/Transfers/History/Settings
LT/RT   main pane/context pane
D-pad   precise navigation
Sticks  accelerated navigation/scroll
L3      pin trusted device
R3      inspect
View    Transfer Center
Menu    LAN Share command palette
L4      voice input
L5      search/manual address
R4      share actions
R5      send selected items
Menu+B  emergency stop LAN Share jobs
```

An incoming transfer must never be accepted by an accidental first `A` press. Focus the review content or safe action first.

---

# 10. Discovery and Device Model

Automatic discovery must support interface-scoped mDNS, v1/v2 registration, reannouncement, expiration, deduplication, rescan, network changes, and capability negotiation.

Manual connection supports:

- Local IPv4 or hostname
- Transfer/auth ports
- Interface binding
- Protocol probe
- Saved peer
- Remove peer

WAN targets are rejected by default.

Peer contract:

```ts
interface LanSharePeer {
  id: string;
  displayName: string;
  addresses: string[];
  interfaceId: string;
  transferPort: number;
  authPort: number;
  registrationVersion: 1 | 2 | "unknown";
  platform: "linux" | "windows" | "android" | "ndx" | "unknown";
  capabilities: string[];
  trustState: string;
  fingerprint?: string;
  groupMatch: boolean;
  lastSeenAt: string;
  discoverySource: "mdns" | "manual" | "history";
  status: "online" | "connecting" | "busy" | "offline" | "incompatible";
}
```

Remote strings are untrusted.

---

# 11. Group Code and Secure Mode

Require or strongly prompt a unique compatible group code during first run.

Rules:

- Do not recommend the default.
- Enforce compatible 8–32 character limits.
- Store through secure vault.
- Never return plaintext to renderer after setup.
- Never log it.
- Changing it restarts discovery safely.
- Explain that all peers must match.

In default/insecure mode:

- Always require incoming approval
- Disable auto-start
- Disable auto-accept
- Show persistent warning
- Disable persistent trust where appropriate
- Optionally end idle exposure after a session timeout

---

# 12. Trust Layer

Group matching is not permanent trust.

States:

```text
unknown
seen
temporarily-approved
trusted
blocked
fingerprint-changed
revoked
```

Trust screen shows device identity, platform, addresses, interface, protocol, fingerprint, first/last seen, and history.

Requirements:

- Never trust a display name.
- Fingerprint changes disable unattended approval.
- Trust may expire.
- Trust can be scoped to a network profile.
- Blocked peers are ignored and audited.
- Peers without stable identity remain approval-required.

---

# 13. Authentication and Encryption

Implement compatible authentication precisely.

Requirements:

- Secure randomness
- Timeouts
- Replay and malformed-message rejection
- Per-peer rate limiting
- Secret zeroization
- Negotiated metadata logging without secrets
- No disabled certificate or identity checks as a compatibility shortcut
- Clear distinction between protocol encryption and NeuroDeck device trust

Any weakened compatibility mode must be disabled by default and visibly labeled.

---

# 14. Send Flow

Sources:

- File Manager
- Share Sheet
- Clipboard
- Screenshots
- Voice Notes
- Workspace exports
- Workflow outputs
- Diagnostic bundles
- Browser downloads

Preflight:

- Verify sources and read access
- Resolve symlink policy
- Reject unsafe special files
- Calculate size and item count incrementally
- Check peer capabilities
- Warn for huge trees
- Detect unstable removable media
- Build safe manifest
- Remain cancellable

Review shows peer, trust, items, total size, compression, interface, protocol, encryption, conflict behavior, and send/cancel actions.

---

# 15. Receive Flow

```text
Validate request
→ evaluate peer policy
→ validate manifest
→ user approval
→ reserve staging/storage
→ receive stream
→ verify
→ safety hooks
→ conflict resolution
→ atomic destination commit
→ history/notification
```

Approval screen shows sender, trust, platform, filenames, count, size, destination, free space, conflicts, warnings, accept once, change destination, reject, and block.

Auto-accept is allowed only with secure mode, trusted unchanged identity, approved network, destination rule, quotas, allowed types, explicit user policy, and audit availability.

---

# 16. Destination Sandbox

Default:

```text
~/Downloads/NeuroDeck LAN Share
```

Isolation preference:

1. Landlock
2. Bubblewrap
3. Flatpak constraints/portals
4. Restricted service path
5. Legacy degraded mode with persistent warning

Block:

- Path traversal
- Absolute paths
- Null bytes
- Unicode collisions
- Reserved names
- Symlink/hard-link escape
- Device files, sockets, FIFOs
- Executable auto-launch
- Archive traversal
- Writes outside destination

Never auto-extract archives.

---

# 17. Staging, Integrity, and Commit

Receive into isolated staging.

For every item:

1. Allocate safe temp path.
2. Stream with bounded memory and backpressure.
3. Verify declared size.
4. Verify compatible checksum when available.
5. Add local integrity hash if useful.
6. Apply policy.
7. Resolve conflicts.
8. Atomically rename or safely copy.
9. Clean partial state.
10. Keep quarantined evidence only by policy.

Never expose half-written files in the final destination.

---

# 18. Conflict Handling

Policies:

```text
ask
keep-both
replace
skip
replace-if-newer
```

Show existing/incoming name, type, size, modified time, preview, and recovery.

Default must not silently replace.

Use temp files and atomic rename where supported.

---

# 19. Cross-Platform Metadata

Linux-to-Linux may preserve safe modified times, executable bit, basic mode, and empty directories.

Never preserve ownership, setuid/setgid, device nodes, unsafe ACLs, or arbitrary xattrs.

Windows handling must sanitize reserved names, separators, case collisions, and unsupported POSIX metadata.

Android handling must not assume exact directory metadata preservation.

---

# 20. Large Files, Resume, and Queueing

Support multi-gigabyte files, thousands of items, deep trees, slow Wi-Fi, low battery, and low storage.

Requirements:

- 64-bit sizes
- Streaming
- Backpressure
- Bounded file handles
- Incremental manifests
- Persistent job state
- Safe cleanup
- Peer disconnect handling
- Source-change detection
- No whole-file buffers
- Throttled renderer progress

Do not call a restart “resume.”

Implement NDX enhanced resume only when both NeuroDeck peers explicitly negotiate it. Generic compatible peers use safe restart when protocol resume is unavailable.

Transfer states:

```text
draft
preflighting
waiting-for-peer
waiting-for-approval
queued
negotiating
transferring
verifying
waiting-for-conflict
committing
completed
rejected
cancelled
failed
quarantined
```

Bound concurrency globally and per peer.

---

# 21. Compression

Modes:

```text
auto
off
compatible
```

Auto considers file type, CPU, battery, thermal state, network speed, peer support, and size.

Do not compress already compressed media needlessly.

NDX-only compression must be separately negotiated and never sent to generic peers.

---

# 22. Network Interfaces and VPN

Show interface name, IP, type, default route, multicast support, VPN state, and trust profile.

Modes:

```text
automatic
specific interface
Wi-Fi only
Ethernet only
allow hotspot
advanced multi-interface
```

VPN rules:

- Detect active VPN routes.
- Never disable VPN.
- Explain LAN blocking.
- Allow physical-interface binding.
- Warn when manual targets route over VPN/nonlocal interfaces.
- Rediscover after route changes.

Default local boundary includes private/link-local ranges and same-subnet peers. No WAN exposure.

---

# 23. Firewall Assistant

Detect port-bind and reachability problems.

Show transfer, auth, mDNS, and legacy compatibility ports.

May:

- Inspect listeners
- Run loopback and peer tests
- Show exact remediation
- Apply supported rules only with approval
- Back up NeuroDeck-created rules
- Remove only NeuroDeck-created rules

Never disable the firewall wholesale.

Respect immutable SteamOS. If automatic changes are unavailable, provide accurate JPE steps.

---

# 24. Background, Suspend, and Resource Policy

Modes:

```text
screen-only
NeuroDeck session
user login
```

Auto-start requires secure mode.

Implement systemd user service where appropriate, with Electron-managed fallback.

Before suspend, persist state, stop new work, flush staging metadata, secure secrets, and mark sessions interrupted.

After resume, refresh interfaces, rebind, reannounce, revalidate network, and report Restart versus Resume honestly.

Resource Governor integration:

- Battery threshold
- Thermal concurrency reduction
- Compression disable under heat
- Game Priority bandwidth limit
- Background pause
- Foreground transfer priority

Always show when policy throttles a job.

---

# 25. Platform Integrations

Reuse the shared Transfer Center for all job progress.

Integrate:

- Activity Center
- Notification Center
- Quick Access
- Universal Search
- Command Palette
- File Manager
- Share Sheet
- Clipboard Center
- Screenshot Center
- Voice Notes
- Workspace exports
- Workflow Forge
- Help Hub
- Platform Health

Do not create duplicate transfer or notification subsystems.

Workflow nodes:

```text
Send Files
Send Workspace Export
Wait for Trusted Device
Device Online
Transfer Completed
Transfer Failed
Incoming Approved
Receive into Workspace
```

Automation must obey permissions, stable trust IDs, path exclusions, and explicit external-transfer approval.

---

# 26. Typed IPC and RPC

IPC domains:

```text
lanShare.capabilities
lanShare.service
lanShare.identity
lanShare.interfaces
lanShare.discovery
lanShare.peers
lanShare.trust
lanShare.groups
lanShare.send
lanShare.receive
lanShare.transfers
lanShare.history
lanShare.settings
lanShare.firewall
lanShare.diagnostics
lanShare.events
```

Expose typed operations for service state, interfaces, scanning, peers, manual connection, send drafts, preflight, submit, incoming approval/rejection, transfer list/detail/cancel/retry, trust, settings, diagnostics, and event subscription.

IPC carries IDs, safe file references, metadata, progress, events, errors, and approvals.

IPC must never carry file bytes, group-code plaintext, private keys, unbounded logs, or arbitrary raw remote protocol objects.

---

# 27. Persistence

Store:

```text
lan_share_settings
lan_share_identity
lan_share_manual_peers
lan_share_peer_observations
lan_share_trusted_peers
lan_share_blocked_peers
lan_share_transfer_jobs
lan_share_transfer_items
lan_share_events
lan_share_destination_rules
lan_share_group_profiles
lan_share_diagnostics
```

Do not store group-code plaintext in SQLite.

Use bigint-safe serialization for sizes.

---

# 28. Events and Errors

Throttle progress events to roughly 4–10 Hz.

Events include service, interface, peer, incoming, transfer, firewall, and storage state changes.

Error codes include:

```text
LAN_SERVICE_UNAVAILABLE
LAN_BIND_FAILED
LAN_PORT_IN_USE
LAN_INTERFACE_UNAVAILABLE
LAN_MDNS_UNAVAILABLE
LAN_DISCOVERY_TIMEOUT
LAN_PEER_OFFLINE
LAN_GROUP_MISMATCH
LAN_AUTH_FAILED
LAN_FINGERPRINT_CHANGED
LAN_PROTOCOL_INCOMPATIBLE
LAN_TRANSFER_REJECTED
LAN_TRANSFER_INTERRUPTED
LAN_LENGTH_MISMATCH
LAN_INTEGRITY_FAILED
LAN_DESTINATION_DENIED
LAN_PATH_UNSAFE
LAN_STORAGE_INSUFFICIENT
LAN_CONFLICT
LAN_FILE_CHANGED_DURING_SEND
LAN_FIREWALL_BLOCKED
LAN_VPN_ROUTE_BLOCKED
LAN_ISOLATION_DEGRADED
```

Every error needs a plain-language message, retryability, peer/item, recovery, and correlation ID.

---

# 29. Quarantine and Privacy

Optional safety hooks:

- MIME inspection
- Executable warning
- Double-extension warning
- Archive-bomb checks
- Antivirus extension
- User forbidden patterns

Never claim malware scanning unless a real scanner is configured.

LAN Share must not contact internet services for normal operation, upload filenames to AI, advertise on unselected interfaces, or retain rejected manifests indefinitely.

Privacy settings cover identity, visibility, interface, discovery, history, filename logging, trust retention, and notification previews.

---

# 30. Diagnostics and First Run

Diagnostics must test:

- Service
- Sockets
- Interface/IP/subnet
- mDNS/multicast
- Ports
- Firewall
- VPN route
- destination write/free space
- Landlock/Bubblewrap
- peer probe
- v1/v2 registration
- compression
- protocol version

Output pass/warning/fail/unsupported with real remediation. Never report fixed until retested.

First run:

1. Explain LAN-only behavior.
2. Configure device name.
3. Detect/select interface.
4. Configure unique group code.
5. Select receive directory.
6. Test access and free space.
7. Detect isolation.
8. Choose approval policy.
9. Choose background policy.
10. Scan.
11. Offer a safe test transfer.

---

# 31. Performance and Accessibility

Targets:

- Warm service start near 1 second where practical
- Cached route under 300 ms
- Stream discovery results immediately
- 4–10 Hz progress UI
- Bounded renderer memory
- Near-zero idle CPU except discovery heartbeat
- Adaptive timers

Accessibility:

- Screen-reader incoming announcements
- Bounded progress announcements
- Status beyond color
- Large text
- High contrast
- Reduced motion
- Haptic controls
- No timer-only decision
- Focus restoration
- Internationalized units/times

---

# 32. SteamOS Packaging

Package as a user-level service or verified sidecar.

Requirements:

- No root for normal use
- Immutable SteamOS compatible
- Signed/checksummed artifact
- Version shown
- Correct architecture
- Clean uninstall
- No orphaned listener
- User-controlled history retention
- AppImage/Flatpak handling

For Flatpak, review network and filesystem permissions, use portals where possible, and never request full home write access without justification.

---

# 33. Threat Model

Address:

```text
rogue peer
spoofed discovery
name collision
group-code guessing
replay
MITM
malformed protobuf
oversized messages
connection floods
slow-loris
untrusted network
path traversal
symlink escape
overwrite attacks
Unicode collisions
special files
disk/inode exhaustion
archive bombs
partial exposure
renderer compromise
IPC spoofing
event flooding
secret leakage
log injection
workflow exfiltration
AI prompt injection from filenames/text
unsafe auto-accept
```

Create:

```text
docs/security/LAN_SHARE_THREAT_MODEL.md
```

---

# 34. Interoperability Matrix

Test exact versions of:

- Linux Mint Warpinator
- Flathub Warpinator
- A Windows compatible client on Windows 10/11
- Current Android F-Droid compatible app
- Steam Deck LCD
- Steam Deck OLED
- NeuroDeck-to-NeuroDeck

Scenarios:

- Wi-Fi
- Ethernet dock
- hotspot
- VPN LAN blocked/allowed
- suspend/resume
- low battery
- full storage
- removable source/destination
- Game Mode/Desktop Mode
- empty/small/large files
- thousands of files
- deep directories
- Unicode
- case collisions
- conflicts
- source changed
- peer disconnect
- interface change
- service crash
- cancellation
- compression
- parallel jobs
- group mismatch
- manual connection
- v1/v2 registration

Record evidence. Do not overclaim compatibility.

---

# 35. Testing

Unit tests:

- Interface policy
- Discovery parsing
- Deduplication
- v1/v2 negotiation
- Group-code handling
- Trust transitions
- Manifest validation
- Filename/path safety
- Conflict naming
- 64-bit sizes
- Queueing
- Compression choice
- cancellation
- log redaction

Integration tests:

- Discovery
- Manual connect
- Auth
- File/folder/mixed transfers
- Multiple peers
- Cleanup
- Atomic commit
- Service restart
- Persistence
- IPC
- Transfer Center
- Notifications
- Workflow node
- diagnostics
- suspend/resume

Fuzz:

- Protobuf parsing
- Registration
- Manifests
- Filenames
- Path normalization
- Compression corruption
- State machine

Playwright controller E2E:

- First run
- Discovery
- Manual connect
- Send
- Incoming approval/reject/block
- Transfer detail
- Conflict
- low storage
- trust
- settings
- diagnostics
- Quick Access
- recovery

Visual regression at 1280×800, 1280×720, 1920×1080, and 2560×1440 for default, focused, empty, discovery, offline, incoming, active, failed, conflict, secure warning, VPN warning, large text, and high contrast.

---

# 36. Documentation

Create:

```text
docs/features/LAN_SHARE_OVERVIEW.md
docs/features/LAN_SHARE_CONTROLLER_GUIDE.md
docs/features/LAN_SHARE_PROTOCOL_COMPATIBILITY.md
docs/features/LAN_SHARE_TROUBLESHOOTING.md
docs/features/LAN_SHARE_FIREWALL.md
docs/features/LAN_SHARE_STEAMOS_PACKAGING.md
docs/security/LAN_SHARE_THREAT_MODEL.md
docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md
docs/testing/LAN_SHARE_INTEROP_MATRIX.md
docs/implementation/LAN_SHARE_IMPLEMENTATION_LEDGER.md
```

Include a warning against fake download sources.

---

# 37. Implementation Phases

```text
LAN-0  audit, upstream protocol study, licensing
LAN-1  schemas, IPC/RPC, settings, data model, errors
LAN-2  service lifecycle, interfaces, sockets, health
LAN-3  mDNS, manual connect, registration v1/v2
LAN-4  auth, group code, trust, rate limits
LAN-5  send engine, manifests, queue, compression
LAN-6  receive, staging, isolation, conflicts, commit
LAN-7  all ND-LAN controller-native screens
LAN-8  platform integrations
LAN-9  SteamOS, VPN, firewall, suspend, resource policy
LAN-10 interoperability, fuzzing, security review
LAN-11 packaging, SBOM, documentation, release gates
```

---

# 38. Acceptance Gates

Do not declare complete until:

- v1 and v2 registration pass.
- mDNS and manual connect pass.
- Compatible auth passes.
- File, folder, and mixed transfers pass.
- Compression negotiation passes.
- Secure group setup works.
- Secrets remain outside renderer/logs.
- Incoming approval and trust work.
- Fingerprint changes are handled when identity supports them.
- Destination sandbox, traversal, and symlink tests pass.
- Partial files remain staged.
- WAN exposure is blocked by default.
- Every ND-LAN view is controller complete.
- File Manager, Share Sheet, Transfer Center, Activity, notifications, workflows, and Quick Access use real jobs.
- Linux, Windows, Android, and NeuroDeck versions are recorded.
- Type checks, Rust checks, lint, tests, build, and Steam Deck packaging pass.
- No production mocks remain.
- No high/critical security issue remains.
- License and SBOM documentation are complete.

---

# 39. Final Report

Provide:

1. Executive summary
2. Architecture
3. Protocol compatibility matrix
4. License/compliance summary
5. Screen matrix
6. Controller matrix
7. IPC/RPC inventory
8. Security report
9. Isolation/path-safety report
10. Large-file/performance report
11. Steam Deck results
12. Windows results
13. Android results
14. VPN/firewall results
15. Suspend/resume results
16. Test commands and counts
17. Package artifacts
18. Known limitations
19. File-change summary

---

# FINAL AGENT DIRECTIVE

Audit first. Choose a compliant protocol strategy. Build the isolated service. Implement discovery, v1/v2 registration, authentication, trust, sending, receiving, staging, isolation, integrity, conflicts, queueing, and diagnostics. Build every controller-native screen. Integrate the existing NeuroDeck platform services. Test real peers and hostile edge cases. Package for immutable SteamOS. Report evidence honestly.

Do not disguise an external desktop application as a built-in feature.

Do not weaken security to force compatibility.

Deliver LAN Share as a real NeuroDeckOS subsystem.
