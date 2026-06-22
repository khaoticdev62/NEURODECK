# NEURODECK OS / NDX HARNESS

## Platform Completion and Missing Must-Have Features Implementation Mega-Prompt

### Supplemental Production Prompt for the Full AI Operating Platform

> This prompt is a required companion to:
>
> 1. `NeuroDeck_OS_Controller_Wireframe_Spec.md`
> 2. `NeuroDeck_OS_Production_Implementation_Mega_Prompt.md`
>
> The first implementation prompt establishes the secure Electron shell, controller runtime, spatial focus engine, AI action system, workspaces, files, terminal, Git, browser, workflows, models, remote systems, system controls, recovery, and the original 56 screens.
>
> This supplemental prompt implements the remaining platform capabilities required for NeuroDeck OS to operate as a durable, extensible, offline-capable, controller-native AI workstation rather than a closed collection of feature screens.

---

# MASTER DIRECTIVE

Act as the principal platform architect, Electron systems engineer, SteamOS integration engineer, AI runtime engineer, application-distribution engineer, extension-platform engineer, device-services engineer, privacy engineer, synchronization engineer, accessibility engineer, release engineer, and QA lead.

Inspect the repository and the two existing NeuroDeck specifications before changing code.

Do not replace completed core functionality with parallel systems. Extend the existing architecture through stable contracts, shared services, tested adapters, and migrations.

Implement every applicable capability in this prompt with:

- Real system integration
- Controller-complete interaction
- Typed IPC
- Runtime validation
- Durable persistence
- Permission enforcement
- Loading, empty, error, offline, and restricted states
- Cancellation and recovery where applicable
- Automated unit, integration, controller, security, and end-to-end tests
- Honest capability detection
- Steam Deck hardware validation
- Documentation and migration support

This is not a backlog brainstorm. This is an implementation contract.

---

# 1. SUPPLEMENTAL SOURCE-OF-TRUTH ORDER

When requirements conflict, use:

1. Security, privacy, data integrity, accessibility, and user control
2. `NeuroDeck_OS_Controller_Wireframe_Spec.md`
3. `NeuroDeck_OS_Production_Implementation_Mega_Prompt.md`
4. This supplemental implementation prompt
5. Proven existing production behavior
6. Existing repository conventions
7. Agent assumptions

This prompt must not weaken any security, controller, validation, or no-mock rule in the original implementation prompt.

---

# 2. PURPOSE OF THIS SUPPLEMENT

The original prompt covers the core operating harness. This supplement adds the platform systems needed for long-term production use:

1. Application launcher and library
2. Linux application/package lifecycle
3. Steam shortcut and Game Mode integration
4. Extension and plugin platform
5. Signed extension marketplace
6. Developer SDK, CLI, and automation API
7. Local knowledge vault and retrieval system
8. Scoped AI memory and context governance
9. Prompt, persona, tool, and workflow libraries
10. Voice assistant and speech services
11. Multimodal screen and document context capture
12. Universal clipboard, snippets, and share sheet
13. Download and transfer center
14. LAN device discovery and peer-to-peer transfer
15. Cross-device synchronization
16. Backup, restore, migration, and export
17. Device and peripheral center
18. Audio, Bluetooth, display, dock, and removable-storage management
19. Resource governor and AI workload scheduler
20. Background scheduler and event trigger service
21. User profiles, operating modes, guest mode, and session locking
22. Secure identity, credentials, certificates, and secrets vault
23. Universal indexing and semantic search
24. Capability registry and hardware abstraction
25. Feature registry and adaptive navigation
26. Offline-first queuing and degraded operation
27. Network resilience and reconnection
28. Session continuity across suspend, crash, restart, and dock changes
29. Data lifecycle and privacy controls
30. Telemetry, diagnostics, crash reporting, and support bundles
31. Supply-chain security, SBOM, signing, and release provenance
32. Localization, regional formatting, and international input
33. Dynamic onboarding, in-product help, and guided recovery
34. Media capture, screenshots, recordings, and voice notes
35. Notification routing and interruption management
36. Importers, exporters, and interoperability
37. Admin, developer, safe, presentation, and kiosk modes
38. Companion protocol foundation without making it a launch blocker
39. Application policy and sandbox controls
40. Production lifecycle and deprecation management

---

# 3. NON-NEGOTIABLE PLATFORM RULES

## 3.1 No duplicate platform silos

Do not create separate copies of:

- Settings
- Permissions
- Notifications
- Logging
- Task queues
- Model routing
- File access
- Controller handling
- Recovery
- Search
- Provider management
- Secret storage

Extend shared services and contracts.

## 3.2 No package-manager lies

Do not claim software was installed, updated, removed, or verified unless the real package/app operation succeeded and was validated.

## 3.3 No unsafe extension freedom

Extensions may never receive unrestricted:

- Node.js access
- Electron APIs
- Shell access
- Filesystem access
- Network access
- Secret access
- Raw IPC
- Browser session access
- System configuration access

Every extension must use a versioned capability API.

## 3.4 No invisible memory

AI memory must be:

- Scoped
- Inspectable
- Editable
- Exportable
- Deletable
- Disableable
- Excluded from private workspaces when policy requires
- Never silently shared across unrelated workspaces

## 3.5 No background surprise

Background services, schedules, sync, downloads, model jobs, and automation must be visible in Activity and controllable by the user.

## 3.6 No cloud dependency for core operation

NeuroDeck must remain functional offline for:

- Shell navigation
- Local workspaces
- Files
- Terminal
- Git local operations
- Installed local models
- Local search/index
- Local workflows
- Controller settings
- Recovery
- Installed documentation

## 3.7 No false hardware assumptions

Every hardware-dependent feature must perform capability detection and expose:

- Available
- Available with permission
- Available after dependency installation
- Unsupported on this device
- Temporarily unavailable
- Degraded

Never fabricate sensor or device data.

---

# 4. REQUIRED ARCHITECTURE EXTENSIONS

Extend the core architecture with:

```text
NDX Core
├── Application Registry
├── Package and Installer Adapters
├── Steam Shortcut Service
├── Extension Host
├── Extension Registry
├── Marketplace Client
├── SDK and CLI Gateway
├── Knowledge and Indexing Service
├── Scoped Memory Service
├── Voice and Speech Service
├── Capture and Context Service
├── Clipboard and Share Service
├── Download and Transfer Manager
├── Peer Discovery and LAN Transfer
├── Sync Engine
├── Backup and Migration Service
├── Device and Peripheral Service
├── Audio Service
├── Display and Dock Service
├── Resource Governor
├── Scheduler and Trigger Service
├── Profile and Session Service
├── Identity and Vault Service
├── Capability Registry
├── Feature Registry
├── Connectivity and Offline Queue
├── Session Continuity Service
├── Data Lifecycle Service
├── Support and Telemetry Service
├── Supply-Chain Verification Service
├── Localization Service
├── Help and Guidance Service
├── Media Capture Service
├── Notification Policy Service
├── Import and Export Service
└── Policy and Sandbox Service
```

Every service must have:

- Stable domain boundary
- Typed contracts
- Runtime schemas
- Permission requirements
- Cancellation
- Structured errors
- Health state
- Audit behavior
- Test adapter
- Capability declaration
- Versioned migrations where persisted state exists

---

# 5. SUPPLEMENTAL SCREEN INVENTORY

Add the following screen and overlay IDs without renumbering the original ND-001 through ND-056 screens.

| ID      | Screen                                |
| ------- | ------------------------------------- |
| ND-X001 | Application Library                   |
| ND-X002 | Application Detail                    |
| ND-X003 | Install and Package Center            |
| ND-X004 | Installation Review                   |
| ND-X005 | Steam Shortcut Manager                |
| ND-X006 | Game Mode Launch Profiles             |
| ND-X007 | Extension Manager                     |
| ND-X008 | Extension Detail and Permissions      |
| ND-X009 | Extension Marketplace                 |
| ND-X010 | Extension Developer Console           |
| ND-X011 | Knowledge Vault                       |
| ND-X012 | Knowledge Source Detail               |
| ND-X013 | Indexing and Retrieval Status         |
| ND-X014 | AI Memory Control Center              |
| ND-X015 | Memory Item Inspector                 |
| ND-X016 | Prompt and Persona Library            |
| ND-X017 | Tool and Skill Library                |
| ND-X018 | Voice Assistant Center                |
| ND-X019 | Speech and Dictation Settings         |
| ND-X020 | Screen Context Capture                |
| ND-X021 | Document Intake and Extraction        |
| ND-X022 | Clipboard and Snippet Center          |
| ND-X023 | Universal Share Sheet                 |
| ND-X024 | Download Center                       |
| ND-X025 | Transfer Center                       |
| ND-X026 | Nearby Devices                        |
| ND-X027 | LAN Transfer Session                  |
| ND-X028 | Sync Center                           |
| ND-X029 | Sync Conflict Resolver                |
| ND-X030 | Backup and Restore                    |
| ND-X031 | Import, Export, and Migration         |
| ND-X032 | Device and Peripheral Center          |
| ND-X033 | Bluetooth Devices                     |
| ND-X034 | Audio and Microphone Center           |
| ND-X035 | Display and Dock Center               |
| ND-X036 | Removable Storage Center              |
| ND-X037 | Resource Governor                     |
| ND-X038 | AI Workload Scheduler                 |
| ND-X039 | Scheduler and Triggers                |
| ND-X040 | Scheduled Task Detail                 |
| ND-X041 | Profiles and Operating Modes          |
| ND-X042 | Profile Detail                        |
| ND-X043 | Identity and Secrets Vault            |
| ND-X044 | Certificate and SSH Key Center        |
| ND-X045 | Universal Index and Search Settings   |
| ND-X046 | Capability and Dependency Center      |
| ND-X047 | Feature Registry                      |
| ND-X048 | Offline Queue and Connectivity        |
| ND-X049 | Session Continuity                    |
| ND-X050 | Data and Privacy Lifecycle            |
| ND-X051 | Telemetry and Crash Reporting         |
| ND-X052 | Support Bundle Builder                |
| ND-X053 | Security and Supply-Chain Status      |
| ND-X054 | Language and Region                   |
| ND-X055 | Input Methods                         |
| ND-X056 | Help and Documentation Hub            |
| ND-X057 | Guided Troubleshooter                 |
| ND-X058 | Screenshot and Recording Center       |
| ND-X059 | Voice Notes                           |
| ND-X060 | Notification Policy Center            |
| ND-X061 | Developer Mode                        |
| ND-X062 | NDX CLI and API Tokens                |
| ND-X063 | Safe Mode Console                     |
| ND-X064 | Presentation and Kiosk Mode           |
| ND-X065 | Application Sandbox Policies          |
| ND-X066 | Platform Migration Status             |
| ND-X067 | Feature Deprecation and Compatibility |
| ND-X068 | Companion Connection Setup            |
| ND-X069 | Companion Device Permissions          |
| ND-X070 | Platform Health Overview              |

All screens require the same controller, state, security, accessibility, and testing standards as the original screen set.

---

# 6. APPLICATION LAUNCHER AND LIBRARY

Implement a real controller-native application registry.

## 6.1 Discover applications from

- Steam library entries
- Desktop files
- Flatpak installations
- AppImages registered by the user
- System packages with launchable desktop entries
- NeuroDeck internal tools
- Web applications
- Remote applications
- User-created shortcuts
- Scripts explicitly registered as tools
- Emulator front ends where installed

## 6.2 Application record

```ts
interface ApplicationRecord {
  id: string
  source:
    | 'steam'
    | 'desktop-entry'
    | 'flatpak'
    | 'appimage'
    | 'system'
    | 'web'
    | 'remote'
    | 'internal'
    | 'custom'
  name: string
  description?: string
  iconRef?: string
  executableRef?: string
  launchArguments?: string[]
  workingDirectory?: string
  categories: string[]
  installed: boolean
  updateAvailable?: boolean
  controllerProfileId?: string
  permissionProfileId?: string
  workspaceIds: string[]
  launchMode: 'windowed' | 'fullscreen' | 'background' | 'external'
  capabilityRequirements: string[]
  lastLaunchedAt?: string
  health?: ApplicationHealth
}
```

## 6.3 Required behavior

- Real discovery
- Deduplication
- Search and categories
- Favorites
- Recent apps
- Workspace associations
- Per-app controller profiles
- Launch arguments
- Environment profile
- Fullscreen/windowed preference
- Start minimized/background
- Logs
- Crash status
- Update state
- Uninstall path when supported
- Add to Steam
- Remove from Steam
- App repair/re-register
- Open installation location
- Create NeuroDeck workflow from app action

## 6.4 Controller interaction

- `A`: Launch/open
- `X`: Application actions
- `Y`: Explain or troubleshoot
- `L3`: Favorite
- `R3`: Details
- `R5`: Launch with active profile
- `LT/RT`: Category switch

---

# 7. LINUX APPLICATION AND PACKAGE LIFECYCLE

Implement safe package adapters based on capability detection.

## 7.1 Supported installation forms

- Flatpak
- AppImage
- User-local archives
- System package information
- Repository-native installers where explicitly supported
- NeuroDeck extension packages
- Model packages
- Workflow/template packages

System package mutation must not be assumed on immutable SteamOS. Respect read-only system boundaries.

## 7.2 Flatpak

Implement:

- Search configured remotes
- Show exact source
- Permission preview
- Install
- Update
- Remove
- Repair
- Override inspection
- Storage use
- Runtime dependency display
- Launch
- Add/remove Steam shortcut

## 7.3 AppImage

Implement:

- File verification
- Executable permission handling with approval
- Metadata extraction
- Optional desktop integration
- Update capability detection
- Launch diagnostics
- Safe removal
- Steam shortcut creation

## 7.4 Installation review

Before installation show:

- Package identity
- Source
- Publisher
- Signature status
- Version
- Download size
- Installed size
- Dependencies
- Requested permissions
- Network destinations where known
- System changes
- Rollback support
- License
- Known incompatibilities

## 7.5 Package transaction requirements

- Cancellation where supported
- Progress events
- Atomic metadata updates
- Failure cleanup
- Reboot/restart requirement
- Recovery record
- Audit record
- Post-install launch test
- No success state before verification

---

# 8. STEAM SHORTCUT AND GAME MODE MANAGEMENT

Implement a real Steam integration service where technically safe and supported.

## 8.1 Features

- Discover existing non-Steam shortcuts
- Create shortcut
- Edit name
- Set executable
- Set launch options
- Set working directory
- Set artwork references
- Assign controller profile guidance
- Categorize collections where supported
- Remove shortcut
- Validate target
- Detect broken shortcuts
- Refresh Steam state safely
- Document restart requirements

## 8.2 Launch profiles

Profiles may define:

- Resolution
- Fullscreen behavior
- Environment variables
- Performance profile
- Controller profile
- Model availability
- Network/VPN policy
- Overlay access
- Workspace resume behavior
- Pre-launch workflow
- Post-exit workflow

## 8.3 Safety

Never modify Steam configuration files without:

- Backup
- Schema-aware parsing
- Process-state awareness
- Atomic write
- Validation
- Recovery support

---

# 9. EXTENSION AND PLUGIN PLATFORM

Implement a sandboxed, versioned extension architecture.

## 9.1 Extension types

- UI panel
- Command
- Tool adapter
- Model provider
- Workflow node
- File previewer
- Importer/exporter
- Knowledge connector
- Device adapter
- Theme
- Controller profile
- Learning pack
- Notification provider
- Browser integration
- Terminal command provider

## 9.2 Extension manifest

```ts
interface NdxExtensionManifest {
  schemaVersion: string
  id: string
  name: string
  version: string
  publisher: string
  description: string
  entrypoints: ExtensionEntrypoints
  capabilities: ExtensionCapabilityRequest[]
  minimumNdxVersion: string
  supportedPlatforms: string[]
  dependencies?: Record<string, string>
  contributes?: ExtensionContributions
  signature?: ExtensionSignature
}
```

## 9.3 Extension isolation

Use one or more:

- Dedicated utility process
- Worker thread with strict bridge
- Separate process
- Sandboxed iframe for declarative UI
- WASM runtime for restricted tools

Do not execute third-party extension code in the renderer or main process directly.

## 9.4 Capability API

Examples:

- Read approved workspace files
- Write through patch API
- Register command
- Add workflow node
- Request network access
- Add view
- Read selected item context
- Show notification
- Store extension-scoped data
- Request secret reference
- Register importer
- Register model adapter

Capabilities must be denied by default.

## 9.5 Extension lifecycle

- Install
- Verify
- Permission review
- Enable
- Disable
- Update
- Roll back
- Quarantine
- Remove
- Export diagnostics
- Clear extension data

## 9.6 Extension failure containment

A crashed extension must not crash:

- Shell
- Core service
- Other extensions
- Active terminal
- Workflow runtime
- Model runtime

Implement health monitoring and automatic quarantine after repeated faults.

---

# 10. SIGNED EXTENSION MARKETPLACE

Implement the marketplace as a client over a documented registry protocol.

## 10.1 Marketplace features

- Search
- Categories
- Compatibility filters
- Controller-ready badge
- Offline-capable badge
- Local-only badge
- Publisher identity
- Version history
- Changelog
- Permissions
- Dependencies
- Reviews only if a real service exists
- Install/update/remove
- Report extension
- View source/license link when provided

## 10.2 Trust model

Display:

- Verified publisher
- Signed package
- Unsigned
- Locally installed
- Revoked
- Quarantined
- Incompatible
- Deprecated

## 10.3 Supply-chain requirements

- Hash verification
- Signature verification
- Manifest verification
- Archive traversal protection
- Dependency constraints
- Revocation list support
- Rollback package retention
- SBOM ingestion where supplied
- No automatic execution after download without installation approval

The platform must remain usable when no marketplace server is configured.

---

# 11. DEVELOPER SDK, CLI, AND AUTOMATION API

Create an official SDK and CLI.

## 11.1 SDK packages

Potential packages:

```text
@ndx/sdk
@ndx/contracts
@ndx/ui
@ndx/controller
@ndx/testing
@ndx/workflow-sdk
@ndx/provider-sdk
@ndx/extension-cli
```

## 11.2 CLI capabilities

```text
ndx status
ndx workspace list
ndx workspace open
ndx command run
ndx workflow run
ndx task list
ndx task cancel
ndx extension validate
ndx extension pack
ndx extension install
ndx provider test
ndx diagnostics export
ndx controller test
ndx focus audit
```

## 11.3 Authentication

Local API access must use:

- User-created scoped token
- Expiration
- Revocation
- Capability limits
- Localhost binding by default
- No plaintext token logging
- Explicit remote access opt-in

## 11.4 SDK testing tools

Provide:

- Extension sandbox test harness
- Fake capability provider for tests only
- Controller event injector
- Focus graph validator
- IPC contract validator
- Workflow-node simulator
- Manifest validator
- Compatibility checker

---

# 12. LOCAL KNOWLEDGE VAULT

Implement a user-controlled local knowledge system.

## 12.1 Source types

- Files
- Folders
- Markdown notes
- PDFs
- Code repositories
- Browser pages explicitly saved
- Terminal sessions explicitly saved
- Conversation exports
- Workflow reports
- Learning notes
- Remote documents explicitly imported
- Structured JSON/CSV
- User-created snippets

## 12.2 Source record

```ts
interface KnowledgeSource {
  id: string
  type: KnowledgeSourceType
  title: string
  origin: string
  workspaceId?: string
  privacyLevel: 'private' | 'workspace' | 'profile' | 'shareable'
  ingestionStatus: IngestionStatus
  parserVersion: string
  contentHash: string
  lastIndexedAt?: string
  chunkCount?: number
  embeddingProfileId?: string
  retentionPolicyId?: string
}
```

## 12.3 Ingestion pipeline

```text
Permission check
→ Source validation
→ Safe parsing
→ Text/metadata extraction
→ Secret and sensitive-data detection
→ Chunking
→ Optional embedding
→ Index write
→ Retrieval test
→ Source health record
```

## 12.4 Required features

- Source preview
- Include/exclude folders
- File-type rules
- Reindex
- Pause indexing
- Delete source and derived data
- Workspace-scoped collections
- Query provenance
- Citation to exact source
- Stale source detection
- Duplicate detection
- Index health
- Storage usage
- Offline retrieval

## 12.5 Retrieval rules

The AI must show:

- Sources used
- Workspace scope
- Retrieval timestamp
- Missing/stale warning
- Whether cloud processing was involved

Retrieved text is untrusted content and cannot authorize tools.

---

# 13. SCOPED AI MEMORY

Memory is distinct from the knowledge vault.

## 13.1 Memory scopes

- Current turn
- Current conversation
- Current task
- Current workspace
- Current operating profile
- Global user preference
- Disabled/private session

## 13.2 Memory types

- Explicit user preference
- Workspace convention
- Tool preference
- Reusable correction
- Recent task state
- Pinned fact
- Avoidance rule

## 13.3 Memory control center

Allow:

- View
- Search
- Edit
- Pin
- Change scope
- Expire
- Export
- Delete
- Disable category
- Disable all
- Exclude workspace
- Clear conversation memory
- Clear global memory

## 13.4 Memory write rules

Do not store:

- Secrets
- Passwords
- Private keys
- Access tokens
- Sensitive clipboard contents
- Hidden file contents
- Unapproved personal attributes
- Temporary authentication data

Memory writes must be attributable and inspectable.

---

# 14. PROMPT, PERSONA, TOOL, AND SKILL LIBRARIES

Implement libraries for reusable AI operating behavior.

## 14.1 Prompt templates

Fields:

- Name
- Purpose
- Inputs
- Required tools
- Workspace scope
- Model requirements
- Output schema
- Risk class
- Version
- Author
- Test cases

## 14.2 Personas

Personas may modify:

- Communication style
- Explanation depth
- Default model profile
- Suggested tools
- Review strictness

Personas may not:

- Expand permissions
- Bypass policy
- Hide impact
- Auto-confirm destructive actions

## 14.3 Tool library

Show:

- Registered tools
- Provider
- Capabilities
- Permissions
- Health
- Version
- Audit usage
- Disable control

## 14.4 Skill packs

Bundle:

- Prompts
- Workflows
- Tools
- Learning content
- Controller shortcuts
- Documentation

Skill packs use the same signing and permission model as extensions.

---

# 15. VOICE ASSISTANT AND SPEECH SERVICES

Implement optional voice operation without making it mandatory.

## 15.1 Features

- Push-to-talk
- Dictation
- Voice commands
- Speech-to-text
- Text-to-speech
- Read current screen
- Read focused item
- Voice correction
- Microphone level
- Noise handling
- Language selection
- Local speech provider support
- Cloud provider support with consent

## 15.2 Wake word

Wake-word mode must be:

- Off by default
- Clearly indicated when enabled
- Processed locally when possible
- Disableable from quick overlay
- Paused on lock screen unless explicitly configured
- Subject to microphone privacy policy

## 15.3 Voice command pipeline

```text
Microphone permission
→ Capture indicator
→ Speech recognition
→ Transcript preview
→ Intent classification
→ Structured action proposal
→ Approval if required
```

No destructive voice command may execute without review.

## 15.4 Voice correction

The user can:

- Replay transcript
- Edit with controller
- Choose alternative recognition
- Cancel
- Submit as text
- Save terminology to workspace dictionary

---

# 16. MULTIMODAL SCREEN AND DOCUMENT CONTEXT

Implement controlled context capture.

## 16.1 Capture types

- Current NeuroDeck screen
- Selected panel
- Selected text
- User-selected window
- User-selected screenshot region
- Image file
- PDF pages
- Browser page
- Terminal selection
- Code selection
- Camera input only when an external camera exists and permission is granted

## 16.2 Privacy review

Before cloud vision processing show:

- Captured content preview
- Provider
- Data destination
- Redactions
- Retention policy if known
- Cancel
- Process locally alternative where available

## 16.3 Redaction

Implement optional automatic detection and user review for:

- API keys
- Password fields
- Email addresses
- Private IPs
- Account identifiers
- Tokens
- QR codes
- Selected application regions

Never capture secure input fields.

## 16.4 Document intake

Support:

- Page selection
- Text extraction
- Image extraction
- Table extraction where supported
- Metadata
- Knowledge-vault ingestion
- Summary
- Conversion
- Citation preservation

Extraction confidence must be represented honestly.

---

# 17. CLIPBOARD, SNIPPETS, AND UNIVERSAL SHARE SHEET

## 17.1 Clipboard center

Implement:

- Text clipboard history
- Image clipboard history where permitted
- File references
- Pin
- Search
- Clear
- Auto-expiration
- Sensitive-content exclusion
- Per-profile behavior
- Disable history
- Send to workspace
- Send to terminal
- Insert into editor
- Add to knowledge vault

## 17.2 Security

- Secret fields never enter history.
- Clipboard entries can be marked sensitive.
- History is encrypted at rest when persisted.
- Locking clears transient sensitive entries.
- Clipboard monitoring can be disabled.

## 17.3 Snippets

Snippet types:

- Text
- Code
- Shell
- Prompt
- Path
- URL
- Workflow input
- Structured JSON/YAML

Support variables and preview. Shell snippets require risk review.

## 17.4 Universal share sheet

Share targets:

- Workspace
- Knowledge vault
- File
- Clipboard
- Browser
- Terminal
- Workflow
- Nearby device
- Export archive
- External app where supported

Every external share displays destination and data scope.

---

# 18. DOWNLOAD AND TRANSFER CENTER

Create one real task system for:

- Browser downloads
- Model downloads
- App/package downloads
- Extension downloads
- Update downloads
- Knowledge imports
- LAN transfers
- Remote file transfers
- Export generation

## 18.1 Download record

```ts
interface TransferJob {
  id: string
  kind: TransferKind
  source: TransferEndpoint
  destination: TransferEndpoint
  displayName: string
  totalBytes?: number
  transferredBytes: number
  status: TransferStatus
  checksum?: string
  resumable: boolean
  startedAt?: string
  completedAt?: string
  error?: NdxError
}
```

## 18.2 Features

- Pause/resume when supported
- Cancel
- Retry
- Checksum validation
- Open destination
- Bandwidth limit
- Metered-network policy
- Battery policy
- Queue priority
- Duplicate handling
- Failure cleanup
- Activity integration

---

# 19. LAN DEVICE DISCOVERY AND PEER TRANSFER

Implement a Warpinator/Winpinator-style service using open, documented protocols or an NDX peer protocol.

## 19.1 Discovery

Support:

- Local network discovery
- Manual IP/hostname
- QR pairing where display/camera capabilities permit
- Device trust
- Friendly device names
- Certificate fingerprint
- Online/offline state

## 19.2 Transfer

- Files
- Folders
- Text
- Clipboard item
- Workflow package
- Workspace export
- Diagnostic bundle

## 19.3 Security

- Mutual authentication
- Encrypted transport
- Trust confirmation
- Destination preview
- File-name sanitization
- Storage-space check
- Archive safety
- Receive approval policy
- Block list
- Audit history

## 19.4 Controller flow

1. Choose nearby device.
2. Select content.
3. Review destination and size.
4. Approve.
5. Monitor in Transfer Center.
6. Open or import on completion.

---

# 20. CROSS-DEVICE SYNCHRONIZATION

Implement sync as optional and provider-agnostic.

## 20.1 Syncable data classes

- Settings
- Controller profiles
- Theme profiles
- Prompt library
- Workflow definitions
- Workspace definitions without file content by default
- Pinned memory
- Knowledge metadata
- Snippets
- App library metadata
- Extension list
- Learning progress

## 20.2 Excluded by default

- Secrets
- Raw workspace files
- Terminal history
- Private memory
- Browser cookies
- SSH private keys
- Full audit logs
- Clipboard history

## 20.3 Providers

Allow adapters for:

- Local peer
- User-selected folder
- WebDAV
- Cloud storage providers through extensions
- Self-hosted NDX sync service

## 20.4 Conflict resolution

Support:

- Keep local
- Keep remote
- Merge
- Keep both
- Inspect diff
- Apply rule by data class

No silent destructive conflict resolution.

## 20.5 Encryption

Provide end-to-end encryption for sync payloads when the provider is not fully trusted.

---

# 21. BACKUP, RESTORE, IMPORT, EXPORT, AND MIGRATION

## 21.1 Backup scopes

- Settings only
- Platform configuration
- Workspaces metadata
- Knowledge vault
- Workflows/prompts/snippets
- Extension configuration
- Full user-data backup excluding secrets
- Encrypted full backup including selected secrets

## 21.2 Backup destinations

- Local folder
- Removable drive
- Network share
- Sync provider extension
- Peer device

## 21.3 Restore

- Preview contents
- Validate version
- Validate integrity
- Choose components
- Create pre-restore snapshot
- Resolve conflicts
- Apply migrations
- Verify
- Roll back failure

## 21.4 Export formats

Use documented, versioned formats.

Support:

- Workspace bundle
- Workflow package
- Prompt pack
- Skill pack
- Knowledge export
- Settings profile
- Controller profile
- Diagnostic bundle
- Full backup archive

## 21.5 Migration

Implement migration from:

- Older NeuroDeck versions
- Legacy Tauri-era configuration where present
- Prior Electron schema versions
- Imported workspace formats
- Renamed settings
- Deprecated extension APIs

Migrations must be resumable and auditable.

---

# 22. DEVICE AND PERIPHERAL CENTER

Implement one capability-aware device service.

## 22.1 Categories

- Controllers
- Bluetooth devices
- Audio output
- Microphones
- Displays
- Docks
- Storage
- Network adapters
- Keyboards
- Mice
- Cameras
- Headsets
- USB devices

## 22.2 Device card

Show:

- Name
- Type
- Connected
- Battery where reported
- Capability
- Default status
- Driver/backend
- Permissions
- Health
- Last event

## 22.3 Hot-plug behavior

- Detect connect/disconnect
- Show non-blocking notification
- Preserve current focus
- Recalculate capability registry
- Apply profile if configured
- Avoid restarting unrelated services

---

# 23. BLUETOOTH CENTER

Implement through supported SteamOS/Linux services.

Features:

- Adapter state
- Scan
- Pair
- Trust
- Connect
- Disconnect
- Forget
- Battery where reported
- Audio profile
- Controller profile
- Connection diagnostics

Security:

- Pairing confirmation
- Device identity
- Failed-pair cleanup
- No automatic trust for unknown devices

---

# 24. AUDIO AND MICROPHONE CENTER

Implement real audio device and stream awareness through available Linux audio services.

## 24.1 Features

- Output selection
- Input selection
- Volume
- Mute
- Per-app volume where supported
- Microphone level
- Input test
- Speech-service input
- Bluetooth profile
- Dock audio
- HDMI audio
- Noise suppression capability
- Push-to-talk test
- Voice privacy indicator

## 24.2 Controller support

Sliders must use D-pad and stick with precise and accelerated increments.

---

# 25. DISPLAY AND DOCK CENTER

Implement hot-plug-aware display management where safe.

## 25.1 Features

- Internal display
- External display discovery
- Resolution
- Refresh rate
- Scaling
- Orientation
- Primary display
- Mirror/extend
- HDR capability display
- UI density profile
- Docked layout
- Overscan where supported
- Safe-mode display reset

## 25.2 Safety

Apply display changes through a timed confirmation:

```text
Keep these display settings?
Reverting in 15 seconds.
```

Controller focus must remain visible after resolution changes.

---

# 26. REMOVABLE STORAGE CENTER

Implement:

- Device discovery
- Mount state
- Filesystem
- Capacity
- Free space
- Read-only status
- Health where exposed
- Open
- Safe eject
- Use for model storage
- Use for backups
- Use for workspace
- Repair guidance
- Encryption capability

Never unplug/eject while active writes are in progress without explicit force warning.

---

# 27. RESOURCE GOVERNOR

Implement a unified policy engine for battery, thermal, memory, CPU, GPU, network, and storage pressure.

## 27.1 Inputs

- Battery level
- Charging state
- CPU load
- GPU load
- RAM pressure
- Swap pressure
- Thermal state
- Fan capability
- Network type
- Metered status
- Storage free space
- Foreground application
- Active game
- Docked state

## 27.2 Policy actions

- Delay model load
- Use smaller model
- Reduce context
- Pause indexing
- Pause downloads
- Limit background concurrency
- Suspend browser tabs
- Lower animation intensity
- Reduce metric polling
- Delay backups
- Pause noncritical workflows
- Unload inactive model
- Alert user
- Enter battery-saver mode

## 27.3 Profiles

- Performance
- Balanced
- Battery Saver
- Quiet
- Game Priority
- AI Workstation
- Docked
- Custom

Actions must be visible and reversible.

---

# 28. AI WORKLOAD SCHEDULER

Coordinate local models, embeddings, indexing, speech, and agent jobs.

## 28.1 Job classes

- Interactive inference
- Background inference
- Embedding
- Indexing
- Model download
- Model load
- Model conversion
- Speech recognition
- Text-to-speech
- Vision analysis
- Agent task
- Workflow AI node

## 28.2 Scheduling factors

- Foreground priority
- Deadline
- Battery
- Thermal
- Available memory
- Model residency
- Provider rate limits
- Network cost
- User-selected profile
- Privacy requirement

## 28.3 Required behavior

- Queue
- Priority
- Pause
- Resume
- Cancel
- Preemption at safe boundary
- Estimated resource use
- Admission control
- Out-of-memory prevention
- Retry policy
- Activity integration

---

# 29. SCHEDULER AND EVENT TRIGGERS

Implement durable automation scheduling.

## 29.1 Trigger types

- Manual
- Time
- Interval
- Calendar-style recurrence
- App launch
- App exit
- Workspace open
- Workspace close
- File change
- Git event
- Network connect
- VPN connect
- Device connect
- Battery threshold
- Charging state
- Dock connect
- Model availability
- Download completion
- Remote host online
- System startup
- Resume from sleep

## 29.2 Scheduler requirements

- Persistent schedules
- Missed-run policy
- Time-zone awareness
- Daylight-saving handling
- Duplicate-run protection
- Concurrency control
- Quiet hours
- Battery policy
- Network policy
- Run history
- Next-run preview
- Disable
- Pause all
- Export/import

## 29.3 Security

Scheduled actions may not inherit broad permissions silently. Store explicit approved permission grants and re-request when policy changes.

---

# 30. USER PROFILES AND OPERATING MODES

Implement NeuroDeck profiles distinct from SteamOS user accounts.

## 30.1 Profile examples

- Personal
- Development
- Security Lab
- Gaming
- Work
- Guest
- Presentation
- Private Session

## 30.2 Profile-scoped data

- Home layout
- Workspaces
- Model routing
- Controller mapping
- Theme
- Notifications
- Memory policy
- Knowledge collections
- Extensions
- App favorites
- Resource policy
- Voice settings

## 30.3 Guest profile

Guest mode must:

- Avoid persistent memory
- Avoid persistent clipboard history
- Restrict secrets
- Restrict private workspaces
- Clear session data on exit
- Disable sync by default

## 30.4 Profile switching

Show impact on:

- Running tasks
- Active model
- Open workspace
- Browser session
- Network policy
- Permissions

---

# 31. IDENTITY, CREDENTIALS, CERTIFICATES, AND SECRETS VAULT

Implement a secure reference-based vault.

## 31.1 Stored item types

- API credential
- SSH key reference
- Certificate
- Passphrase
- OAuth token
- Provider secret
- Remote host credential
- Signing key reference
- Encryption key

## 31.2 Vault rules

- OS-backed secure storage where available
- Encryption at rest
- Lock with NeuroDeck
- No raw value in renderer
- Copy requires explicit reveal/copy action
- Auto-clear copied secret
- Access audit
- Per-item policy
- Rotation reminder
- Expiration
- Revocation
- Backup opt-in only

## 31.3 Secret use

Tools receive short-lived capability-bound secret handles where feasible rather than raw secret values.

---

# 32. UNIVERSAL INDEXING AND SEARCH

Create one index service supporting:

- Applications
- Files
- Code symbols
- Workspaces
- Commands
- Workflows
- Prompts
- Agents
- Models
- Notifications
- Settings
- Documentation
- Knowledge sources
- Clipboard snippets
- Browser history where enabled
- Audit events where permitted

## 32.1 Search types

- Prefix
- Fuzzy
- Full text
- Structured filter
- Semantic
- Recent
- Scoped

## 32.2 Search requirements

- Query cancellation
- Incremental results
- Source labels
- Permission filtering
- Stale-index handling
- Reindex
- Index-size reporting
- Exclusion rules
- No hidden private source leakage

---

# 33. CAPABILITY REGISTRY AND HARDWARE ABSTRACTION

Create a central capability registry.

## 33.1 Capability record

```ts
interface CapabilityState {
  id: string
  status:
    | 'available'
    | 'permission-required'
    | 'dependency-required'
    | 'unsupported'
    | 'temporarily-unavailable'
    | 'degraded'
  provider?: string
  version?: string
  reason?: string
  remediation?: CapabilityRemediation[]
  lastCheckedAt: string
}
```

## 33.2 Capabilities include

- Rear buttons
- Haptics
- Gyro
- Microphone
- Camera
- Bluetooth
- NetworkManager
- Flatpak
- Steam shortcut editing
- Decky integration
- Local model runtime
- GPU acceleration
- Thermal sensors
- Fan controls
- External displays
- VPN backends
- Secure storage
- Notifications
- Screen capture
- OCR/document extraction providers
- Remote desktop launchers

Every feature uses this registry rather than ad hoc environment checks.

---

# 34. FEATURE REGISTRY AND ADAPTIVE NAVIGATION

Create a feature registry describing:

- ID
- Route
- Name
- Icon
- Capability dependencies
- Permission requirements
- Profile visibility
- Extension ownership
- Controller hints
- Help topic
- Status

Navigation must adapt when:

- Feature unsupported
- Extension disabled
- Profile hides feature
- Dependency missing
- Safe mode active
- Guest mode active

Do not leave dead routes.

---

# 35. OFFLINE-FIRST QUEUE AND CONNECTIVITY

Implement connectivity state as a platform service.

## 35.1 States

- Online
- Limited
- Captive portal suspected
- Offline
- VPN only
- Metered
- Reconnecting

## 35.2 Offline queue

Queue only operations that are safe to defer:

- Sync
- Upload
- Provider request
- Marketplace refresh
- Update check
- Remote notification

Never queue destructive external operations without explicit user awareness.

## 35.3 Reconnection

On reconnect:

- Revalidate authorization
- Recheck target
- Recheck scope
- Avoid duplicate submission
- Show pending operations
- Respect battery and metered policy

---

# 36. SESSION CONTINUITY

Persist and restore:

- Active profile
- Active workspace
- Route
- Focus target
- Open files
- Editor tabs
- Terminal sessions where resumable
- Browser tabs according to privacy policy
- Pending approvals
- Paused workflows
- Download state
- Quick overlay state
- Docked layout

## 36.1 Suspend/resume

On suspend:

- Flush durable state
- Pause unsafe operations
- Mark network tasks
- Secure secrets
- Record checkpoint

On resume:

- Recheck device state
- Recheck network
- Reconnect controller
- Validate active process handles
- Restore focus
- Resume only approved jobs
- Surface failures

## 36.2 Crash recovery

After crash:

- Offer safe mode
- Show last active operation
- Restore from clean checkpoint
- Quarantine suspected extension
- Avoid restart loops
- Preserve diagnostics

---

# 37. DATA LIFECYCLE AND PRIVACY CONTROLS

Implement user-visible policies for:

- Retention
- Auto-expiration
- Deletion
- Export
- Sync
- Cloud processing
- Analytics
- Crash reports
- Browser data
- Terminal history
- Clipboard history
- AI conversations
- Memory
- Knowledge index
- Audit logs
- Backups

## 37.1 Data map

Provide a screen showing:

- Data category
- Storage location
- Encryption
- Retention
- Sync status
- Export support
- Delete control
- Provider involvement

## 37.2 Deletion

Deletion must address:

- Primary record
- Derived index
- Embeddings
- Cached preview
- Sync tombstone
- Backup caveat
- Audit retention requirements

---

# 38. TELEMETRY, CRASH REPORTING, AND SUPPORT

Telemetry must be opt-in.

## 38.1 Telemetry classes

- Performance
- Feature usage
- Crash
- Compatibility
- Controller navigation failure
- Extension failure

## 38.2 Privacy requirements

- Off by default unless product policy explicitly says otherwise
- Preview categories
- No file contents
- No prompt contents by default
- No secrets
- No terminal commands by default
- Local diagnostics always available
- Delete local telemetry
- Export before send

## 38.3 Crash reporting

- Detect renderer/main/core/extension crash
- Generate correlation ID
- Redact
- Preview report
- Attach optional logs
- Retry startup safely
- Link to recovery action

## 38.4 Support bundle

Allow selective inclusion of:

- Version
- Build hash
- System capability
- Logs
- Extension list
- IPC errors
- Controller diagnostics
- Focus graph
- Crash events
- Package state

Never include secrets.

---

# 39. SUPPLY-CHAIN SECURITY AND RELEASE PROVENANCE

Implement:

- Dependency lockfile enforcement
- SBOM generation
- License inventory
- Vulnerability scan
- Artifact signing
- Checksum publication
- Extension signing
- Update signature verification
- Build provenance
- Reproducibility documentation
- Dependency review
- Secret scan
- Malicious package safeguards

The Security and Supply-Chain Status screen must show real scan and signature state.

---

# 40. LOCALIZATION, REGION, AND INPUT METHODS

## 40.1 Localization

Support:

- Externalized strings
- Locale fallback
- Pluralization
- Date/time formatting
- Number formatting
- Units
- Time zone
- 12/24-hour clock
- Right-to-left readiness
- Font fallback
- Text expansion

## 40.2 Input methods

Support:

- Controller keyboard layouts
- QWERTY
- Alternate layouts
- Language dictionaries
- IME integration where available
- Dictation language
- Code layout
- Terminal symbols
- User dictionary

No hard-coded English text in reusable UI primitives.

---

# 41. HELP, DOCUMENTATION, AND GUIDED TROUBLESHOOTING

Implement local, version-matched documentation.

## 41.1 Help hub

- Getting started
- Controller map
- Feature guides
- Privacy
- Permissions
- AI safety
- Workspaces
- Terminal
- Git
- Extensions
- Models
- Backup
- Troubleshooting
- Keyboard fallback
- SteamOS installation

## 41.2 Context help

Every major screen must expose:

- What this screen does
- Controller actions
- Required capability
- Common failures
- Privacy notes
- Related settings

## 41.3 Guided troubleshooter

Troubleshoot:

- Controller not detected
- Focus stuck
- Model unavailable
- Provider failure
- Terminal failure
- Steam shortcut broken
- No microphone
- No network
- VPN failure
- Extension crash
- Storage low
- Display unusable
- Update failure
- Database recovery

The troubleshooter must run real diagnostics and never pretend an issue is fixed.

---

# 42. SCREENSHOTS, RECORDING, AND VOICE NOTES

## 42.1 Screenshot center

- Full screen
- Current window
- Selected region
- Current panel
- Delayed capture
- Annotation
- Redaction
- Save
- Copy
- Share
- Add to workspace
- Ask AI

## 42.2 Recording

Where system capability permits:

- Screen recording
- Microphone inclusion
- System audio inclusion
- Resolution and frame rate
- Storage estimate
- Stop shortcut
- Recording indicator
- Privacy exclusion
- Activity task

## 42.3 Voice notes

- Record
- Pause
- Resume
- Playback
- Rename
- Transcribe
- Add to workspace
- Add to knowledge vault
- Delete audio after transcription option

---

# 43. NOTIFICATION POLICY AND INTERRUPTION MANAGEMENT

Implement:

- Notification categories
- Priority
- Quiet hours
- Fullscreen/game policy
- Presentation policy
- Sound
- Haptic
- Toast
- Activity-only
- External routing through extensions
- Per-workspace policy
- Per-agent policy

Critical security events remain visible.

Avoid interrupting gameplay or focused work with low-priority notifications.

---

# 44. DEVELOPER MODE

Developer Mode must be explicit and reversible.

## 44.1 Features

- Focus debug overlay
- IPC inspector
- Extension logs
- Feature flags
- Capability simulator for development
- Route explorer
- State inspector with secret redaction
- Performance profiler
- Test controller injector
- Local API token management
- Workflow debugger
- Database migration status

## 44.2 Safety

Developer Mode may not disable critical production security by default.

Dangerous overrides require:

- Clear warning
- Session-scoped enablement
- Audit event
- Automatic reset option

---

# 45. SAFE MODE

Safe Mode starts with:

- Third-party extensions disabled
- Background schedules paused
- Sync paused
- Minimal model runtime
- Default theme
- Default controller profile
- Read-only recovery access where needed
- Diagnostics available
- Backup/restore available

Safe Mode must support:

- Disable problematic extension
- Reset layout
- Reset controller profile
- Repair database
- Restore backup
- Export diagnostics
- Return to SteamOS

---

# 46. PRESENTATION AND KIOSK MODES

## 46.1 Presentation mode

- Suppress sensitive notifications
- Hide secrets
- Hide private workspace names
- Disable clipboard previews
- Keep screen awake if configured
- Use large text/docked layout
- Restrict AI context capture

## 46.2 Kiosk mode

- Allowlisted apps/routes
- Restricted settings
- Restricted exit
- No secret access
- No developer mode
- Reset session option
- Controller-only operation

Kiosk mode is optional but architecture must not require a rewrite.

---

# 47. APPLICATION SANDBOX AND POLICY

Create per-application policies for:

- File roots
- Network
- Clipboard
- Microphone
- Camera
- Notifications
- AI context
- Extension access
- Download location
- Launch environment
- Workspace association

Where the OS cannot enforce a permission, label it as advisory rather than pretending it is enforced.

---

# 48. COMPANION PROTOCOL FOUNDATION

Do not make a mobile companion app a launch requirement. Implement only the secure protocol foundation and optional connection screens.

Potential future uses:

- Approve task
- View notifications
- Send clipboard item
- Push file
- Remote text input
- View task status
- Pair device

Requirements:

- Explicit pairing
- Mutual authentication
- Scoped permissions
- Revoke
- Local network by default
- No remote internet access unless configured
- Audit
- Lock-screen policy

---

# 49. PLATFORM HEALTH OVERVIEW

Create one screen aggregating:

- Core service health
- Database health
- Controller runtime
- Focus graph health
- Model runtime
- Extension health
- Scheduler health
- Sync health
- Backup status
- Storage status
- Network status
- Update status
- Security scan status
- Last successful validation

Each issue links to a real repair or diagnostic action.

---

# 50. NEW IPC DOMAINS

Add versioned schemas for:

```text
application.*
package.*
steam.*
extension.*
marketplace.*
sdk.*
knowledge.*
memory.*
promptLibrary.*
skill.*
voice.*
speech.*
capture.*
clipboard.*
share.*
download.*
transfer.*
peer.*
sync.*
backup.*
migration.*
device.*
bluetooth.*
audio.*
display.*
storageDevice.*
resource.*
scheduler.*
profile.*
identity.*
vault.*
index.*
capability.*
feature.*
connectivity.*
session.*
dataLifecycle.*
telemetry.*
support.*
supplyChain.*
localization.*
inputMethod.*
help.*
mediaCapture.*
notificationPolicy.*
developer.*
safeMode.*
kiosk.*
sandboxPolicy.*
companion.*
platformHealth.*
```

Every domain must follow the original typed IPC requirements.

---

# 51. PERSISTENCE AND MIGRATION EXTENSIONS

Add versioned tables or equivalent records for:

- Applications
- Launch profiles
- Package transactions
- Steam shortcuts
- Extensions
- Extension permissions
- Marketplace cache
- Knowledge sources
- Knowledge chunks
- Embedding references
- Memory items
- Prompt templates
- Personas
- Skill packs
- Speech profiles
- Clipboard entries
- Snippets
- Transfers
- Trusted peers
- Sync providers
- Sync records
- Conflicts
- Backups
- Devices
- Resource policies
- Schedules
- Trigger registrations
- Profiles
- Vault metadata
- Certificates
- Index metadata
- Capability state
- Feature state
- Offline queue
- Session snapshots
- Data policies
- Telemetry consent
- Support bundle history
- Localization preferences
- Notification policies
- Companion devices
- Platform health events

Never store large binary content directly in SQLite unless justified. Use content-addressed storage or managed files with integrity metadata.

---

# 52. ADDITIONAL TEST REQUIREMENTS

## 52.1 Application and package tests

- Desktop entry parsing
- Flatpak adapter
- AppImage registration
- Install cancellation
- Failed-install cleanup
- Steam shortcut backup and restore
- Launch-profile application

## 52.2 Extension security tests

- Capability denial
- Sandbox escape attempts
- Invalid signature
- Malformed archive
- Crashing extension isolation
- Revoked package
- Version incompatibility
- Unauthorized IPC
- Excessive resource use

## 52.3 Knowledge and memory tests

- Scope isolation
- Source deletion
- Derived-index deletion
- Citation provenance
- Stale source
- Sensitive-data exclusion
- Memory edit/delete
- Private-session non-persistence

## 52.4 Voice and capture tests

- Permission denial
- Transcript correction
- Cloud-consent gate
- Secure-field exclusion
- Redaction
- Capture cancellation
- Microphone disconnect

## 52.5 Sync and backup tests

- Offline queue
- Duplicate prevention
- Conflict resolution
- Interrupted backup
- Corrupt archive
- Wrong version
- Restore rollback
- End-to-end encryption
- Secret exclusion

## 52.6 Device tests

- Hot plug
- Disconnect
- Dock transition
- Display revert
- Bluetooth failure
- Audio device switch
- Storage eject during write
- Capability state update

## 52.7 Scheduler tests

- Daylight-saving transition
- Missed run
- Duplicate trigger
- Permission expiration
- Battery policy
- Network policy
- Suspend/resume
- Concurrent run limit

## 52.8 Controller traversal

Add every ND-X screen to the focus graph audit and Playwright controller suite.

---

# 53. ADDITIONAL PERFORMANCE BUDGETS

- Application library initial load: under 500 ms from cache
- Incremental application refresh: non-blocking
- Command/global search first result: under 150 ms for local index
- Clipboard overlay: under 150 ms
- Device hot-plug notification: under 1 second where backend permits
- Profile switch UI response: under 300 ms before background reconciliation
- Voice capture indicator: under 100 ms
- Transfer progress update: 4–10 Hz, not unbounded
- Resource metric polling: adaptive
- Extension startup: lazy
- Indexing: background-priority and cancellable
- Sync: incremental and resumable
- Backup: streaming and bounded-memory

---

# 54. ADDITIONAL SECURITY GATES

Do not release until:

- Extension host isolation is tested.
- Marketplace packages are verified.
- Package downloads are integrity checked.
- Steam config edits are recoverable.
- Knowledge retrieval cannot expand permissions.
- Memory scope isolation passes.
- Clipboard secrets are excluded.
- Capture excludes secure fields.
- Voice cannot bypass approval.
- Sync excludes secrets by default.
- Backups are integrity checked.
- Vault values never enter renderer state.
- Companion devices are revocable.
- Local API tokens are scoped.
- Update and artifact signatures are verified.
- Support bundles pass secret scanning.
- Offline queue cannot duplicate external actions.
- Kiosk and Guest mode isolation passes.

---

# 55. SUPPLEMENTAL IMPLEMENTATION EPICS

Execute after or alongside compatible core epics.

## Epic X1 — Platform registry foundation

- Capability registry
- Feature registry
- Application registry
- Device registry
- Shared transaction framework
- New IPC contracts

## Epic X2 — Application ecosystem

- Application Library
- Package Center
- Flatpak adapter
- AppImage adapter
- Steam Shortcut Manager
- Launch profiles

## Epic X3 — Extension ecosystem

- Extension host
- Manifest
- Capability API
- Extension Manager
- Marketplace client
- Signing
- Quarantine
- SDK
- CLI

## Epic X4 — Knowledge and memory

- Knowledge Vault
- Parsers
- Indexing
- Embeddings
- Retrieval
- Scoped memory
- Prompt/persona/tool libraries

## Epic X5 — Voice and multimodal

- Speech providers
- Push-to-talk
- Dictation
- TTS
- Capture
- Redaction
- Document intake
- Voice notes

## Epic X6 — Clipboard, sharing, and transfer

- Clipboard Center
- Snippets
- Share Sheet
- Download Center
- Transfer Center
- LAN discovery
- Peer transfer

## Epic X7 — Sync, backup, and migration

- Sync engine
- Conflict resolver
- Backup
- Restore
- Import/export
- Legacy migration
- Version migration

## Epic X8 — Device services

- Device Center
- Bluetooth
- Audio
- Displays
- Dock
- Removable storage
- Hot-plug

## Epic X9 — Resource and scheduling

- Resource Governor
- AI workload scheduler
- Time/event scheduler
- Trigger service
- Quiet hours

## Epic X10 — Profiles and identity

- Operating profiles
- Guest/private session
- Vault
- Certificates
- SSH key references
- Lock policy

## Epic X11 — Continuity and offline operation

- Offline queue
- Connectivity
- Suspend/resume
- Crash recovery
- Session restore
- Safe Mode

## Epic X12 — Privacy and support

- Data lifecycle
- Telemetry consent
- Crash reporting
- Support bundles
- Privacy map
- Deletion verification

## Epic X13 — Internationalization and guidance

- Localization
- Input methods
- Help Hub
- Context help
- Guided troubleshooter

## Epic X14 — Media, notifications, and special modes

- Screenshot/recording
- Voice notes
- Notification policy
- Presentation mode
- Kiosk architecture
- App policy

## Epic X15 — Supply chain and production hardening

- SBOM
- Signing
- Release provenance
- Extension verification
- Dependency review
- Compatibility/deprecation
- Platform Health Overview

---

# 56. STORY COMPLETION CONTRACT

Every supplemental feature story must record:

```markdown
## Supplemental Story: <name>

### Platform gap closed

<why this capability is required>

### Existing systems reused

<services and components>

### New contracts

<IPC, schemas, database, capability>

### Real backend

<actual OS, package, device, sync, or runtime integration>

### Controller path

<initial focus, controls, back behavior>

### Permissions and privacy

<scope, user review, storage>

### Offline behavior

<available, queued, or unavailable>

### Failure and recovery

<cancel, retry, rollback, diagnostic>

### Tests

<unit, integration, controller E2E, security>

### Evidence

<commands and results>

### Compatibility

<SteamOS, docked mode, dependency constraints>
```

---

# 57. SUPPLEMENTAL ACCEPTANCE GATES

## Application ecosystem

- Real applications are discovered.
- Launch works.
- Install/remove/update state is real.
- Steam shortcuts are backed up and validated.
- Controller profiles can be associated.

## Extensions

- Third-party code is isolated.
- Capabilities are enforced.
- Install/update/rollback works.
- Crashes are contained.
- Signatures and hashes are visible.

## Knowledge and memory

- Sources are scoped.
- Retrieval provides provenance.
- Deletion removes derived data.
- Memory is inspectable and disableable.
- Private workspaces do not leak context.

## Voice and capture

- Push-to-talk works.
- Transcript review exists.
- Cloud processing requires policy approval.
- Secure content is excluded.
- Voice cannot directly perform destructive action.

## Sync and backup

- Sync is optional.
- Conflicts are visible.
- Secret exclusion works.
- Backup verifies integrity.
- Restore can roll back.

## Devices and dock

- Hot-plug works.
- Display changes revert safely.
- Audio and controller state is real.
- Removable storage can be ejected safely.

## Resource and scheduler

- Policies respond to battery/thermal state.
- AI jobs avoid memory exhaustion.
- Schedules survive restart.
- Missed-run and duplicate-run policies work.

## Profiles and vault

- Profile isolation works.
- Guest session clears data.
- Vault secrets remain outside renderer.
- Access is audited.

## Platform lifecycle

- Session resume works.
- Safe Mode works.
- Diagnostics are redacted.
- SBOM and signed artifacts are generated.
- Deprecations are visible.
- Platform Health reports real status.

---

# 58. REQUIRED FINAL REPORT ADDITIONS

Extend the final implementation report with:

1. Application discovery and package adapter matrix
2. Steam integration matrix
3. Extension capability and sandbox report
4. Marketplace verification report
5. SDK and CLI command inventory
6. Knowledge source and retrieval report
7. AI memory scope report
8. Voice and capture privacy report
9. Clipboard and share security report
10. LAN transfer and peer trust report
11. Sync and conflict report
12. Backup and migration report
13. Device capability matrix
14. Resource-governor measurements
15. Scheduler persistence report
16. Profile isolation report
17. Vault security report
18. Offline behavior matrix
19. Suspend/resume and crash-recovery report
20. Data lifecycle map
21. Telemetry and support-bundle privacy report
22. SBOM, signature, and provenance report
23. Localization readiness report
24. Supplemental screen completion matrix ND-X001 through ND-X070
25. Remaining unsupported hardware or SteamOS capabilities

---

# 59. FINAL SUPPLEMENTAL DIRECTIVE

Read the original wireframe and implementation prompt first.

Then:

1. Audit which supplemental capabilities already exist.
2. Reuse correct shared services.
3. Add capability and feature registries.
4. Build the application and package ecosystem.
5. Build the isolated extension platform and SDK.
6. Implement knowledge, retrieval, and scoped memory.
7. Implement voice, capture, and document context.
8. Implement clipboard, sharing, downloads, and LAN transfer.
9. Implement sync, backup, restore, export, and migration.
10. Implement device, audio, display, dock, Bluetooth, and storage services.
11. Implement resource governance and durable scheduling.
12. Implement profiles, guest mode, vault, and identity controls.
13. Implement offline queuing and session continuity.
14. Implement privacy lifecycle, diagnostics, and support.
15. Implement localization, help, capture, notification policy, and safe modes.
16. Implement supply-chain verification and release provenance.
17. Add all ND-X001 through ND-X070 routes and controller tests.
18. Run every supplemental acceptance gate.
19. Update the implementation ledger.
20. Report incomplete platform capabilities honestly.

Do not turn NeuroDeck into a bloated pile of disconnected panels.

Every capability must integrate with:

- Controller navigation
- Search
- Activity
- Notifications
- Permissions
- Audit
- Recovery
- Profiles
- Offline state
- Help
- Diagnostics

The final result must behave like one operating platform.
