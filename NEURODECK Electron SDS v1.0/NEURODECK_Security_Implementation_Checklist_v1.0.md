# NEURODECK Security Implementation Checklist v1.0

**Project:** NEURODECK  
**Document Type:** Security Implementation Checklist  
**Version:** 1.0  

---

## 1. Electron Hardening

- [ ] `contextIsolation: true` in every production BrowserWindow
- [ ] `nodeIntegration: false` in every production BrowserWindow
- [ ] `sandbox: true` in every production BrowserWindow
- [ ] `webSecurity: true`
- [ ] `allowRunningInsecureContent: false`
- [ ] no remote module usage
- [ ] no raw `ipcRenderer` exposed
- [ ] no Node globals exposed to renderer
- [ ] navigation deny policy implemented
- [ ] `setWindowOpenHandler` validates external links
- [ ] production UI loaded from packaged assets
- [ ] CSP implemented

---

## 2. IPC Security

- [ ] every channel listed in IPC registry
- [ ] every request has Zod schema
- [ ] every response uses `Result<T>`
- [ ] no generic shell IPC
- [ ] no generic filesystem IPC
- [ ] no raw secret getter
- [ ] unknown channels inaccessible from renderer API
- [ ] invalid payloads return typed errors
- [ ] payload logs are redacted

---

## 3. Secrets

- [ ] secrets stored in OS keychain where available
- [ ] encrypted local fallback documented
- [ ] renderer receives secret status metadata only
- [ ] diagnostics exclude secrets
- [ ] logs redact tokens, passwords, keys, cookies, auth headers
- [ ] provider request logging redacts auth data

---

## 4. Hermes and Plugin Security

- [ ] extensions require manifest
- [ ] untrusted extensions cannot execute
- [ ] permissions are declared
- [ ] shell execution disabled by default
- [ ] network disabled by default
- [ ] filesystem scope enforced
- [ ] commands must be declared
- [ ] command args validated
- [ ] risky actions require explicit confirmation

---

## 5. Release Blockers

Block release if any of these are true:

- [ ] production renderer has Node integration
- [ ] context isolation disabled
- [ ] sandbox disabled without ADR
- [ ] raw IPC exposed to renderer
- [ ] secrets appear in logs
- [ ] untrusted Hermes extension executes
- [ ] app can navigate to arbitrary remote content
- [ ] high/critical dependency vulnerability has no waiver
- [ ] package lacks checksum
