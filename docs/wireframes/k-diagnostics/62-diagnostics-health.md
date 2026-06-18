# 62. Diagnostics / Health Check

**Category:** K — Diagnostics  
**Complexity:** Tier 3  
**Status:** Exists (`features/diagnostics/DiagnosticsView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Inspect app health across all subsystems and export diagnostic bundles for debugging or support.

---

## Primary User Goal

Quickly identify which subsystem is unhealthy and export a diagnostic package.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Diagnostics                           [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER ZONE]                                                         │
│ Rail │  Diagnostics                           [▶ Run Check]  [↓ Export]       │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [HEALTH SUMMARY STRIP — 6 metric tiles]                               │
│      │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐         │
│      │  │ IPC  │  │ Rend │  │ Main │  │ Model│  │ Stor │  │ Net  │         │
│      │  │ 🟢   │  │ 🟢   │  │ 🟢   │  │ 🟡   │  │ 🟢   │  │ 🔴   │         │
│      │  │Ready │  │Ready │  │Ready │  │Slow  │  │Healthy│  │Error │         │
│      │  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘         │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [TABS]                                                                │
│      │  [Overview]  [IPC Bridge]  [Renderer]  [Runtime]  [Storage]  [Logs]   │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [TAB CONTENT — scrollable]                                            │
│      │                                                                        │
│      │  Overview tab:                                                         │
│      │  ┌─────────────────────────────────────────────────────────────────┐  │
│      │  │  IPC Bridge                                          🟢 Ready   │  │
│      │  │  Bridge URL: http://localhost:9477   Latency: 12ms              │  │
│      │  │  ─────────────────────────────────────────────────────────────  │  │
│      │  │  Model Runtime                                        🟡 Slow   │  │
│      │  │  Provider: Gemini  Model: gemini-2.5-flash  Avg: 2.4s          │  │
│      │  │  [Check model health →]                                         │  │
│      │  │  ─────────────────────────────────────────────────────────────  │  │
│      │  │  Network                                              🔴 Error  │  │
│      │  │  Error: DNS resolution failed for api.gemini.ai                 │  │
│      │  │  [View network logs →]                                          │  │
│      │  └─────────────────────────────────────────────────────────────────┘  │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Expand  [B] Back  [X] Run Check  [Y] Export          │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Header | `Panel` eyebrow | Title + Run Check + Export buttons | Sticky |
| Health Summary Strip | `MetricCard` × 6 | IPC / Renderer / Main Process / Model / Storage / Network | Color-coded: green/amber/red; click → jumps to tab |
| Tabs | `TabGroup` / `TabList` | Overview, IPC Bridge, Renderer, Runtime, Storage, Logs | 6 tabs |
| Tab Content | `Panel` + subsystem rows | Per-subsystem details | Scrollable |

---

## Health Check Items (per subsystem)

### IPC Bridge
- Bridge URL + port
- Latency (ms)
- WebSocket connection state
- Last event received
- Uptime
- Error count (last 1h)

### Renderer Health
- FPS / jank detection
- Memory usage (MB)
- Active React components count
- Suspended components
- Error boundary hits

### Main Process Health
- Electron main process status
- IPC channel queue depth
- Crash log count
- Last crash timestamp

### Model Runtime
- Active provider
- Active model
- Average response time
- Token throughput
- Runtime errors (last 10)
- VRAM / RAM estimate

### Storage
- Total disk space
- NEURODECK data dir usage (breakdown: sessions / memory / models / exports / logs / cache)
- Free space
- Read/write test result

### Network
- Internet connectivity (ping google.com)
- DNS resolution (provider endpoint)
- Proxy settings
- VPN active (if applicable)
- API endpoint reachability (Gemini/Ollama)

---

## Primary Action

**Label:** ▶ Run Check  
**IPC:** `window.neurodeck.diagnostics.runHealthCheck()`  
**Outcome:** Re-fetches all subsystem states; tiles animate to new values

---

## Secondary Actions

- **↓ Export** — `window.neurodeck.system.generateSupportBundle()` → ZIP file → toast with "Open file" action
- **Tab navigation** — view per-subsystem deep-dive
- **Log preview links** — jump to Logs tab or Logs Viewer (#64)
- **Fix links** — "Check model health →", "View network logs →" in subsystem rows

---

## States

### Idle (not yet run)
- Tiles show last-known state (from startup checks)
- "Run Check" prominent

### Running Checks
- Tiles animate (pulse) while checking
- "Run Check" button shows spinner + "Checking…"
- Tab content shows `Skeleton` rows

### Healthy (all green)
- All 6 tiles green
- Toast (auto): "All systems healthy"

### Warning (≥1 amber)
- Amber tile(s) highlighted
- Warning detail shown in Overview tab
- "Run Check" still available

### Critical (≥1 red)
- Red tile(s) highlighted with pulse
- `ErrorState` banner at top: "Critical issue detected in [subsystem]"
- "Export Diagnostics" promoted to prominent action

### Exporting Logs
- Button shows "Exporting…" + spinner
- Toast on complete: "Diagnostics exported" + "Open File" action

### Export Complete
- Toast persists 8s with "Open File" and "Copy Path" actions

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.diagnostics` | `runHealthCheck()`, `getHealthSummary()`, `getLogs()` |
| `window.neurodeck.system` | `generateSupportBundle()`, `getStorageStatus()` |
| `window.neurodeck.models` | `getRuntimeStatus()` |
| `/health` | Direct HTTP poll for IPC bridge check |

---

## Controller Navigation

- **D-pad Left/Right:** Switch tabs
- **D-pad Up/Down:** Navigate subsystem rows within active tab
- **A (confirm):** Expand subsystem detail row / activate fix link
- **B:** Back to previous view
- **X:** Run health check
- **Y:** Export diagnostics
- **Hint bar:** `[A] Expand  [B] Back  [X] Run Check  [Y] Export`

---

## Keyboard / Mouse Fallback

- **Tab:** Navigate health tiles → tab strip → content rows
- **Arrow keys:** Navigate tab strip horizontally; navigate subsystem rows vertically
- **Enter / Space:** Expand row / activate link
- **Escape:** Navigate back

---

## Accessibility Notes

- Health tiles: `role="status"`, `aria-label="[Subsystem]: [status]"` — color not sole indicator
- Tabs: `TabGroup` compound component (keyboard: Arrow keys, Home/End)
- Subsystem rows: `role="article"` or list + `aria-expanded` on expandable rows
- Live region: `aria-live="polite"` on health summary strip — announces after check completes
- Running state: `aria-busy="true"` on summary strip
- Error severity: `role="alert"`, `aria-live="assertive"` for critical issues

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/diagnostics/DiagnosticsView.tsx` (exists)

**Reuse:**
- `MetricCard` for health tiles
- `Tabs` compound component for tab strip
- `Panel` for subsystem rows
- `StatusChip` (tone: success/warning/error) per subsystem
- `EmptyState` for no-log states
- `ErrorState` for critical issues

**Health check hook:**
```typescript
const { health, loading, run } = useHealthCheck()
// health: HealthCheckResult | null
// loading: boolean
// run: () => Promise<void>
```

**Auto-run:** Run health check automatically on view mount; re-run on WebSocket `health:degraded` event.

**Export bundle:** `generateSupportBundle()` returns a file path; use Electron `shell.openPath()` or show copy path toast.
