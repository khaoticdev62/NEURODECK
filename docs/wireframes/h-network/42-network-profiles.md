# 42. Network Profiles

**Category:** H — Network  
**Complexity:** Tier 1  
**Status:** New — form drawer within VPN view  
**Shell:** Drawer (480px) from VPN/Networking view

---

## Purpose

Create or edit a VPN connection profile (WireGuard or OpenVPN configuration).

---

## Layout Zones

```
┌──────────────────────────────────────────────────┐
│  [DRAWER HEADER]                                 │
│  Add VPN Profile                        [✕]      │
├──────────────────────────────────────────────────┤
│  [FORM — scrollable]                             │
│                                                  │
│  Profile Name *                                  │
│  [Home Server            ]                       │
│                                                  │
│  Protocol *                                      │
│  ○ WireGuard  ● OpenVPN                          │
│                                                  │
│  — WireGuard fields —                            │
│  Interface Name *     Server Address *           │
│  [wg0          ]      [10.0.0.1:51820  ]         │
│                                                  │
│  Private Key *                                   │
│  [••••••••••••••••••••••••••• ] [👁 Reveal]     │
│                                                  │
│  Peer Public Key *                               │
│  [                           ]                   │
│                                                  │
│  Allowed IPs                                     │
│  [0.0.0.0/0, ::/0            ]                   │
│                                                  │
│  DNS (optional)                                  │
│  [1.1.1.1                    ]                   │
│                                                  │
│  — OpenVPN fields (shown when protocol = OpenVPN) —
│  Config File *                                   │
│  [Browse .ovpn file…         ]                   │
│                                                  │
│  Auto-connect on startup?    [ ] Yes             │
│                                                  │
├──────────────────────────────────────────────────┤
│  [FOOTER]                                        │
│  [Cancel]               [Test Connection] [Save] │
└──────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Save  
**IPC:** `window.neurodeck.vpn.saveProfile(profile)`  
**Outcome:** Profile saved; drawer closes; VPN view list refreshes

---

## Secondary Actions

- **Test Connection** — `window.neurodeck.vpn.testProfile(profile)` → Toast "Connection OK" or `ErrorState` inline
- **Cancel** — if form is dirty: `ConfirmDialog` "Discard changes?" otherwise close immediately
- **👁 Reveal** — reveals private key for 10s then re-masks

---

## States

### Creating
- Header: "Add VPN Profile"; Save creates new record

### Editing
- Header: "Edit VPN Profile — [name]"; Save updates existing record

### Testing
- "Test Connection" button shows spinner; form disabled

### Validation Error
- Red border + error message below required fields

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.vpn` | `saveProfile(profile)`, `updateProfile(id, profile)`, `testProfile(profile)` |

---

## Accessibility Notes

- Required fields: `aria-required="true"` + visible asterisk (*) with `aria-label="required"`
- Private key field: `type="password"` with reveal toggle; reveal button `aria-label="Reveal private key"`
- Protocol radio group: `role="radiogroup"` with `aria-labelledby`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/network/NetworkProfileDrawer.tsx` — **New file**

WireGuard profiles stored in `user_config_dir()/data/vpn_profiles.json`. Private key stored in OS keychain via `secrets.rs` — NOT in the JSON file.

Show/hide OpenVPN fields based on protocol radio selection using conditional rendering.
