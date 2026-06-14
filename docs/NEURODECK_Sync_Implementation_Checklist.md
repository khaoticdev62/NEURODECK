# NEURODECK Sync Implementation Checklist

Source: `NEURODECK_Sync_Warpinator_Winpinator_PRD_SDS_Package.zip`

## Discovery
- [x] Real mDNS/DNS-SD peer discovery implemented.
- [x] Manual peer connection implemented.
- [ ] LAN and VPN interfaces detected.
- [x] Group-code mismatch handled.

## Transfer Engine
- [x] Files stream with backpressure.
- [x] Folders preserve structure.
- [ ] 4GB+ files pass.
- [ ] 100GB folder test passes.
- [x] Resume/retry behavior implemented.
- [ ] Compression negotiation implemented.

## Security
- [x] Renderer has no Node integration.
- [x] Context isolation enabled.
- [ ] IPC payloads validated.
- [x] Incoming folder jail enforced.
- [x] Path traversal blocked.
- [x] Symlinks blocked by default.
- [x] Secrets stored securely.
- [x] Logs redact group codes/secrets.

## UI/UX
- [x] Dashboard tab complete.
- [x] Devices tab complete.
- [x] Send tab complete.
- [x] Receive Inbox complete.
- [x] Queue tab complete.
- [x] Profiles tab complete.
- [x] VPN/WAN tab complete.
- [x] Diagnostics tab complete.
- [x] Settings tab complete.
- [ ] Steam Deck controller-only navigation passes.

## Release Gate
- [ ] Real Warpinator compatibility pass.
- [ ] Real Winpinator compatibility pass.
- [x] No mocked peers.
- [x] No fake transfer progress.
- [x] No public WAN exposure by default.
