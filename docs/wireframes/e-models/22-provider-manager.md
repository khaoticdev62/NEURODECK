# 22. Provider Manager

**Category:** E — Models  
**Complexity:** Tier 2  
**Status:** Partial (`features/settings/panels/AiSettingsPanel.tsx`)  
**Shell:** Full App Shell or Tab in Model Manager

---

## Purpose

Configure remote AI providers — API keys, base URLs, model lists, and connection health for Gemini, Ollama, and OpenAI-compat endpoints.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Providers                             [─] [□] [×]      │
├──────┬──────────────────────┬──────────────────────────────────────────────────┤
│ Nav  │  [PROVIDER LIST]     │  [PROVIDER DETAIL PANEL]                       │
│ Rail │                      │                                                  │
│      │  🟢 Gemini        ✓  │  Gemini                                         │
│      │  🟡 Ollama        ✓  │  ─────────────────────────────────────────────  │
│      │  ○ OpenAI-compat     │  API Key            [••••••••••••]  [Reveal]   │
│      │  ○ Kimi              │  Base URL           https://api.gemini.ai       │
│      │                      │  Default model      [gemini-2.5-flash      ▾]   │
│      │  [+ Add Provider]    │                                                  │
│      │                      │  Available Models                               │
│      │                      │  [↺ Refresh list]                               │
│      │                      │  • gemini-2.5-flash (active ●)                  │
│      │                      │  • gemini-2.0-flash                             │
│      │                      │  • gemini-1.5-pro                               │
│      │                      │                                                  │
│      │                      │  [Test Connection]    [Set as Default]          │
│      │                      │                                                  │
│      │                      │  Connection: 🟢 Connected · Latency: 220ms      │
├──────┴──────────────────────┴──────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Select  [B] Back  [X] Test  [Y] Add Provider         │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Provider Types

| Provider | Auth | Base URL | Model List Source |
|----------|------|----------|------------------|
| Gemini | API key + OAuth | `api.gemini.ai` | Dynamic from API |
| Ollama | None (local) | `localhost:11434` | `ollama list` |
| OpenAI-compat | API key | Configurable | Dynamic from API |
| Kimi | API key | `api.moonshot.ai` | Static/dynamic |

---

## Primary Action

**Label:** Set as Default  
**IPC:** `window.neurodeck.system.saveConfig({ llm: { provider: id } })`  
**Outcome:** Default provider updated; all new sessions use this provider

---

## Secondary Actions

- **Test Connection** — `window.neurodeck.models.testConnection(provider)` → inline pass/fail result
- **Refresh model list** — `window.neurodeck.models.refreshModels(providerId)`
- **+ Add Provider** — opens add provider form in detail panel
- **Reveal API key** — `ConfirmDialog` → unmasks key for 10s then re-masks

---

## States

### No Providers Configured
- Provider list: `EmptyState` compact: "No providers configured"
- Detail panel: "Add a provider to connect remote AI models"

### Provider Disconnected
- Red dot in provider list
- Detail panel shows `ErrorState` with last error + "Test Connection" button

### Testing
- "Test Connection" button shows spinner "Testing…"
- Inline result replaces connection status line after test

### Connected
- Green dot + "Connected · [latency]ms"
- All actions available

### Key Missing
- Amber dot in list
- Detail panel: `Badge` tone `warning` "API key required" on key field

### Permission Required
- `Badge` "Permission required" to access keychain
- "Grant permission →" link

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.models` | `testConnection(provider)`, `refreshModels(providerId)`, `list()` |
| `window.neurodeck.security` | `getApiKey(provider)`, `saveApiKey(provider, key)` |
| `window.neurodeck.system` | `saveConfig()` |

---

## Accessibility Notes

- Provider list: `role="listbox"`, each `role="option"`, `aria-selected`
- API key field: `<input type="password">`, `aria-label="API key for [provider]"`
- Reveal button: `aria-label="Reveal API key"`, `aria-pressed` state
- Status: text labels alongside colored dots

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/models/ProviderManagerView.tsx` — extract from Settings AI panel

**Reveal guard:** 10-second auto-re-mask after reveal. Use `setTimeout` + `setRevealed(false)`.

**Model list refresh:** Calls provider-specific endpoint; updates `state.models` in global state.
