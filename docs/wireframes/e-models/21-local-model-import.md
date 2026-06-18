# 21. Local Model Import Wizard

**Category:** E — Models  
**Complexity:** Tier 2  
**Status:** New — Modal wizard opened from Model Manager  
**Shell:** Modal (size `lg`, over Model Manager)

---

## Purpose

Import a local GGUF/ONNX model file safely, with compatibility checking and storage estimation before committing.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Import Local Model                                            Step 1 of 4   │
│  ━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [STEP CONTENT]  (changes per step)                                          │
│                                                                              │
│  Step 1 — Select File                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  [Drop a .gguf or .onnx file here]                                  │    │
│  │  or  [Browse…]                                                      │    │
│  │  Supported: GGUF (llama.cpp), ONNX (for future use)                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  [Cancel]                                           [← Back]  [Next →]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Wizard Steps

### Step 1 — Select File
- Drop zone + Browse button
- Supported format note: `.gguf` (llama.cpp), `.onnx`
- Selected file: name + size shown

### Step 2 — Compatibility Check
- Auto-runs on file select
- Shows: format ✓/✗, RAM estimate, VRAM estimate, runtime compatibility (Ollama/llama.cpp)
- Incompatible: red `ErrorState` with explanation; "Choose different file" action

### Step 3 — Model Metadata
- Auto-filled from file headers: name, parameter count, quantization
- Editable: display name field
- Storage location: `user_config_dir()/models/` (display path, not editable)
- Storage warning if < 2GB free

### Step 4 — Import
- "Import" button triggers import
- Progress bar
- Success: "Model imported" + "Activate now" button

---

## States

### Waiting for File
- Drop zone with dashed border, accepting drag

### Checking
- Spinner "Checking compatibility…"

### Compatible
- Green ✓ checklist: format, RAM, VRAM, runtime

### Incompatible
- `ErrorState`: "This file is not supported — [reason]"
- Back button to re-select

### Importing
- Progress bar (determinate if file size known)
- Cancel button available

### Imported
- `StatusChip` "Imported ✓"
- "Activate Now" + "Close" actions

### Import Failed
- `ErrorState`: "[reason]"
- Retry + Cancel

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.models` | `checkCompatibility(path)`, `importModel(path, name)` |

---

## Accessibility Notes

- Modal: `role="dialog"`, `aria-modal="true"`, `FocusTrapContainer`
- Progress: `role="progressbar"`, `aria-valuenow`, `aria-valuemax`
- Drop zone: `role="button"`, keyboard activatable, `aria-label="Drop model file or click to browse"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/models/LocalModelImportWizard.tsx` — **New file**, modal

Opened from Model Manager "Import Model" button. Uses multi-step local state (4 steps). File selection via `<input type="file" accept=".gguf,.onnx">`.
