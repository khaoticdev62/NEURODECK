# 23. API Key Vault

**Category:** E — Models  
**Complexity:** Tier 2  
**Status:** Partial (`features/security/SecurityView.tsx` section)  
**Shell:** Full App Shell or Security sub-panel

---

## Purpose

Manage sensitive API credentials safely — add, reveal, rotate, and delete keys with OS-level keychain storage.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · API Key Vault                         [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER]  API Key Vault           [+ Add Key]                         │
│ Rail ├─────────────────────────────────────────────────────────────────────────┤
│      │  [SECURITY NOTE]                                                       │
│      │  🔒 Keys are stored in your OS keychain (not in config files).         │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [KEY LIST — scrollable]                                               │
│      │                                                                        │
│      │  ┌──────────────────────────────────────────────────────────────────┐  │
│      │  │  🔑 Gemini API Key                          [Reveal] [Copy] [✗] │  │
│      │  │  Provider: Gemini  ·  Added: 3 days ago  ·  Last used: 2h ago   │  │
│      │  │  ••••••••••••••••••••••••••••••••••••••                         │  │
│      │  └──────────────────────────────────────────────────────────────────┘  │
│      │                                                                        │
│      │  ┌──────────────────────────────────────────────────────────────────┐  │
│      │  │  🔑 HuggingFace API Token                   [Reveal] [Copy] [✗] │  │
│      │  │  Provider: HuggingFace  ·  Added: 1 week ago  ·  Never used     │  │
│      │  │  ••••••••••••••••••••••••••••••                                  │  │
│      │  └──────────────────────────────────────────────────────────────────┘  │
│      │                                                                        │
│      │  [+ Add New Key]                                                       │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Select  [B] Back  [X] Copy  [Y] Add Key               │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Content | Notes |
|------|---------|-------|
| Security Note | Keychain storage explanation | Always visible; builds trust |
| Key List | One card per stored credential | Masked by default |

---

## Key Card Structure

```
┌──────────────────────────────────────────────────────────┐
│  🔑 [Provider name] API Key          [Reveal] [Copy] [✗]│
│  Provider: [name] · Added: [date] · Last used: [date]    │
│  [•••••••••••••••••••••••••••••]  (masked)                │
│  (When revealed: AIza...xYZ  — auto-masks in 10s)        │
└──────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** + Add Key  
**Outcome:** Opens "Add API Key" modal with: Provider selector + masked key input + Label field

---

## Secondary Actions

- **Reveal** — `ConfirmDialog`: "Reveal key? It will auto-hide after 10 seconds." → shows plain text for 10s
- **Copy** — `ConfirmDialog`: "Copy API key to clipboard?" → copies; clears clipboard after 60s
- **Delete (✗)** — `ConfirmDialog` (emphasis `critical`): "Delete this key? It cannot be recovered."
- **Edit** (… menu) — updates key value (re-enter via Add Key modal with ID pre-set)

---

## States

### No Keys
- `EmptyState`: icon `KeyRound`, title "No API keys saved", description "Keys are stored securely in your OS keychain."

### Key Saved
- Toast: "Key saved to vault"

### Invalid Key Format
- Add Key modal: validation error "This doesn't look like a valid [provider] key"

### Permission Required
- `EmptyState` with `ShieldAlert`: "Keychain access denied. Grant permission in System Settings → Privacy."
- "Open System Settings" link

### Reveal Confirmation
- `ConfirmDialog`: "Reveal your Gemini API key? The key will be visible for 10 seconds."

### Delete Confirmation
- `ConfirmDialog` (emphasis `critical`): "Delete Gemini API Key? This cannot be undone."

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.security` | `listApiKeys()`, `getApiKey(provider)`, `saveApiKey(provider, key)`, `deleteApiKey(provider)` |

Keys use OS keychain (`keyring` crate v2.3 — `save_password()` / `get_password()` / `delete_password()`).

---

## Accessibility Notes

- Masked key: `<input type="password">` while masked — proper screen reader treatment
- Reveal button: `aria-label="Reveal Gemini API key"`, `aria-pressed="false"` → `"true"` when revealed
- Copy button: `aria-label="Copy Gemini API key"` — announce success via `aria-live="polite"`
- Delete: `aria-label="Delete Gemini API key"`, `aria-describedby` → consequence text

---

## Developer Implementation Notes

**Path:** Extract from `SecurityView.tsx` into `features/security/ApiKeyVaultView.tsx`

**Clipboard clearing:**
```typescript
navigator.clipboard.writeText(key)
setTimeout(() => navigator.clipboard.writeText(""), 60000)
toast("Copied — clipboard cleared in 60s")
```

**Auto-re-mask:**
```typescript
setRevealed(true)
const t = setTimeout(() => setRevealed(false), 10000)
return () => clearTimeout(t)
```
