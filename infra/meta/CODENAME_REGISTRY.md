# KFMS Codename Registry — Khaotic Labs

One Egyptian god codename is assigned per **MINOR version line**.
Patches within that MINOR line inherit the same codename.
Codenames must be unique within a MAJOR release line.

## Assignment Rules

```
v{MAJOR}.{MINOR}.{PATCH}  →  codename = REGISTRY[MINOR]
tag format                →  v{semver}-{codename_lower}
```

## Registry (index = MINOR line)

| Index | Codename  | Status    | Assigned To           |
|------:|-----------|-----------|----------------------|
|     0 | Anubis    | available | v?.0.x               |
|     1 | **Thoth** | **active**| **v1.1.x (current)** |
|     2 | Ra        | available | v?.2.x               |
|     3 | Isis      | available | v?.3.x               |
|     4 | Osiris    | available | v?.4.x               |
|     5 | Horus     | available | v?.5.x               |
|     6 | Bastet    | available | v?.6.x               |
|     7 | Sekhmet   | available | v?.7.x               |
|     8 | Ptah      | available | v?.8.x               |
|     9 | Hathor    | available | v?.9.x               |
|    10 | Set       | available | v?.10.x              |
|    11 | Sobek     | available | v?.11.x              |
|    12 | Khonsu    | available | v?.12.x              |
|    13 | Maat      | available | v?.13.x              |
|    14 | Amun      | available | v?.14.x              |
|    15 | Nephthys  | available | v?.15.x              |
|    16 | Atum      | available | v?.16.x              |
|    17 | Anuket    | available | v?.17.x              |
|    18 | Khepri    | available | v?.18.x              |
|    19 | Taweret   | available | v?.19.x              |

## When a New MAJOR Version Is Released

All codename assignments reset. Index 0 → Anubis is always the first MINOR in a new MAJOR.

## Governance Rules (enforced by `validate-codename.yml`)

- No codename can be reused for a different MINOR line within the same MAJOR.
- Codename must match `REGISTRY[MINOR]` exactly — no custom names.
- The `tag` field in `meta.json` must be `v{version}-{codename.lower()}`.
- `validate-codename.yml` scans all git tags in the MAJOR line and fails on collision.
