# 25. Model Marketplace / Catalog

**Category:** E — Models  
**Complexity:** Tier 2  
**Status:** New — panel in Model Manager (`features/models/ModelCatalogPanel.tsx`)  
**Shell:** Tab inside Model Manager

---

## Purpose

Browse available model profiles and import/download compatible models — without falsely implying live downloads are guaranteed.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Model Catalog                                                               │
│  [Search models…]  [Type ▾]  [Size ▾]  [Quantization ▾]                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [MODEL CARD GRID — 2-col]                                                  │
│                                                                              │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐       │
│  │ Llama 3 8B Instruct           │  │ Mistral 7B Instruct           │       │
│  │ Meta · GGUF · Q4_K_M          │  │ Mistral AI · GGUF · Q4_K_M   │       │
│  │ Size: 4.7GB  RAM: ~6GB        │  │ Size: 4.1GB  RAM: ~5.5GB     │       │
│  │ Context: 128k                 │  │ Context: 32k                 │       │
│  │ [Compatible ✓]                │  │ [Compatible ✓]               │       │
│  │ [↓ Import via Ollama]         │  │ [↓ Import via Ollama]        │       │
│  └───────────────────────────────┘  └───────────────────────────────┘       │
│                                                                              │
│  ┌───────────────────────────────┐                                          │
│  │ Phi-3 Mini 3.8B               │                                          │
│  │ Microsoft · GGUF · Q4         │                                          │
│  │ Size: 2.2GB  RAM: ~3GB        │                                          │
│  │ [⚠ Connector required]        │                                          │
│  └───────────────────────────────┘                                          │
│                                                                              │
│  ⚠ Catalog requires internet connection. Downloads go through Ollama.       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Model Card Structure

```
┌──────────────────────────────────────────────────┐
│  [Model name]                   [Compat chip]    │
│  [Org] · [Format] · [Quant]                      │
│  Size: [N]GB  RAM est: [N]GB                     │
│  Context: [N]k  ·  License: [type]               │
│  [Action button]                                 │
└──────────────────────────────────────────────────┘
```

**Action buttons:**
- "↓ Import via Ollama" — runs `window.neurodeck.ollama.pull(modelName)` → progress in Model Manager Local tab
- "↓ Download GGUF" — opens file save dialog (requires browser or system download)
- "⚠ Connector required" — Ollama not running; link to setup

---

## States

### Catalog Available
- Grid of model profiles (static catalog; bundled or fetched from config)

### Connector Required (Ollama not running)
- All "Import via Ollama" buttons replaced with "Start Ollama →"
- Disclaimer: "Ollama must be running to import models"

### No Results
- `EmptyState` compact: "No models match your filters"

### Download Blocked (large file warning)
- Modal before starting: "This model is [N]GB. Ensure you have [N+2]GB free. Continue?"

### Storage Warning
- `Badge` tone `warning` on card: "Low disk space" if < model size + 2GB free

### Import Running
- Progress indicator appears in Model Manager Local tab (not in catalog — don't block catalog browsing)

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.ollama` | `pull(modelId)`, `list()` — check if already installed |
| `window.neurodeck.system` | `getStorageStatus()` — for space estimates |

---

## Accessibility Notes

- Cards: `role="article"`, `aria-label="[model name], [size]GB, [compatibility]"`
- Import button: `aria-label="Import [model name] via Ollama"`
- Compat chip: `aria-label="Compatible with this system"` or `"Incompatible: [reason]"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/models/ModelCatalogPanel.tsx` — **New file**

**Catalog source:** Static JSON bundled with app at `assets/model-catalog.json` — updated with app releases. Not a live API call (no implied live availability).

```typescript
// model-catalog.json entry:
{
  "id": "llama3-8b-instruct",
  "name": "Llama 3 8B Instruct",
  "org": "Meta",
  "format": "GGUF",
  "quantization": "Q4_K_M",
  "sizeGB": 4.7,
  "ramGB": 6,
  "contextK": 128,
  "ollamaId": "llama3:8b-instruct-q4_K_M",
  "license": "Meta Llama 3 License"
}
```

**Pull via Ollama:**
```typescript
await window.neurodeck.ollama.pull(model.ollamaId)
// Shows progress in Model Manager local tab via ollama:progress WS event
```
