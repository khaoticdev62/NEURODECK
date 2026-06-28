# LAN Share — License and Compatibility Audit (Phase LAN-0)

**Status:** Audit complete. No protocol implementation code has been written. This document is the required gate before any `LAN-1` (schemas/IPC) work begins, per the LAN Share mega-prompt's Master Directive ("Before coding... inventory, record licenses, choose a strategy").

**Disclaimer:** This is a good-faith technical and licensing inventory performed by an engineering assistant, not formal legal advice. Before this feature is publicly distributed, have the strategy below reviewed by a qualified attorney — particularly the GPL-compatibility conclusion in §4.

---

## 1. Why this gate exists

The LAN Share spec asks NeuroDeck to interoperate with the real Warpinator wire protocol used by Linux Mint's Warpinator and its compatible ports (Winpinator, etc.). Those projects are GPL-3.0-licensed. Before writing any code that touches their protocol, this repository needs:

1. A factual record of exactly which upstream projects, files, and protocol elements were consulted, and under what license.
2. A chosen, documented integration strategy that does not put NeuroDeck in license violation.
3. A clear line between "we studied their wire format to interoperate" (generally fine) and "we copied their GPL source into this repository" (not fine, given §2 below).

## 2. NeuroDeck's own current license posture

Checked directly in this repository at audit time:

- No `LICENSE` or `LICENSE.md` file exists at the repository root.
- `package.json` has no `"license"` field.

**Finding:** NeuroDeck currently has **no declared license**. This matters directly: the GPL-3.0's copyleft obligation is triggered when GPL code is combined into a single distributed work. Until NeuroDeck adopts an explicit license, the safest assumption is "all rights reserved / proprietary," which is the *most* restrictive posture with respect to incorporating GPL code — incorporating any GPL source as-is would obligate the combined work to be distributed under GPL-3.0 terms, which is very likely not what is intended here. **Action item for the maintainer**, independent of LAN Share: decide and declare a project license before any public release.

## 3. Upstream source inventory

All facts below were confirmed directly against the live GitHub repositories via the GitHub API at audit time (2026-06-26), not from memory or assumption.

| Project | Repository | License (confirmed via repo metadata) | HEAD commit (audit time) |
|---|---|---|---|
| Warpinator (reference/origin implementation) | `linuxmint/warpinator` | GPL-3.0 (`COPYING` file present, blob `94a9ed0...`) | `9cd5dbbf7d08a7965deb96d8708186d2afd68453` (branch `master`) |
| Winpinator (Windows-compatible client) | `swiszczoo/winpinator` | GPL-3.0 | `b3b1822ee4e1a57d35576852a7f5fd7a2ce77501` (branch `master`) |
| Winpinator/Warpinator port (alternate) | `emtee40/winpinator-warpinator-win` | GPL-3.0 | not pinned — not consulted beyond license confirmation |

Files inspected in `linuxmint/warpinator` (read-only, for protocol/architecture facts only — **no content was copied into this repository**):

| File | Blob SHA | What it told us |
|---|---|---|
| `src/warp.proto` | `9ce9433395664a1557fc1282009513c797199b65` | The real gRPC service/message definitions (two services: `Warp`, `WarpRegistration`) |
| `src/auth.py` | `26672de7f0752bbc4fc947dda9d81593eb25a7c6` | Real auth architecture: per-device RSA keypair + self-signed X.509 cert (via the `cryptography` library), exchanged through `WarpRegistration`, encrypted with NaCl (`pynacl`) `secretbox` symmetric encryption keyed from the shared "group code" |
| `src/remote_registration.py` | (inspected, not hashed — confirms architecture only) | Confirms the real v1-vs-v2 split: `RegistrationServer_v1` (plaintext, runs on the main transfer port) and a separate v2 server on a dedicated `auth_port` that performs the cert-lock exchange |
| `data/org.x.Warpinator.gschema.xml` | (inspected, not hashed) | Confirms real default ports: `42000` (transfer) and `42001` (registration) — matching the implementation prompt's stated defaults exactly — and that zlib compression is supported but **off by default** |
| `data/org.x.Warpinator.xml` | (inspected, not hashed) | The D-Bus introspection interface (`org.x.Warpinator`) an already-installed Warpinator exposes for `ListRemotes`/`SendFiles` — this is the "integration with system-installed Warpinator" strategy option, not the one this audit recommends (see §4) |

**Confirmed real protocol facts** (these describe behavior/shape, which is what a clean-room implementation needs — no literal text was reused):

- Transport: gRPC over TCP, two services — `Warp` (transfer/duplex-check/machine-info/text-message RPCs) and `WarpRegistration` (`RequestCertificate`, `RegisterService`).
- Discovery: mDNS/Zeroconf service announcement (the vendored `zeroconf-0.147.0` dependency in their tree), separate from the registration RPCs above.
- Registration has two real, distinct generations: **v1** (a simple lookup-style registration with no cert-locking) and **v2** (adds a dedicated `auth_port` and a cert-locked `RegRequest`/`RegResponse` exchange).
- Authentication: each device generates its own RSA keypair and self-signs an X.509 certificate; the certificate is exchanged via `WarpRegistration` but encrypted in transit with a NaCl `secretbox` symmetric key derived from the user-entered "group code" — so only peers sharing the same group code can successfully decrypt and accept each other's certificate. This is materially different from NeuroDeck's existing Epic X6 LAN transfer, which derives an AES-256-GCM key via PBKDF2 directly from the pairing code with no certificate exchange at all.
- File transfer: a streaming `StartTransfer` RPC returning a stream of `FileChunk` messages, each carrying `relative_path`, `file_type`, optional `symlink_target`, raw `chunk` bytes, `file_mode`, and an `mtime`/`mtime_usec` pair.
- Default ports: `42000` (transfer), `42001` (registration/auth) — confirmed, matching this feature's stated defaults.
- Compression: optional zlib, negotiated, off by default.

## 4. Chosen strategy: clean-room compatible implementation

Of the strategies the implementation prompt lists, this audit selects and documents **clean-room compatible implementation**, for these reasons:

- The implementation prompt itself explicitly **rules out** "a shell wrapper that merely launches external Warpinator" and "disguis[ing] an external desktop application as a built-in feature" — which eliminates the D-Bus-integration-with-a-separately-installed-copy strategy as the *primary* mechanism (it may still be worth a secondary, clearly-labeled fallback in a later phase, since it carries zero licensing risk, but it cannot be "LAN Share" itself).
- Network wire protocols and API shapes (which RPCs exist, what fields a message carries, which ports are used) are **not themselves protected expression** under prevailing copyright doctrine in major jurisdictions — only the literal source code expressing them is. This is the same legal basis Samba (SMB clean-room), Wine (Win32 clean-room), and numerous codec/container clean-room implementations have relied on for decades.
- Given NeuroDeck's undeclared license (§2), incorporating any literal GPL source — even a single vendored file — would force a difficult, likely-unwanted licensing decision on the whole project. A clean-room approach avoids that question entirely.

**What "clean-room" means concretely for this codebase**, as binding rules for every later LAN Share phase:

1. **Never** copy `warp.proto` (or any `.proto`/source file) from `linuxmint/warpinator`, `swiszczoo/winpinator`, or any other GPL Warpinator-compatible project into this repository, even renamed or reformatted.
2. NeuroDeck must author its **own** `.proto` schema from scratch, independently describing the same wire shapes documented in §3 above (service names, RPC names, and field layouts may be functionally equivalent for interop — that is the point of compatibility — but the schema file's text must be independently written here, not derived by copy-paste-and-edit).
3. **Never** vendor or transitively depend on any of the upstream Python packages, generated gRPC stubs (`warp_pb2.py`, `warp_pb2_grpc.py`), or `auth.py`/`remote_registration.py` logic. Equivalent functionality (RSA/X.509 cert generation, NaCl-equivalent symmetric encryption) must use this codebase's own toolchain (e.g., Node's built-in `node:crypto`/`node:tls`, or an independently-chosen Rust crate from the implementation prompt's own dependency list — `rustls`, not a GPL TLS fork).
4. Document any future engineer's protocol research the same way this audit did: cite the upstream file and commit/blob SHA consulted, describe the *behavior* learned, and never paste upstream source into NeuroDeck commits, issues, or generated code comments.
5. Before public release of any LAN Share build, re-run this audit's GPL-compatibility conclusion past a qualified attorney, and resolve NeuroDeck's own undeclared-license gap (§2) first.

## 5. Source-safety note (spec §4)

Warpinator's name is also used by unrelated or unofficial third-party download sites. This audit only consulted the two GitHub repositories named in §3 (`linuxmint/warpinator`, the canonical upstream, and `swiszczoo/winpinator`, a credibly-maintained, clearly GPL-licensed compatible port with an active repository). No other "Warpinator-compatible" download was fetched, installed, or executed. Any future engineer continuing this work should apply the same rule: verify a project's repository, license, and maintainer before treating it as a real interoperability reference, and never download or auto-install an executable client as part of this feature.

## 6. SBOM

Updated at Phase LAN-11, now that the real implementation (LAN-1 through LAN-10) has landed and its dependency set is final. Every entry below was confirmed directly against the installed package's own `package.json` `version`/`license` field in `node_modules`, not from memory:

| Package | Version | License | Role | Native bindings? |
|---|---|---|---|---|
| `@grpc/grpc-js` | 1.14.4 | Apache-2.0 | Pure-JS gRPC client/server — the real `Warp`/`WarpRegistration` transport | None |
| `@grpc/proto-loader` | 0.8.1 | Apache-2.0 | Loads this repo's own clean-room `ndxLanShare.proto` at runtime | None |
| `@js-sdsl/ordered-map` | 4.4.2 | MIT | Transitive dep of `@grpc/grpc-js` | None |
| `bonjour-service` | 1.4.2 | MIT | mDNS advertise/browse (real Zeroconf-equivalent discovery) | None |
| `multicast-dns` | 7.2.5 | MIT | Transitive dep of `bonjour-service` — the actual UDP multicast socket layer | None |
| `dns-packet` | 5.6.1 | MIT | Transitive dep of `multicast-dns` — DNS/mDNS packet encode/decode | None |
| `fast-deep-equal` | 3.1.3 | MIT | Transitive dep of `bonjour-service` | None |
| `selfsigned` | 5.5.0 | MIT | Real per-device RSA/X.509 self-signed certificate generation (`LanShareCertificateStore`) | None |
| `tweetnacl` | 1.0.3 | Unlicense | Real NaCl secretbox encrypt/decrypt for the group-code-locked certificate exchange (`groupCodeCipher.ts`) | None |

**No native (compiled) bindings anywhere in this dependency tree** — confirmed by searching every package above for `.node` binary files or a `binding.gyp` (none found). This matters directly for spec §32: an immutable SteamOS filesystem and electron-builder's existing `npmRebuild: false` setting both already assume pure-JS dependencies; LAN Share introduces zero new native-build or architecture-specific binary requirements. Node's built-in `node:zlib`/`node:crypto` cover compression and SHA-256 fingerprinting with no added dependency at all.

**License compatibility**: every dependency above is permissive (Apache-2.0/MIT/Unlicense), none copyleft, none GPL — consistent with the clean-room strategy in §4. The project's own undeclared-license gap (§2) remains open and is **not** resolved by this SBOM; it is a prerequisite for public release regardless of LAN Share.

## 7. Outcome and next phase

- **No protocol code exists yet.** NeuroDeck's existing Epic X6 LAN transfer (`src/core/lan/`) remains a distinct, NDX-only protocol (UDP discovery + PBKDF2-derived AES-256-GCM pairing-code encryption) and is **not** Warpinator-wire-compatible. It is unaffected by this audit and continues to serve NeuroDeck-to-NeuroDeck transfers.
- This audit clears the **LAN-0** gate from the implementation prompt's phase list (`§37`). The next phase, **LAN-1** (schemas, IPC/RPC contracts, settings, data model, error codes), may begin once explicitly requested, and must follow the clean-room rules in §4.
- Open item carried forward, not silently resolved: NeuroDeck needs a declared project license (§2) before LAN Share — or any GPL-adjacent feature — ships publicly.
