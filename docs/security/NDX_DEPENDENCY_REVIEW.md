# NeuroDeck OS Dependency Review

Date: 2026-06-28

Scope: Epic X15 dependency review for the current `package.json` / `package-lock.json` tree on branch `epic10/remote-systems-backend`.

## Summary

- Production audit: `npm audit --omit=dev` reports 0 vulnerabilities.
- Full audit: `npm audit` reports 5 vulnerabilities in the Vitest/Vite/esbuild dev-server toolchain.
- Runtime dependency count: 17 direct production dependencies.
- Native runtime dependency: `node-pty`.
- Current decision: do not run `npm audit fix --force` in this slice because it upgrades Vitest from v2 to v4 and is a breaking test-toolchain change. Track it as a dev-tooling upgrade, not a shipped-app production vulnerability.

## Commands Run

```text
npm audit --omit=dev
-> found 0 vulnerabilities

npm audit
-> 5 vulnerabilities (3 moderate, 1 high, 1 critical)
-> affected chain: vitest -> vite/vite-node/@vitest/mocker -> esbuild
-> fix requires npm audit fix --force, installing vitest@4.1.9

npm.cmd ls --omit=dev --depth=0
-> 17 direct production dependencies
```

## Production Dependencies

| Package | Version | Runtime role | Review note |
| --- | ---: | --- | --- |
| `@electron-toolkit/utils` | 4.0.0 | Electron app utilities | Runtime Electron helper. No production advisories from audit. |
| `@grpc/grpc-js` | 1.14.4 | LAN Share gRPC transport | Pure JS gRPC implementation; covered in LAN Share SBOM. |
| `@grpc/proto-loader` | 0.8.1 | LAN Share protobuf loading | Pure JS protobuf loader; covered in LAN Share SBOM. |
| `@monaco-editor/react` | 4.7.0 | Build Studio editor integration | Renderer-only editor wrapper. Keep Monaco locally bundled. |
| `@xterm/addon-fit` | 0.11.0 | Terminal viewport sizing | Renderer terminal add-on. |
| `@xterm/addon-search` | 0.16.0 | Terminal search | Renderer terminal add-on. |
| `@xterm/xterm` | 6.0.0 | Terminal renderer | Renderer terminal emulator. |
| `bonjour-service` | 1.4.2 | LAN Share mDNS | Network discovery package; covered in LAN Share SBOM. |
| `clsx` | 2.1.1 | Renderer class composition | Small utility dependency. |
| `diff` | 9.0.0 | Git/recovery diff views | Text diff library. |
| `monaco-editor` | 0.55.1 | Build Studio editor | Locally bundled; do not switch to CDN. |
| `node-pty` | 1.1.0 | Real PTY terminal sessions | Native dependency; packaging must continue to verify rebuild/install on target OS. |
| `react-router-dom` | 7.18.0 | Renderer routing | App navigation. |
| `selfsigned` | 5.5.0 | LAN Share certificate generation | Used for local Warpinator-compatible certs; covered in LAN Share SBOM. |
| `ssh2` | 1.17.0 | Remote SSH sessions | Network/crypto dependency; secrets remain encrypted at rest and never sent to renderer. |
| `tweetnacl` | 1.0.3 | LAN Share group-code crypto | Small audited crypto primitive; covered in LAN Share SBOM. |
| `zod` | 4.4.3 | Runtime IPC validation | Load-bearing validation dependency shared across main/preload/renderer. |

## Dev-Only Vulnerabilities

The full audit finding is confined to `vitest` and its dev-server stack:

- `vitest <= 3.2.5`
- `vite <= 6.4.2`
- `vite-node <= 2.2.0-beta.2`
- `@vitest/mocker <= 3.0.0-beta.4`
- `esbuild <= 0.24.2 || 0.27.3 - 0.28.0`

Impact in plain English: these advisories matter when an untrusted website can reach a development server and read responses or, on Windows, abuse the dev server path handling. The packaged NeuroDeck app does not ship the Vite/Vitest dev server. Local development should still keep dev servers bound to trusted localhost interfaces.

Fix status: `npm audit fix --force` would install `vitest@4.1.9`, a breaking major upgrade. That needs its own test-toolchain migration pass with full unit/e2e verification.

## Decisions

1. Treat production dependency posture as clean for this review because `npm audit --omit=dev` is clean.
2. Track the Vitest/Vite/esbuild chain as a dev-tooling risk, not a production shipped-app risk.
3. Do not force-upgrade Vitest in this slice.
4. Keep `node-pty` as a named packaging risk because it is the direct native dependency backing the real terminal.
5. Keep Monaco locally bundled; the existing `dompurify` override remains the first place to check for Monaco transitive CVEs.

## Follow-Up

- Plan a dedicated Vitest v4 migration if the dev-server advisories need to be fully cleared from `npm audit`.
- Keep `npm audit --omit=dev` in the release gate.
- Include native-module verification for `node-pty` in SteamOS/Linux package validation.
