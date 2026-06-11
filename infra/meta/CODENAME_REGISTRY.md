# KFMS Codename Registry — Khaotic Labs

One Egyptian god codename is assigned per **MINOR version line**.
Patches within that MINOR line inherit the same codename.
Codenames must be unique within a MAJOR release line.

## Current Assignment Snapshot

<!-- KFMS:CURRENT_ASSIGNMENT:BEGIN -->
- Current version: `1.8.0`
- Current codename: `Ptah`
- Current tag: `v1.8.0-ptah`
- Current MINOR line: `8`
- Source of truth: `infra/meta/meta.json`
- Last stamped build: `2026-06-11T20:30:19Z`
<!-- KFMS:CURRENT_ASSIGNMENT:END -->

## Assignment Rules

```
v{MAJOR}.{MINOR}.{PATCH}  →  codename = REGISTRY[MINOR]
tag format                →  v{semver}-{codename_lower}
```

## Registry (index = MINOR line)

<!-- KFMS:REGISTRY_TABLE:BEGIN -->
| Index | Codename  | Status    | Assigned To           |
|------:|-----------|-----------|----------------------|
|     0 | Anubis | available | v1.0.x |
|     1 | Thoth | available | v1.1.x |
|     2 | Ra | available | v1.2.x |
|     3 | Isis | available | v1.3.x |
|     4 | Osiris | available | v1.4.x |
|     5 | Horus | available | v1.5.x |
|     6 | Bastet | available | v1.6.x |
|     7 | Sekhmet | available | v1.7.x |
|     8 | **Ptah** | **active** | **v1.8.x (current)** |
|     9 | Hathor | available | v1.9.x |
|    10 | Set | available | v1.10.x |
|    11 | Sobek | available | v1.11.x |
|    12 | Khonsu | available | v1.12.x |
|    13 | Maat | available | v1.13.x |
|    14 | Amun | available | v1.14.x |
|    15 | Nephthys | available | v1.15.x |
|    16 | Atum | available | v1.16.x |
|    17 | Anuket | available | v1.17.x |
|    18 | Khepri | available | v1.18.x |
|    19 | Taweret | available | v1.19.x |
<!-- KFMS:REGISTRY_TABLE:END -->

## When a New MAJOR Version Is Released

All codename assignments reset. Index 0 → Anubis is always the first MINOR in a new MAJOR.

## Governance Rules (enforced by `validate-codename.yml`)

- No codename can be reused for a different MINOR line within the same MAJOR.
- Codename must match `REGISTRY[MINOR]` exactly — no custom names.
- The `tag` field in `meta.json` must be `v{version}-{codename.lower()}`.
- `validate-codename.yml` scans all git tags in the MAJOR line and fails on collision.
