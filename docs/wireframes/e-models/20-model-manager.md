# 20. Model Manager

**Category:** E — Models  
**Complexity:** Tier 3  
**Status:** Exists (`features/models/ModelsView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Manage local and remote AI models — configure providers, set defaults, check health, and import new models.

---

## Primary User Goal

Confirm which model is active, check it's healthy, and switch if needed.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Models                                [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER ZONE]                                                         │
│ Rail │  Models                       [Health Check]  [Import Model]           │
│      ├──────────────┬──────────────────────────────────────────────────────────┤
│      │  [TABS]      │                                                         │
│      │  [Local]     │  Local Models                                           │
│      │  [Remote]    │  ─────────────────────────────────────────────────────  │
│      │  [Providers] │  ┌──────────────────────────────────────────────────┐   │
│      │  [Runtime]   │  │ 🟢  gemini-2.5-flash          Active ★ Default   │   │
│      │              │  │     Provider: Gemini  ·  Context: 128k tokens    │   │
│      │              │  │     Avg latency: 1.8s  ·  Last used: 2m ago      │   │
│      │              │  │     [Set Default]  [Health Check]  [Remove]       │   │
│      │              │  └──────────────────────────────────────────────────┘   │
│      │              │                                                         │
│      │              │  ┌──────────────────────────────────────────────────┐   │
│      │              │  │ 🟡  llama3-8b-q4.gguf         Local  Idle        │   │
│      │              │  │     Runtime: Ollama  ·  Size: 4.7GB              │   │
│      │              │  │     RAM est: 6GB  ·  VRAM est: 4GB               │   │
│      │              │  │     [Activate]  [Health Check]  [Remove]          │   │
│      │              │  └──────────────────────────────────────────────────┘   │
│      │              │                                                         │
│      │              │  [+ Import Model]  [Browse Catalog →]                   │
│      │              │                                                         │
│      │  [RUNTIME    │  Runtime Settings                                       │
│      │   SUMMARY]   │  Threads: 8  ·  Context: 32k  ·  GPU: CUDA active      │
│      │              │  [Open Runtime Settings →]                              │
├──────┴──────────────┴──────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Activate  [B] Back  [X] Health Check  [Y] Import      │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Header | `Panel` | Title + Health Check + Import Model buttons | Sticky |
| Tab Nav | `TabGroup` | Local / Remote / Providers / Runtime | Vertical tabs on left at 1280px |
| Model List | `ModelCard` list | Model cards with status, metadata, actions | Main scrollable content |
| Runtime Summary | `Panel` compact | Thread count, context size, GPU status | Below model list |

---

## Model Card Structure

```
┌──────────────────────────────────────────────────────────┐
│  [●] [Model name/ID]               [Status chip]  [★]   │
│  Provider: [name]  ·  Context: [N]k tokens               │
│  [Local: Size + RAM/VRAM est] OR [Remote: Latency]       │
│  Last used: [timestamp] if applicable                    │
│  ─────────────────────────────────────────────────────── │
│  [Activate]  [Health Check]  [Set Default]  [Remove]      │
└──────────────────────────────────────────────────────────┘
```

**Status dot colors:**
- Green `●` — active/ready
- Amber `●` — slow response / warning
- Red `●` — error / unavailable
- Gray `●` — idle (not currently loaded)

---

## Tab Content

### Local (Ollama models)
- Lists models available in Ollama runtime
- Import via file picker (opens #21 wizard)
- Browse catalog link (opens #25)

### Remote (API-backed models)
- Lists configured remote models (Gemini, OpenAI-compat)
- Shows provider connection state per model
- "Provider not configured" state if key missing

### Providers
- Inline provider list (condensed #22)
- Add/edit provider button → opens Provider Manager drawer

### Runtime
- Inline runtime settings (condensed #24)
- Thread count, context length, hardware acceleration
- "Open full settings →" link

---

## Primary Action

**Label:** Activate  
**IPC:** `dispatch({ type: "set-active-model", modelId })` + `window.neurodeck.models.setDefault(id)`  
**Outcome:** Active model updated in title bar model pill; Toast "Active model: [name]"

---

## Secondary Actions

- **Import Model** — opens Local Model Import Wizard (#21)
- **Health Check** — `window.neurodeck.models.checkHealth(id)` → inline result on card
- **Set Default** — marks model as default for new sessions
- **Remove** — `ConfirmDialog` → `window.neurodeck.models.delete(id)` (local only)
- **Browse Catalog →** — opens Model Marketplace (#25) in same view (tab switch)

---

## States

### No Local Model
- Local tab: `EmptyState`: "No local models installed. Import a GGUF/ONNX file or connect Ollama."
- Import Model button prominent

### Provider Not Configured
- Remote tab: `EmptyState`: "No provider configured. Add an API key to connect remote models."
- "Add Provider →" action button

### Runtime Unavailable
- All local model cards show `StatusChip` tone `error` "Runtime unavailable"
- "Start Ollama" button (calls `window.neurodeck.models.startRuntime()`)

### Model Health Checking
- Card shows spinner on health check button
- Status dot animates during check

### Model Ready
- Green dot, all actions available

### Model Failed
- Red dot, `StatusChip` "Error"
- "View Error →" link; health check button → shows error details inline

### Connector Required
- Model card for remote: amber badge "API key required" with link to API Key Vault (#23)

---

## IPC Dependencies

| Connector | Commands Used | Events |
|-----------|--------------|--------|
| `window.neurodeck.models` | `list()`, `checkHealth(id)`, `setDefault(id)`, `delete(id)`, `importModel()`, `getRuntimeStatus()` | `model:status`, `model:imported` |
| `window.neurodeck.ollama` | `list()`, `pull()`, `delete()` | — |

---

## Controller Navigation

- **D-pad Up/Down:** Navigate model cards
- **D-pad Left/Right:** Switch tabs (vertical tab list on left)
- **A (confirm):** Activate focused model
- **B:** Back to previous view
- **X:** Health check focused model
- **Y:** Import model
- **LB / RB:** Scroll model list
- **Hint bar:** `[A] Activate  [B] Back  [X] Health  [Y] Import`

---

## Keyboard / Mouse Fallback

- **Tab:** Navigate tab list → model cards → runtime summary
- **Arrow keys:** Navigate tab list (vertical), model cards (vertical)
- **Enter:** Activate focused model

---

## Accessibility Notes

- Model cards: `role="article"`, `aria-label="[model name], [status]"`
- Status dot: `aria-label="Status: [text]"` — not color-only
- Default star: `aria-label="Default model" aria-pressed="[true/false]"`
- Live region: `aria-live="polite"` on active model display — announces model changes
- Health check result: `aria-live="polite"` inline on card

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/models/ModelsView.tsx` (exists)

**Reuse:**
- `ModelCard` primitive (exists)
- `Tabs` compound component
- `StatusChip` for health status
- `EmptyState` for no-models states
- Local Model Import Wizard (#21) as modal
