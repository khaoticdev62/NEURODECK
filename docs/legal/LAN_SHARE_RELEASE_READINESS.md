# LAN Share — Packaging, SBOM, Documentation, Release Gates (Phase LAN-11)

**Status:** Phases LAN-0 through LAN-10 are implemented and validated (see `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md`'s LAN Share entries and `IMPLEMENTATION_CHECKLIST.md`). This document is the LAN-11 packaging/release-gate pass over that real, already-built feature — it does not introduce new application code.

## 1. Packaging (spec §32)

**Reviewed**: `electron-builder.yml` (repository root) and `package.json`'s `build:linux` script.

- `linux.target` already includes `AppImage`, `snap`, and `deb` — `AppImage` is the format spec §32 calls out as SteamOS-compatible (no system package manager required, runs from a single file, no root install step).
- `npmRebuild: false` is already set, and **LAN Share requires no change to this** — confirmed in this phase's own SBOM pass (§6 of `LAN_SHARE_LICENSE_AND_COMPATIBILITY.md`): every LAN Share dependency (`@grpc/grpc-js`, `@grpc/proto-loader`, `bonjour-service` and its transitive `multicast-dns`/`dns-packet`/`fast-deep-equal`, `selfsigned`, `tweetnacl`) is pure JavaScript with zero native (compiled) bindings. There is no architecture-specific binary for LAN Share to build, sign, or bundle per-platform.
- `asarUnpack: [resources/**]` is unaffected — LAN Share has no runtime resources outside the asar (no bundled binaries, no shipped certificates/keys; certificates and group codes are generated/stored at runtime in the user's own app-data directory via the existing `JsonStore`/`safeStorage` patterns).
- **No root privilege is required to run LAN Share** — it binds two unprivileged TCP ports (default `42000`/`42001`, both well above the privileged `<1024` range) and one UDP mDNS socket, all as the logged-in user, matching every other NeuroDeck core service's process model.
- **Not run/verified in this phase**: an actual `npm run build:linux` AppImage build, and any run of the produced artifact on a real SteamOS machine. This dev environment is Windows; cross-building and signing a Linux AppImage/snap/deb meaningfully requires a real Linux (ideally the actual SteamOS target) host. This is the same honestly-deferred gap already named in the LAN-9 ledger entry for SteamOS-specific verification — not a new one.
- **Not addressed in this phase**: code signing / package checksumming, and immutable-filesystem install-path verification on a real SteamOS Desktop Mode session. Both are release-pipeline concerns needing the project's actual signing keys and a real target machine, neither of which exist in this session.

## 2. SBOM (spec §32, §36)

Done — see `docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md` §6 (updated this phase). Summary: 9 packages in the real LAN Share dependency tree (3 direct, 6 transitive), all permissively licensed (Apache-2.0/MIT/Unlicense), zero copyleft, zero native bindings.

## 3. Documentation (spec §36)

Real, current documentation that exists for LAN Share as of this phase:

- `docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md` — license/compatibility audit and SBOM (LAN-0, updated LAN-11).
- `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` — one detailed entry per phase (LAN-1 through LAN-10), each with real file references, real test counts, and honest deferral reasons.
- `IMPLEMENTATION_CHECKLIST.md` — the phase-by-phase status line for LAN-0 through LAN-11.
- In-code documentation — every LAN Share module carries a doc comment explaining the real spec section it implements and any clean-room/compatibility constraint that shaped it (per `CLAUDE.md`'s own comment-quality bar: only the non-obvious "why," not a restatement of the code).

**Not written in this phase, and why**: a dedicated end-user help/quickstart document. The in-app **ND-LAN-026 Help** screen was already named as out of scope in the LAN-7 ledger entry (no real content exists to put there yet), and writing a standalone user-facing markdown guide for a feature whose Firewall Assistant, Quick Send Overlay, and several other screens are still honestly unbuilt (LAN-7's documented gaps) would describe a feature surface larger than what currently exists. A user-facing quickstart belongs after those screens land, not before.

## 4. Release gates

Concrete, checkable conditions — not a restatement of "it builds." Each is marked from this phase's actual validation run.

| Gate                                                                              | Status          | Evidence                                                                                                                         |
| --------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                                    | Pass            | This phase's validation run                                                                                                      |
| `npm run typecheck`                                                               | Pass            | This phase's validation run                                                                                                      |
| `npm run test` (full suite)                                                       | Pass            | 972/972 tests, 196 files (LAN-10 ledger entry)                                                                                   |
| `npm run test -- src/core/lanShare`                                               | Pass            | 91/91 tests, 19 files                                                                                                            |
| `npm run build` (renderer+main)                                                   | Pass            | This phase's validation run                                                                                                      |
| `npm run build:linux` (AppImage/snap/deb)                                         | **Not run**     | Needs a real Linux host; cannot be exercised from this Windows dev environment                                                   |
| Real two-process-equivalent transfer test                                         | Pass            | `LanShareService.test.ts`'s real two-`LanShareService`-instance loopback gRPC test (LAN-6, still passing after LAN-9/10 changes) |
| Decompression-bomb guard                                                          | Pass            | New LAN-10 test                                                                                                                  |
| Receive-side disk-fill guard                                                      | Pass            | LAN-10 fix, covered by the same real two-service test (legitimate transfers still complete)                                      |
| No WAN exposure by default                                                        | Pass            | LAN-9 `lanBoundary.ts` enforcement + test                                                                                        |
| No native dependency / packaging blocker                                          | Pass            | This phase's SBOM review                                                                                                         |
| Project license declared                                                          | **Open**        | Carried forward from LAN-0 §2 — a maintainer decision, not an engineering task                                                   |
| Live Warpinator/Winpinator binary interop                                         | **Open**        | No such client available in this dev environment (LAN-10)                                                                        |
| Firewall Assistant / VPN detection / systemd unit / Resource Governor integration | **Open, named** | LAN-9 — each needs either a real SteamOS host or a not-yet-built shared subsystem                                                |
| Code signing                                                                      | **Open**        | Needs the project's actual signing keys, which do not exist in this session                                                      |

## 5. Outcome

LAN-11 closes the packaging/SBOM/documentation work that is genuinely actionable from this dev environment. What remains open is consistently the same small set of items already named across LAN-9/LAN-10: a real SteamOS target machine, the project's signing keys, a maintainer license decision, and a live external Warpinator/Winpinator client to test against. None of these are silently dropped — each has a named owner-class (maintainer decision vs. infrastructure vs. external dependency) so a future session or maintainer knows exactly what unblocks it.
