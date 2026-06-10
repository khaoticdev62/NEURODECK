# NEURODECK v1.0 Production Release Gates

This checklist is a blocking gate list for NEURODECK v1.0. If any MUST gate fails, the release does not ship.

## Gate 1 — App Launch

- [ ] Launches on Steam Deck Desktop Mode
- [ ] Launches from Steam Deck Game Mode as non-Steam app
- [ ] Launches on Windows 11
- [ ] Launches on desktop Linux
- [ ] macOS build launches or is explicitly marked beta
- [ ] Missing config opens onboarding/safe setup
- [ ] Prior crash opens safe mode option

## Gate 2 — Electron Security

- [ ] `nodeIntegration: false`
- [ ] `contextIsolation: true`
- [ ] `sandbox: true` where compatible
- [ ] No direct renderer filesystem access
- [ ] No arbitrary shell IPC
- [ ] No `lua:runFile` or equivalent raw execution IPC
- [ ] All IPC channels are allowlisted
- [ ] All IPC payloads are schema validated
- [ ] CSP exists in production build
- [ ] Remote content is blocked by default

## Gate 3 — Secrets and Privacy

- [ ] Raw secrets are write-only from renderer perspective
- [ ] Renderer cannot retrieve raw API keys
- [ ] Logs redact secret-like values
- [ ] Session export excludes secrets
- [ ] Diagnostics export redacts secrets
- [ ] Local telemetry only by default

## Gate 4 — Core AI Workflow

- [ ] User can create/open session
- [ ] User can select model/provider
- [ ] User can send prompt
- [ ] User can receive response
- [ ] User can cancel generation
- [ ] Provider failure shows recoverable error
- [ ] Session persists after restart

## Gate 5 — Steam Deck UX

- [ ] 1280×800 layout passes
- [ ] Critical path works controller-only
- [ ] No focus traps
- [ ] Virtual keyboard works for prompt input
- [ ] Touchscreen works as fallback
- [ ] Docked 1080p layout passes
- [ ] Suspend/resume preserves state
- [ ] Text readable at handheld distance

## Gate 6 — Hermes Extensions

- [ ] Extension registry loads
- [ ] Invalid extension manifest does not crash app
- [ ] New extension installs as untrusted
- [ ] Trust flow shows permissions
- [ ] Dangerous permissions are flagged
- [ ] Trusted declared command can run
- [ ] Untrusted command cannot run
- [ ] Extension failure does not crash app

## Gate 7 — Accessibility

- [ ] Keyboard-only navigation works
- [ ] Controller-only navigation works
- [ ] Visible focus state exists
- [ ] Reduced motion works
- [ ] High contrast theme works
- [ ] No information conveyed by color alone
- [ ] Core controls have accessible labels

## Gate 8 — Packaging

- [ ] Linux AppImage generated
- [ ] Windows package generated
- [ ] macOS package generated or documented as beta/deferred
- [ ] SHA256 checksums generated
- [ ] Install instructions complete
- [ ] Known issues documented

## Gate 9 — Final Ship Rule

- [ ] 100% MUST requirements pass
- [ ] 0 critical security issues
- [ ] 0 data-loss bugs
- [ ] 0 blocking Steam Deck Game Mode issues
- [ ] Release notes complete
