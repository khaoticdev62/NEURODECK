# 63. Telemetry Dashboard

**Category:** K — Diagnostics  
**Complexity:** Tier 2  
**Status:** New — panel in DiagnosticsView  
**Shell:** Full App Shell (Diagnostics sub-tab)

---

## Purpose

View real-time and historical performance metrics: CPU, memory, API latency, model inference speed, and IPC throughput.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Diagnostics › Telemetry               [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [TABS]                                                                 │
│ Rail │  Overview · IPC Bridge · Renderer · Runtime · Storage · Logs · Telemetry│
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  === TELEMETRY TAB ===                                                  │
│      │                                                                         │
│      │  [TIME RANGE]  [Last 5m ▼]  [↺ Refresh]              [Export CSV]     │
│      │                                                                         │
│      │  [METRIC CARDS ROW]                                                     │
│      │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│      │  │  CPU         │ │  RAM         │ │  API Latency │ │  Tokens/sec  │  │
│      │  │   12%        │ │  1.2 GB      │ │   142 ms     │ │    32 t/s    │  │
│      │  │  ▁▂▄▃▂▁▃▄   │ │  ▂▃▄▅▄▃▃▄   │ │  ▂▁▁▃▂▁▁▂   │ │  ▄▅▆▅▄▅▆▅   │  │
│      │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│      │                                                                         │
│      │  [IPC THROUGHPUT]                                                       │
│      │  WebSocket events/sec: 8    │  HTTP requests/min: 42                  │
│      │  ████████████░░░░░░░░░░░░ (sparkline)                                 │
│      │                                                                         │
│      │  [MODEL PERFORMANCE]                                                    │
│      │  Last 10 inferences:                                                   │
│      │  Avg TTFT: 287ms  ·  Avg TPS: 34  ·  Avg tokens: 847                  │
│      │  Slowest: 1.2s (session "Rust debugging")                              │
│      │                                                                         │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Export  [B] Back  [X] Refresh  [Y] Change Range      │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Export CSV  
**IPC:** `window.neurodeck.diagnostics.exportTelemetry(range, format)` → saves file  
**Outcome:** CSV file downloaded with telemetry data

---

## Secondary Actions

- **Time range** — Last 5m / 15m / 1h / 6h / 24h
- **↺ Refresh** — re-fetches current metrics

---

## States

### Live Mode
- Metric cards update every 2s via WebSocket `telemetry:update` events

### Telemetry Off
- `EmptyState` info: "Telemetry data collection is disabled in Privacy settings."
- "Enable Telemetry" link → navigates to Privacy Center

### No Historical Data
- Charts empty for longer time ranges: "No data for selected period"

---

## IPC Dependencies

| Connector | Commands / Events |
|-----------|-----------------|
| `window.neurodeck.diagnostics` | `getTelemetry(range)`, `exportTelemetry(range, fmt)` |
| WebSocket | `telemetry:update { cpu, ram, apiLatency, tokensPerSec, ipcEvents }` |

---

## Accessibility Notes

- Metric cards: `MetricCard` components with `aria-label="[Metric]: [value]"`
- Sparklines: `role="img"`, `aria-label="[Metric] over time: [trend description]"` — no interactive elements
- `aria-live="off"` on fast-updating metric values (announce only on significant threshold changes)

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/diagnostics/TelemetryDashboardTab.tsx` — **New tab panel in DiagnosticsView**

Sparkline charts implemented with inline `<svg>` using `polyline` element (no chart library). Metrics come from `getSystemHealth()` extended to include inference timing. TTFT = Time To First Token.
