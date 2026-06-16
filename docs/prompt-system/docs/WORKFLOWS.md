# Workflows

## Named sequences

| Sequence | Stages | Use case |
|---|---|---|
| `full` | 14, 01, 08, 02, 03, 13, 04, 06, 07, 05, 12, 11, 09, 10, 15 | Complete production readiness |
| `audit-only` | 14, 01 | Initial discovery |
| `security` | 14, 03, 13, 12, 04 | Security-focused review |
| `build-repair` | 14, 08, 09, 10 | Fix builds and CI |
| `refactor` | 14, 01, 04, 06, 07, 15 | Deep refactoring |
| `frontend` | 14, 11, 05, 04, 10 | UI/UX and accessibility |
| `release-certification` | 14, 15 | Final go/no-go gate |
| `docs` | 14, 10 | Documentation update |

## Run a sequence

```bash
promptflow run --sequence security --repo .
```

## Run a subset

```bash
promptflow run --from 03 --to 10
promptflow run --only 05
```

## Dry run

Preview what would execute without calling any provider:

```bash
promptflow run --sequence full --dry-run
```
