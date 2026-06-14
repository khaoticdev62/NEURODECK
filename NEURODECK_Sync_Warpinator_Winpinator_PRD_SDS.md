# NEURODECK Sync — Warpinator/Winpinator Feature Setup PRD + SDS

**Document status:** Production implementation blueprint  
**Target app:** NEURODECK Electron + React + TypeScript + Tailwind  
**Target hardware:** Steam Deck LCD first, Steam Deck OLED/docked desktop second, Windows/Linux desktop compatible  
**Feature name:** NEURODECK Sync  
**Protocol compatibility target:** Linux Mint Warpinator + Windows Winpinator-compatible clients  
**Core principle:** No mocked transfers, no fake device discovery, no placeholder network state, no arbitrary file-size caps.

---

## 0. Executive Summary

NEURODECK Sync is a production-grade cross-device file transfer feature for NEURODECK that provides Warpinator/Winpinator-compatible LAN transfers, controller-first Steam Deck UX, secure profile-based pairing, VPN-aware networking, transfer resume/retry behavior, and support for all practical file and folder sizes allowed by the source/destination filesystem and available storage.

The feature should not be implemented as a fragile UI wrapper around an external app. It should be built as a first-class NEURODECK module with a dedicated transfer engine, an Electron-safe IPC bridge, persistent transfer profiles, profile-scoped security rules, and optional compatibility adapters for installed Warpinator/Winpinator clients.

The recommended architecture is:

1. **Renderer UI:** React + TypeScript + Tailwind feature views.
2. **Electron main process:** Validated IPC broker, app lifecycle, profile loading, OS integration.
3. **Transfer engine sidecar:** Rust preferred for performance and memory safety. Node TypeScript fallback acceptable only if streaming/backpressure is proven under large transfer tests.
4. **Protocol layer:** mDNS/DNS-SD discovery, gRPC/protobuf service compatibility, libsodium/OpenSSL-compatible key handling, zlib/deflate compression negotiation where supported.
5. **Security layer:** Group-code pairing, allowlisted peers, isolated incoming folder, symlink/path traversal defense, hash validation, safe profile storage, quarantine/scan hooks, permission gating.
6. **Network layer:** LAN auto-connect, VPN interface support, manual peer profiles for WAN/VPN, strict “no public internet exposure by default.”

---

## 1. Product Requirements Document

### 1.1 Problem Statement

Steam Deck users often need to move ROMs, documents, model files, screenshots, config exports, save backups, project folders, AI model assets, and media between desktop PCs and the Deck without juggling USB drives, cloud sync, SSH, or sketchy one-off transfer tools. Warpinator solves a piece of this on LAN, and Winpinator brings compatibility to Windows, but NEURODECK needs a native-feeling, controller-first, secure, profile-driven transfer experience that behaves like part of the app rather than an external chore.

### 1.2 Product Goals

- Provide a polished in-app file transfer experience inside NEURODECK.
- Support Warpinator/Winpinator-compatible discovery and transfer workflows.
- Work on Steam Deck Game Mode and Desktop Mode.
- Auto-detect trusted peers on LAN.
- Support VPN/mesh networks through explicit profiles and network interface selection.
- Save transfer profiles for trusted devices, preferred directories, ports, group codes, and behavior rules.
- Support small, medium, large, and massive transfers without loading full files into memory.
- Support directories, nested folders, mixed file sets, and large file counts.
- Protect users from malicious transfer paths, symlinks, overwrite attacks, and accidental exposure.
- Provide controller-first navigation with zero required touchscreen use.
- Avoid mocked networking, fake progress, placeholder peers, or simulated transfer success.

### 1.3 Non-Goals

- NEURODECK Sync is not a cloud drive replacement.
- NEURODECK Sync does not expose public internet file sharing by default.
- NEURODECK Sync does not bypass VPN/firewall policies.
- NEURODECK Sync does not ship with hardcoded group codes.
- NEURODECK Sync does not silently accept untrusted incoming files.
- NEURODECK Sync does not require users to install Warpinator/Winpinator if the built-in engine is enabled.
- NEURODECK Sync does not promise unlimited transfer size beyond filesystem, disk, OS, network, and power constraints.

### 1.4 User Personas

#### Steam Deck Power User
Needs to move game saves, ROMs, screenshots, Decky plugin data, installers, AppImages, and project files between a Windows PC and Steam Deck.

#### Indie Developer / AI Dev
Needs to transfer code folders, model files, logs, exports, generated images, docs, and app packages between desktop and handheld workflows.

#### IT/SOC Learner
Needs to move lab reports, packet captures, scripts, VM configs, notes, and training assets between devices without cloud exposure.

#### Desktop User
Needs quick Windows/Linux LAN transfer without learning SCP, SMB, NFS, or SSH config.

---

## 2. Feature Scope

### 2.1 Core Features

| Feature | Requirement |
|---|---|
| LAN discovery | Discover Warpinator/Winpinator-compatible peers using mDNS/DNS-SD when available. |
| Manual peer connect | Allow hostname/IP + port connection when discovery fails or over VPN. |
| Secure group profiles | Save group code, device alias, interface, ports, folders, and permissions per profile. |
| Send files | Send files from file picker, recent paths, drag/drop in desktop mode, and controller file browser. |
| Send folders | Send nested directories with structure preserved. |
| Receive files | User-approved receive flow by default, auto-accept only for trusted profiles. |
| Transfer queue | Queue, pause, resume, cancel, retry, reorder, clear completed. |
| Transfer history | Local searchable history with file path, peer, time, size, status, hash result, and errors. |
| Large transfer handling | Stream/chunk transfers with backpressure and no whole-file memory loading. |
| Compression | Support deflate/zlib compression negotiation when peer supports it. |
| VPN profiles | Manual/static peers, VPN interface selection, VPN-only allowlist mode. |
| Notifications | In-app toasts, system notifications, Game Mode-friendly overlay status. |
| Controller support | Full navigation and actions through Steam Deck controls. |
| Diagnostics | Port check, mDNS status, firewall hints, interface selector, protocol compatibility report. |
| Security scan hooks | Optional post-receive scan command or OS AV integration hook. |
| Profile export/import | Encrypted local profile backup/export with redaction option. |

### 2.2 Transfer Size Support

The application must not impose arbitrary app-level transfer size caps. Support is bounded by available disk, filesystem limits, OS limits, network stability, power state, and peer compatibility.

| Size Class | Examples | Required Behavior |
|---|---|---|
| Tiny | <1 MB screenshots/configs | Instant queue, hash, history. |
| Small | 1 MB–100 MB docs/assets | Normal streaming with progress. |
| Medium | 100 MB–4 GB videos/zips | Chunked streaming, speed estimate, retry. |
| Large | 4 GB–100 GB models/backups | 64-bit file offsets, no memory buffering of full file, resume metadata. |
| Massive | 100 GB+ folders/model packs | Queue segmentation, disk preflight, power warning, resume/retry. |
| Huge folder trees | 10k–250k files | Manifest pre-scan, folder graph, path sanitization, progress by bytes + file count. |

Acceptance requirement: a 10 GB file, a 100 GB folder tree, and a 100k-file mixed directory must complete without renderer freezing, memory spikes, fake progress, or corrupt output.

---

## 3. Dependencies Needed

### 3.1 Runtime Dependencies

#### Electron App Layer

- Electron current stable major version.
- React.
- TypeScript.
- Tailwind CSS.
- Vite or equivalent Electron build pipeline.
- Zustand/Jotai/Redux Toolkit for feature state.
- TanStack Query optional for async status/cache, but not required.
- Zod for IPC payload validation.
- electron-log or pino for structured logs.
- electron-store or SQLite-backed config, with secrets stored separately.
- Native OS secure storage via Electron safeStorage, keytar, or platform keychain where available.

#### Transfer Engine — Preferred Rust Sidecar

- Rust stable toolchain.
- tonic for gRPC.
- prost/prost-build for protobuf generation.
- tokio for async runtime.
- mdns-sd or equivalent for mDNS/DNS-SD discovery.
- sodiumoxide/libsodium-compatible crate or audited crypto binding.
- openssl/rustls depending on protocol compatibility needs.
- flate2 for deflate/zlib compression.
- sha2/blake3 for local integrity hashing; protocol compatibility determines peer-visible hash algorithm.
- notify for filesystem event watching if watch-folder mode is added.
- rusqlite/sqlx for engine-level transfer DB if not centralized in main process.
- serde/serde_json for message serialization to Electron.

#### Transfer Engine — Node/TypeScript Fallback

Only use this path if Rust sidecar is deferred and large-transfer tests pass.

- @grpc/grpc-js.
- @grpc/proto-loader or protobufjs.
- bonjour-service or multicast-dns for mDNS/DNS-SD.
- libsodium-wrappers-sumo.
- node-forge or OpenSSL CLI binding only if compatibility demands it.
- zlib built-in Node module.
- fs streams with pipeline/backpressure.
- better-sqlite3 or sqlite3.
- chokidar optional for watch-folder mode.

#### Linux/SteamOS System Dependencies

- Avahi/mDNS stack availability.
- Firewall rules allowing selected transfer/authentication ports.
- Landlock support when kernel and runtime allow it.
- bubblewrap fallback for folder isolation if Landlock is not available and packaging permits it.
- xdg-desktop-portal for file dialogs when sandboxed.
- Flatpak permissions if distributed as Flatpak.

#### Windows System Dependencies

- Windows firewall rule creation/repair helper.
- Bonjour/mDNS compatibility or bundled mDNS library.
- Windows notifications.
- Windows Defender scan hook optional.
- NTFS alternate data stream zone identifier support optional.
- NSIS/MSIX installer firewall prompt handling.

#### Packaging Dependencies

- electron-builder or Electron Forge.
- Code signing for Windows release builds.
- AppImage and/or Flatpak for Steam Deck/Desktop Linux.
- Steam Deck launcher script.
- Optional systemd user service only if background receive mode is enabled outside active app lifecycle.

### 3.2 Ports and Network Defaults

Default compatibility ports should match Warpinator conventions unless the user changes them:

- Transfer port: **42000/TCP**.
- Authentication/registration port: **42001/TCP**.
- UDP on transfer port only for legacy compatibility if explicitly enabled.
- mDNS service discovery on local network.

All ports must be profile-configurable.

---

## 4. Screens, Tabs, Options, and Screen Frames

### 4.1 Navigation Placement

Add **Sync** as a first-class NEURODECK feature area.

Recommended navigation:

- Workspace
- Models
- Agents
- Memory
- Sessions
- **Sync**
- Settings

### 4.2 Sync Screen Tabs

#### Tab 1 — Dashboard

Purpose: Fast transfer control center.

Frame:

```text
┌────────────────────────────────────────────────────────────┐
│ NEURODECK SYNC                         LAN ● VPN ○ SECURE ● │
├───────────────────────────────┬────────────────────────────┤
│ TRUSTED DEVICES               │ ACTIVE TRANSFERS           │
│                               │                            │
│ [PC-KHAOTIC]  Online  5ms     │ Sending model.gguf  42%    │
│ [SteamDeck-OLED] Offline      │ Receiving screenshots 88%  │
│ [Lab-Laptop] VPN  34ms        │                            │
│                               │                            │
├───────────────────────────────┴────────────────────────────┤
│ A Send  B Back  X Receive Inbox  Y Profiles  ☰ Diagnostics │
└────────────────────────────────────────────────────────────┘
```

Key actions:

- Send file/folder.
- Receive inbox.
- Quick connect.
- Recent transfer retry.
- Toggle LAN/VPN filter.
- Open diagnostics.

#### Tab 2 — Devices

Purpose: Peer discovery and trust management.

Frame:

```text
┌────────────────────────────────────────────────────────────┐
│ DEVICES                Interface: wlan0  Group: ********    │
├───────────────────────────────┬────────────────────────────┤
│ DISCOVERED                    │ DEVICE DETAILS             │
│                               │                            │
│ ● DESKTOP-7F2  Winpinator     │ Name: DESKTOP-7F2          │
│ ● mintbox      Warpinator     │ IP: 192.168.1.44           │
│ ○ phone        Android port   │ Protocol: v2               │
│                               │ Trust: Pending             │
│                               │ Actions: Trust / Block     │
└────────────────────────────────────────────────────────────┘
```

Required device states:

- Discovered.
- Pending trust.
- Trusted.
- Blocked.
- Offline.
- VPN peer.
- Port mismatch.
- Group code mismatch.
- Protocol incompatible.

#### Tab 3 — Send

Purpose: File/folder send flow.

Frame:

```text
┌────────────────────────────────────────────────────────────┐
│ SEND FILES                                                 │
├───────────────────────────────┬────────────────────────────┤
│ SOURCE                        │ DESTINATION                │
│ /home/deck/Downloads          │ PC-KHAOTIC                 │
│                               │ Save mode: Ask Receiver    │
│ [ ] model.gguf       6.8 GB   │ Compression: Auto          │
│ [ ] screenshots.zip  1.2 GB   │ Integrity: Hash + Verify   │
│ [ ] project-folder   14.1 GB  │                            │
├───────────────────────────────┴────────────────────────────┤
│ A Queue  X Select All  Y Pick Folder  R1 Recent  L1 Back    │
└────────────────────────────────────────────────────────────┘
```

Required options:

- Send file.
- Send folder.
- Send mixed selection.
- Recent paths.
- Favorite paths.
- Validate free space where peer supports it.
- Optional compression.
- Optional overwrite behavior.
- Optional delete-after-send disabled by default.

#### Tab 4 — Receive Inbox

Purpose: Incoming transfer review and destination control.

Frame:

```text
┌────────────────────────────────────────────────────────────┐
│ RECEIVE INBOX                             2 Pending         │
├───────────────────────────────┬────────────────────────────┤
│ INCOMING REQUESTS             │ REVIEW                     │
│                               │                            │
│ From PC-KHAOTIC               │ Files: 84                  │
│ 14.3 GB project-folder        │ Destination: ~/Transfers   │
│                               │ Risk: Normal               │
│ From Lab-Laptop               │ Symlink found: Blocked     │
│ 42 MB reports.zip             │                            │
├───────────────────────────────┴────────────────────────────┤
│ A Accept  B Reject  X Change Folder  Y Trust Rule           │
└────────────────────────────────────────────────────────────┘
```

Required controls:

- Accept/reject.
- Preview manifest.
- Change destination.
- Auto-accept rule creation.
- Block peer.
- Quarantine mode.
- Overwrite policy.

#### Tab 5 — Queue

Purpose: Manage transfer jobs.

Required controls:

- Pause/resume.
- Cancel.
- Retry.
- Reorder.
- Clear completed.
- View logs.
- Open destination.
- Copy error details.
- Resume eligible marker.

#### Tab 6 — Profiles

Purpose: Save network/device profiles.

Profile fields:

- Profile name.
- Group code reference, secret stored securely.
- Discovery mode: LAN mDNS, manual IP, VPN-only, hybrid.
- Network interface binding.
- Ports.
- Trusted peer IDs.
- Default incoming folder.
- Default outgoing folder.
- Auto-accept policy.
- Compression policy.
- Transfer limits.
- Notification policy.
- Firewall mode.
- VPN provider notes.

#### Tab 7 — VPN/WAN

Purpose: Handle transfers beyond simple LAN.

Required controls:

- VPN interface selector.
- Manual peer list.
- Mesh VPN mode.
- Direct IP/hostname connect.
- Connection test.
- mDNS relay disabled by default.
- Public IP warning.
- Strict VPN-only mode.
- Allowlist profiles.

Important rule: WAN support must mean **VPN/mesh/manual trusted peer profiles**, not public unauthenticated exposure.

#### Tab 8 — Diagnostics

Purpose: Fix real connection problems.

Diagnostics checks:

- mDNS service status.
- Detected network interfaces.
- Current IP/subnet per interface.
- Port availability.
- Firewall status.
- Group code status.
- Secure mode status.
- Peer protocol version.
- Transfer engine status.
- Disk free space.
- Folder isolation status.
- VPN route detection.
- Logs export.

#### Tab 9 — Settings

Settings groups:

- General.
- Security.
- Profiles.
- Transfer behavior.
- Notifications.
- Controller shortcuts.
- Advanced networking.
- Compatibility.
- Data retention.
- Developer diagnostics.

---

## 5. Controller Support

### 5.1 Design Rules

- Every Sync function must be reachable without touching the screen.
- No critical action deeper than three controller actions from Dashboard.
- Destructive actions require hold-confirm or two-step confirmation.
- Text entry must support controller keyboard, QR pairing, paste, and profile import.
- Progress and device status must be readable at 1280x800 from handheld distance.

### 5.2 Steam Deck Mapping

| Control | Action |
|---|---|
| D-pad / Left Stick | Move focus. |
| A | Select / accept / confirm. |
| B | Back / reject / cancel modal. |
| X | Contextual secondary action: select, receive inbox, pause/resume. |
| Y | Profiles / trust rule / advanced action. |
| L1/R1 | Switch tabs. |
| L2/R2 | Scroll list or scrub queue. |
| Menu | Diagnostics / details panel. |
| View | Global Sync dashboard overlay. |
| L4 | Toggle LAN/VPN filter. |
| R4 | Quick retry failed transfer. |
| L5 | Save profile/trust rule. |
| R5 | New transfer. |
| Steam + X | Text entry keyboard fallback. |

### 5.3 Focus Graph Requirements

- Focus order must be deterministic.
- Transfers list and device list must wrap vertically.
- Tab navigation must preserve focus memory per tab.
- Modal focus must trap inside modal until dismissed.
- Background transfers must remain controllable through overlay.

---

## 6. Security Architecture

### 6.1 Security Goals

- Prevent untrusted peers from pushing files silently.
- Prevent path traversal and symlink escape from incoming folder.
- Prevent remote content from reaching Electron privileged APIs.
- Protect group codes, trust tokens, profile secrets, and transfer history.
- Avoid opening public inbound transfer services by default.
- Provide clear user control over auto-accept and trusted peers.
- Maintain audit logs without leaking secrets.

### 6.2 Electron Security Rules

- Renderer must run with `nodeIntegration: false`.
- Renderer must use `contextIsolation: true`.
- Renderer must use sandboxing where possible.
- Renderer must not directly access filesystem, network sockets, crypto keys, or OS shell.
- Preload must expose narrow, typed, validated APIs only.
- IPC calls must validate sender frame, payload schema, and permission scope.
- No raw `ipcRenderer.send` exposure through contextBridge.
- No remote code loading for Sync UI.
- Strict CSP: `default-src 'self'; script-src 'self'; connect-src 'self' neurodeck-sync://localhost` adjusted only as required.
- External links must open through validated allowlist.

### 6.3 Transfer Security Rules

#### Pairing and Trust

- Use unique group code during setup.
- Never ship default group code as active secure profile.
- Require user confirmation before trusting first-time peer.
- Show peer name, IP, fingerprint/key identity, and protocol version.
- Allow trust revocation.
- Maintain blocked peer list.
- Auto-accept only available for trusted peers and explicit folders.

#### Incoming Folder Isolation

- Incoming files must land in a dedicated folder by default:
  - Linux/SteamOS: `~/Downloads/NEURODECK Sync/Incoming` or user-selected folder.
  - Windows: `%USERPROFILE%\Downloads\NEURODECK Sync\Incoming`.
- Path traversal entries are rejected.
- Absolute paths from sender are rejected.
- Parent directory escape `../` is rejected.
- Symlinks/hardlinks/device nodes are blocked or flattened depending on policy.
- Executable files are flagged with warning.
- Optional quarantine mode stores files in pending review state before release.

#### Integrity

- Generate local manifest before send.
- Validate file count and byte count after receive.
- Hash large files incrementally.
- Record transfer integrity result in history.
- Retry corrupted chunks when protocol supports it; otherwise mark failed and require retry.

#### Privacy

- Hide group codes by default.
- Store secrets in OS secure storage.
- Redact secrets from logs.
- Transfer history retention configurable.
- Private mode disables history path storage.

#### Firewall

- Ask before creating inbound firewall rules.
- Display exact ports and interfaces.
- Provide one-click repair where platform allows.
- Never silently open broad inbound rules across all networks without profile approval.

### 6.4 Threat Model

| Threat | Mitigation |
|---|---|
| Rogue device on LAN | Unique group code, trust confirmation, blocklist, no auto-accept by default. |
| Path traversal archive/folder | Manifest sanitizer, destination jail, canonical path checks. |
| Symlink attack | Reject symlink/hardlink/device node entries by default. |
| Electron RCE through renderer | Context isolation, no Node in renderer, strict IPC contracts, CSP. |
| Public internet exposure | WAN disabled by default except VPN/manual profile, warnings, interface binding. |
| Malicious executable transfer | File-type warning, quarantine, AV/scan hook. |
| Transfer corruption | Streaming hashes, manifest validation, retry/resume. |
| Secret leakage | OS keychain/safeStorage, log redaction, encrypted exports. |
| mDNS spoofing | Peer fingerprint verification and trust-on-first-use warning. |
| Disk exhaustion | Preflight free space check, quota per profile, pause on low disk. |

---

## 7. Auto-Connection on LAN/WAN Connect

### 7.1 Auto-Connect Requirements

Auto-connect must be profile-scoped and never blindly trust new peers.

#### LAN Auto-Connect

- Listen for network interface changes.
- On LAN connect, scan selected interface using mDNS/DNS-SD.
- Match discovered peers against trusted profile IDs and group code.
- Reconnect active trusted peers automatically.
- Show pending discovered peers but do not auto-trust.
- Start receive listener only if profile allows it.

#### VPN/WAN Auto-Connect

- Detect VPN interface availability.
- Match active interface against profile VPN rules.
- Try manual trusted peers by hostname/IP.
- Do not rely solely on mDNS over VPN.
- Allow explicit mesh VPN mode for Tailscale/ZeroTier/WireGuard/OpenVPN-style interfaces.
- Block public interface auto-listening unless advanced override is enabled.

### 7.2 Auto-Connect State Machine

```text
App Start
  ↓
Load Profiles
  ↓
Detect Interfaces
  ↓
Profile Match?
  ├─ No → Idle / Prompt Setup
  └─ Yes
      ↓
Start Discovery + Manual Peer Probes
      ↓
Trusted Peer Found?
  ├─ No → Watch Network Changes
  └─ Yes
      ↓
Verify Group/Profile/Peer Identity
      ↓
Connect
      ↓
Ready / Background Listener
```

### 7.3 Events

- `network.interface.added`
- `network.interface.removed`
- `network.vpn.detected`
- `network.profile.matched`
- `peer.discovered`
- `peer.trust.pending`
- `peer.connected`
- `peer.rejected`
- `peer.offline`
- `transfer.resume.available`

---

## 8. VPN Support

### 8.1 VPN Modes

| Mode | Behavior |
|---|---|
| Off | LAN only. |
| VPN Manual | User adds peer IP/hostname and selected VPN interface. |
| VPN Mesh | Treats mesh adapter as private LAN-like network; still validates trusted peers. |
| VPN Strict | Only communicates through selected VPN interface. |
| Hybrid | LAN discovery plus manual VPN peers. |

### 8.2 Supported VPN Types

NEURODECK Sync should be VPN-provider agnostic. It should support any VPN that exposes a network interface and permits peer-to-peer traffic.

Profiles should support:

- OpenVPN adapters.
- WireGuard interfaces.
- Tailscale-style mesh adapters.
- ZeroTier-style virtual LAN adapters.
- Corporate VPNs when local peer-to-peer routing is allowed.
- Manual IP/hostname profile when mDNS is blocked.

### 8.3 VPN UX Rules

- Show interface IP and route.
- Warn when selected peer is reachable over public IP instead of VPN IP.
- Warn when mDNS is unavailable over VPN.
- Provide manual connect fields.
- Test ports before transfer.
- Provide “VPN-only lock” to avoid LAN/public fallback.

---

## 9. Profile Saving

### 9.1 Profile Types

- Default LAN Profile.
- Home Windows PC Profile.
- Steam Deck-to-PC Profile.
- Lab VPN Profile.
- Travel Mode Profile.
- Receive-Only Profile.
- Send-Only Profile.
- Locked-Down Secure Profile.

### 9.2 Profile Schema

```json
{
  "id": "profile_uuid",
  "name": "Home PC Sync",
  "mode": "lan|vpn_manual|vpn_mesh|hybrid",
  "enabled": true,
  "groupCodeSecretRef": "os_keychain_ref",
  "network": {
    "preferredInterface": "wlan0",
    "vpnOnly": false,
    "manualPeers": [
      {
        "alias": "PC-KHAOTIC",
        "host": "192.168.1.20",
        "transferPort": 42000,
        "authPort": 42001,
        "trustedFingerprint": "sha256:..."
      }
    ]
  },
  "folders": {
    "incoming": "/home/deck/Downloads/NEURODECK Sync/Incoming",
    "outgoingFavorites": ["/home/deck/Downloads", "/home/deck/Documents"]
  },
  "security": {
    "autoAcceptTrustedPeers": false,
    "allowExecutables": "warn",
    "symlinkPolicy": "block",
    "overwritePolicy": "rename",
    "quarantine": true,
    "scanHook": null
  },
  "transfer": {
    "compression": "auto",
    "maxConcurrentTransfers": 2,
    "chunkSizeBytes": 4194304,
    "resumeEnabled": true,
    "bandwidthLimitBytesPerSecond": null
  },
  "notifications": {
    "system": true,
    "sound": false,
    "overlay": true
  }
}
```

### 9.3 Profile Storage

- Non-secret config stored in SQLite or JSON config with schema versioning.
- Group codes and trust secrets stored in OS secure storage.
- Export requires encryption password or secret redaction.
- Import validates schema version and warns about missing secrets.
- Profiles can be locked behind app-level local PIN if desired.

---

## 10. System Design Specification

### 10.1 Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│ Electron Renderer: React Sync UI                            │
│ Tabs, Queue, Devices, Profiles, Diagnostics                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ Typed contextBridge API
┌───────────────────────────▼─────────────────────────────────┐
│ Electron Preload                                             │
│ Narrow API: sync.listPeers(), sync.send(), sync.pause()       │
└───────────────────────────┬─────────────────────────────────┘
                            │ Validated IPC
┌───────────────────────────▼─────────────────────────────────┐
│ Electron Main Process                                        │
│ IPC broker, permissions, profile manager, lifecycle, logs    │
└───────────────────────────┬─────────────────────────────────┘
                            │ Local sidecar protocol
┌───────────────────────────▼─────────────────────────────────┐
│ NEURODECK Sync Engine                                        │
│ mDNS, gRPC/protobuf, crypto, streams, queue, resume, hashing │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
       LAN/VPN Network                     Local Filesystem
                │                               │
┌───────────────▼──────────────┐      ┌────────▼────────────────┐
│ Warpinator/Winpinator Peers  │      │ Incoming Folder Jail     │
└──────────────────────────────┘      └─────────────────────────┘
```

### 10.2 Module Boundaries

#### Renderer

- Display state only.
- No raw filesystem access.
- No raw socket access.
- No secrets.
- No direct peer connection.
- Uses typed Sync API exposed by preload.

#### Preload

- Exposes narrow API.
- Performs basic payload shape enforcement.
- Never exposes raw IPC primitives.

#### Main Process

- Owns permission checks.
- Owns profile loading.
- Owns secret retrieval orchestration.
- Starts/stops sidecar.
- Receives structured events from sidecar.
- Sends sanitized state to renderer.

#### Sync Engine

- Owns network operations.
- Owns transfer queue execution.
- Owns streaming, hashing, compression.
- Owns discovery.
- Owns protocol compatibility.
- Owns folder safety enforcement with main process policy.

### 10.3 IPC API Contract

Renderer-visible API:

```ts
window.neurodeck.sync = {
  getStatus(): Promise<SyncStatus>;
  listProfiles(): Promise<SyncProfileSummary[]>;
  saveProfile(input: SaveProfileInput): Promise<SyncProfileSummary>;
  listPeers(profileId?: string): Promise<PeerSummary[]>;
  trustPeer(input: TrustPeerInput): Promise<void>;
  blockPeer(peerId: string): Promise<void>;
  sendFiles(input: SendFilesInput): Promise<TransferJobSummary>;
  acceptTransfer(requestId: string, options: AcceptOptions): Promise<void>;
  rejectTransfer(requestId: string): Promise<void>;
  pauseTransfer(jobId: string): Promise<void>;
  resumeTransfer(jobId: string): Promise<void>;
  cancelTransfer(jobId: string): Promise<void>;
  retryTransfer(jobId: string): Promise<void>;
  listTransfers(filter?: TransferFilter): Promise<TransferJobSummary[]>;
  runDiagnostics(profileId?: string): Promise<SyncDiagnosticsReport>;
  onEvent(callback: (event: SyncEvent) => void): Unsubscribe;
}
```

Security rules:

- Every IPC handler validates payload with Zod.
- Every IPC handler verifies source window/session.
- Dangerous actions require permission token generated by main process.
- File picker must return paths from main process dialog, not arbitrary renderer text.
- Advanced manual paths require canonicalization and destination policy validation.

### 10.4 Data Model

#### Tables

`sync_profiles`

- id.
- name.
- mode.
- enabled.
- network_json.
- folders_json.
- security_json.
- transfer_json.
- notifications_json.
- created_at.
- updated_at.
- schema_version.

`sync_peers`

- id.
- profile_id.
- alias.
- host.
- transfer_port.
- auth_port.
- fingerprint.
- trust_state.
- protocol_version.
- last_seen_at.
- blocked_reason.

`sync_transfers`

- id.
- profile_id.
- peer_id.
- direction.
- status.
- total_bytes.
- transferred_bytes.
- total_files.
- transferred_files.
- source_root_redacted.
- destination_root.
- manifest_hash.
- integrity_status.
- error_code.
- created_at.
- completed_at.

`sync_transfer_items`

- id.
- transfer_id.
- relative_path.
- size_bytes.
- hash.
- status.
- error_code.

`sync_events`

- id.
- type.
- severity.
- redacted_message.
- metadata_json.
- created_at.

### 10.5 Transfer Queue Design

- Queue manager runs in sidecar.
- Renderer subscribes to events.
- Main process stores sanitized transfer updates.
- Jobs are durable: if the app restarts, incomplete jobs are discovered and marked resumable/failed depending on peer/protocol support.
- Each file streams in chunks.
- Chunk size defaults to 4 MiB and is configurable per profile.
- Concurrency defaults to 2 transfers.
- Bandwidth limit optional.
- Power/battery warning if massive transfer starts below configurable battery threshold.

### 10.6 Error Codes

| Code | Meaning | User Fix |
|---|---|---|
| `SYNC_PORT_BLOCKED` | Port unavailable/firewall blocked. | Run firewall repair or change port. |
| `SYNC_GROUP_MISMATCH` | Group code mismatch. | Match profile group code on both devices. |
| `SYNC_PEER_UNTRUSTED` | Peer not trusted. | Trust peer manually. |
| `SYNC_DISCOVERY_FAILED` | mDNS failed. | Use manual IP or diagnostics. |
| `SYNC_VPN_ROUTE_MISSING` | VPN interface cannot reach peer. | Verify VPN and route. |
| `SYNC_DISK_FULL` | Destination lacks free space. | Free space or change destination. |
| `SYNC_PATH_BLOCKED` | Unsafe path/symlink detected. | Remove unsafe item or zip manually. |
| `SYNC_HASH_MISMATCH` | Integrity check failed. | Retry transfer. |
| `SYNC_PROTOCOL_UNSUPPORTED` | Peer protocol unsupported. | Use compatibility mode or update peer. |
| `SYNC_PERMISSION_DENIED` | Folder inaccessible. | Pick allowed folder/adjust permissions. |

---

## 11. Compatibility Strategy

### 11.1 Warpinator Compatibility

- Discover Warpinator peers over local subnet.
- Support current protocol version used by Linux Mint Warpinator.
- Support group-code based secure mode.
- Support file/folder transfers.
- Support compression negotiation where peer supports it.
- Honor default ports while allowing user override.

### 11.2 Winpinator Compatibility

- Discover Winpinator peers over mDNS where available.
- Support manual connect when Windows firewall/mDNS blocks discovery.
- Support Windows path behavior, NTFS metadata expectations, and zone identifier optional behavior if implemented.
- Provide Windows firewall troubleshooting guidance.

### 11.3 Fallback Integration

Optional compatibility bridge:

- Detect installed Warpinator/Winpinator.
- Offer “Open External Client” button.
- Do not rely on external app for core NEURODECK Sync functionality.
- Do not fake internal status from external app unless supported by real API/log parsing.

---

## 12. Performance Requirements

### 12.1 Steam Deck Targets

- Renderer remains interactive during transfer.
- Transfer progress updates throttled to avoid UI churn.
- UI update rate: 4–10 updates/sec, not every chunk.
- CPU compression auto-disabled if Deck is thermally constrained.
- Large transfer memory overhead target under 150 MB outside normal Electron baseline.
- No blocking disk pre-scan on renderer thread.
- Background transfer survives tab switches.

### 12.2 Network Performance

- Use streaming with backpressure.
- Detect stall timeout.
- Retry transient network disconnects.
- Allow resume where protocol and peer permit.
- Show actual measured throughput.
- Show ETA with confidence indicator.

---

## 13. QA / Test Plan

### 13.1 Device Matrix

- Steam Deck LCD SteamOS Desktop Mode.
- Steam Deck LCD Game Mode launcher.
- Steam Deck docked 1080p.
- Windows 11 PC with Winpinator-compatible peer.
- Linux Mint VM/physical machine with Warpinator.
- Android Warpinator-compatible client if available.
- VPN mesh scenario.
- OpenVPN/WireGuard manual peer scenario.

### 13.2 Transfer Matrix

- Single 1 KB file.
- Single 100 MB file.
- Single 5 GB file.
- Single 10 GB file.
- Folder with 1k files.
- Folder with 100k files.
- Mixed nested folders.
- Unicode filenames.
- Spaces/special characters.
- Duplicate filenames.
- Existing destination conflicts.
- Low disk failure.
- Network disconnect mid-transfer.
- App restart mid-transfer.
- Suspend/resume on Steam Deck.
- VPN disconnect/reconnect.

### 13.3 Security Tests

- Group mismatch.
- Unknown peer request.
- Blocked peer request.
- Path traversal payload.
- Symlink payload.
- Device node/special file payload on Linux.
- Executable transfer warning.
- Invalid manifest.
- Hash mismatch.
- Renderer IPC fuzz payload.
- Secret redaction in logs.
- Firewall rule verification.

### 13.4 Controller QA

- All tabs reachable with L1/R1.
- All main actions reachable with A/B/X/Y.
- Focus never disappears.
- Modal trap works.
- Long lists scroll with triggers.
- Transfer can be paused/resumed/canceled via controller only.
- Text entry works with Steam keyboard.
- 1280x800 readability passes.

---

## 14. Implementation Epics

### Epic 1 — Protocol Research and Compatibility Baseline

- Extract Warpinator protobuf definitions.
- Document protocol version support.
- Build minimal peer discovery proof with real Warpinator.
- Build minimal transfer proof with real Winpinator-compatible client.
- Confirm ports, authentication flow, group code behavior, and compression negotiation.

Acceptance: NEURODECK dev build can discover and exchange a test file with real peer, not a mock server.

### Epic 2 — Sync Engine Sidecar

- Implement sidecar lifecycle.
- Implement mDNS discovery.
- Implement gRPC/protobuf service.
- Implement group/profile auth.
- Implement send/receive streaming.
- Implement compression.
- Implement queue manager.
- Implement diagnostic reports.

Acceptance: Sidecar passes integration tests against real Warpinator/Winpinator peer.

### Epic 3 — Electron IPC and Security

- Add typed contextBridge API.
- Add Zod validation.
- Add permission model.
- Add secret storage.
- Add log redaction.
- Add event subscription.

Acceptance: Renderer cannot access filesystem/sockets directly and IPC fuzzing cannot trigger unsafe operations.

### Epic 4 — UI Screens

- Sync dashboard.
- Devices tab.
- Send flow.
- Receive inbox.
- Queue.
- Profiles.
- VPN/WAN.
- Diagnostics.
- Settings.

Acceptance: Feature is fully usable on Steam Deck with controller only.

### Epic 5 — Security Hardening

- Folder jail.
- Path sanitizer.
- Symlink blocker.
- Quarantine mode.
- Peer trust store.
- Firewall controls.
- Scan hook.

Acceptance: Security test suite passes malicious path and untrusted peer scenarios.

### Epic 6 — Large Transfer Reliability

- Chunked streaming.
- Resume metadata.
- Preflight disk checks.
- Hash verification.
- Suspend/resume handling.
- Retry logic.

Acceptance: 10 GB file and 100 GB folder transfer complete without UI freeze or memory blowout.

### Epic 7 — VPN Support

- Interface detection.
- Manual peer profiles.
- VPN-only mode.
- Route check.
- Connection test.
- Diagnostics messages.

Acceptance: Peer transfer works over WireGuard/OpenVPN/Tailscale-style adapter when routes and firewall permit.

---

## 15. Release Gates

NEURODECK Sync cannot ship until all gates pass:

- Real Warpinator compatibility test passed.
- Real Winpinator compatibility test passed.
- Steam Deck Game Mode controller-only QA passed.
- No mocked network discovery remains.
- No fake transfer progress remains.
- Large transfer matrix passed.
- Security tests passed.
- Electron security checklist passed.
- Logs redact secrets.
- Firewall prompts are explicit.
- User can revoke trust.
- Unknown peers cannot auto-send silently.
- VPN mode does not expose public inbound service by default.

---

## 16. AI Implementation Handoff Prompt

Use this prompt with Claude/Kimi/Gemini/Qwen-style coding agents:

```text
You are a senior Electron + Rust networking engineer building NEURODECK Sync, a Warpinator/Winpinator-compatible file transfer module for an Electron + React + TypeScript + Tailwind Steam Deck-first application.

Hard rules:
- No mocked data.
- No fake peers.
- No fake transfer progress.
- No simulated success.
- Use real mDNS/DNS-SD discovery.
- Use real gRPC/protobuf compatibility with Warpinator/Winpinator protocol.
- Stream files with backpressure; never load entire files into memory.
- Support files, folders, nested folders, mixed selections, 4GB+ files, and massive folders within filesystem/storage limits.
- Implement typed, validated Electron IPC.
- Renderer must not access filesystem, sockets, OS shell, crypto secrets, or Node APIs directly.
- Implement controller-first Steam Deck navigation for every screen.
- Implement profile saving, VPN interface support, manual peer support, LAN auto-connect, trust management, and diagnostics.
- Implement security hardening: unique group profile, peer trust, incoming folder jail, symlink/path traversal blocking, quarantine, integrity verification, log redaction, and firewall prompts.

Deliverables:
1. Audit existing NEURODECK architecture and identify exact integration points.
2. Create Sync feature folder structure.
3. Implement sidecar or engine layer.
4. Implement Electron IPC contracts with schema validation.
5. Implement React UI tabs: Dashboard, Devices, Send, Receive Inbox, Queue, Profiles, VPN/WAN, Diagnostics, Settings.
6. Implement Steam Deck controller focus graph.
7. Implement real integration tests against Warpinator/Winpinator where available.
8. Implement large-transfer tests, security tests, and failure-mode tests.
9. Remove all placeholders before completion.
10. Provide final report with pass/fail proof, logs, screenshots, and known limitations.
```

---

## 17. Final North Star

NEURODECK Sync should feel like the Steam Deck finally got the native file transfer system it should have had from jump: quick, secure, controller-friendly, profile-aware, and smart enough to handle tiny screenshots or monster AI model folders without folding like a lawn chair.
