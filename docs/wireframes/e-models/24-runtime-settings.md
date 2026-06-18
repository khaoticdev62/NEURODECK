# 24. Runtime Settings

**Category:** E — Models  
**Complexity:** Tier 2  
**Status:** Partial (`features/settings/panels/PerformancePanel.tsx`)  
**Shell:** Settings panel or Model Manager tab

---

## Purpose

Configure how the AI model runtime behaves — thread count, context length, temperature defaults, and hardware acceleration.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Runtime Settings                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Runtime                    [Ollama (local)  ▾]                              │
│                                                                              │
│  Context Length             [32,768 tokens   ▾]                              │
│                                                                              │
│  Temperature                [━━━━━━◉━━━━━━━]  0.7                           │
│  (0 = deterministic, 2 = creative)                                          │
│                                                                              │
│  CPU Threads                [ 8              ]                               │
│                                                                              │
│  Hardware Acceleration                                                       │
│  CUDA available             🟢 Yes (NVIDIA RTX 3060)                         │
│  GPU Layers                 [━━━━━━━━◉━━━]  32 / 40                         │
│  Metal (macOS)              Not available on this device                    │
│                                                                              │
│  RAM Estimate               6.2 GB for current model at 32k context          │
│  VRAM Estimate              3.8 GB for 32 GPU layers                         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [Reset to Safe Defaults]                                [Save]             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Fields

| Field | Component | Range / Options | Notes |
|-------|-----------|----------------|-------|
| Runtime | `Select` | Ollama / llama.cpp / Gemini (inference mode) | Restarts runtime on change |
| Context Length | `Select` | 2k / 4k / 8k / 16k / 32k / 64k / 128k | Affects RAM; capped by model max |
| Temperature | Slider | 0.0 – 2.0, step 0.1 | Shows numeric value alongside |
| CPU Threads | Number input | 1 – [system core count] | Auto-detected default |
| GPU Layers | Slider | 0 – [model layer count] | 0 = CPU only; shown only if GPU available |

---

## Primary Action

**Label:** Save  
**IPC:** `window.neurodeck.system.saveConfig({ runtime: {...} })`  
**Outcome:** Config saved; Toast "Runtime settings saved"; may require model restart

---

## Secondary Actions

- **Reset to Safe Defaults** — resets to: threads=4, context=8k, temp=0.7, GPU layers=0

---

## States

### Runtime Ready
- All sliders enabled; estimates shown

### Hardware Acceleration Unavailable
- GPU section shows gray "Not available" text
- GPU Layers slider hidden

### Restart Required
- `Badge` "Restart required" next to Runtime selector if changed
- Banner: "Some runtime changes require reloading the model"

### Save Failed
- `ErrorState`: "Could not save runtime settings"

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.models` | `getRuntimeStatus()` — for GPU availability |
| `window.neurodeck.system` | `getConfig()`, `saveConfig()` |

---

## Accessibility Notes

- Sliders: `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-label`
- RAM/VRAM estimates: `aria-live="polite"` — update when sliders change

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/settings/panels/PerformancePanel.tsx` (exists — extend)

RAM/VRAM estimates are calculated client-side from a formula: `modelSizeGB + (contextTokens / 1000) * 0.002`. Show as "approx." to set expectations.
