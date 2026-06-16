# NEURODECK Folder Structure and Build Layout v1.0

**Project:** NEURODECK  
**Document Type:** Repository Layout Specification  
**Version:** 1.0  

---

## 1. Canonical Folder Tree

```text
neurodeck/
  src/
    main/
    preload/
    renderer/
    shared/
  resources/
  scripts/
  tests/
  docs/
```

---

## 2. Main Process Layout

```text
src/main/
  index.ts
  app/
  windows/
  ipc/
  services/
  security/
  platform/
```

### Rules

- Only main process code may import `electron/main`, `fs`, `child_process`, or other privileged Node modules.
- `src/main/ipc` owns IPC handler registration.
- `src/main/services` owns app domain logic.
- `src/main/security` owns CSP, navigation policy, permissions, and redaction.

---

## 3. Preload Layout

```text
src/preload/
  index.ts
  exposeApi.ts
  apiTypes.ts
```

### Rules

- Preload must stay small.
- Do not implement business logic in preload.
- Do not expose `ipcRenderer`.
- Do not expose Node globals.
- Every exposed method maps to a typed IPC call.

---

## 4. Renderer Layout

```text
src/renderer/
  main.tsx
  App.tsx
  routes/
  components/
  design-system/
  state/
  hooks/
  lib/
  styles/
```

### Rules

- Components do not import Electron.
- Domain hooks wrap `window.neurodeck`.
- Design tokens live in CSS variables and Tailwind config.
- Route components own screen-level data loading.

---

## 5. Shared Layout

```text
src/shared/
  contracts/
  schemas/
  constants/
  types/
```

### Rules

- Shared code must be side-effect-light.
- Shared code can define types, constants, and schemas.
- Shared code must not import Electron or React.

---

## 6. Resources Layout

```text
resources/
  icons/
  fonts/
  steamdeck/
  hermes/
```

Steam Deck resources must include:

```text
neurodeck.desktop
launch-neurodeck.sh
steam-input-template.vdf
```

---

## 7. Scripts Layout

```text
scripts/
  dev/
  build/
  package/
  release/
  steamdeck/
```

Scripts must be idempotent where possible and safe by default. Steam Deck scripts must not require disabling readonly SteamOS for normal use.
