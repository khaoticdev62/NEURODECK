# NEURODECK Production Package — Index

## Start Here

1. **[README.md](README.md)** — Project overview, stack, quick navigation
2. **[docs/00_Master_Blueprint](docs/00_NEURODECK_Master_PRD_SDS_Implementation_Blueprint.md)** — Complete architecture blueprint and release gates

## By Role

### Product Manager
- [docs/01_Product_PRD](docs/01_Product_PRD.md) — Feature definitions and acceptance criteria
- [docs/03_Roadmap](docs/03_Implementation_Roadmap.md) — Sprint plan and milestones
- [checklists/PRODUCTION_BACKLOG](checklists/PRODUCTION_BACKLOG.md) — Epic/story backlog

### Architect / Tech Lead
- [docs/00_Master_Blueprint](docs/00_NEURODECK_Master_PRD_SDS_Implementation_Blueprint.md) — Architecture volumes
- [docs/02_SDS](docs/02_Software_Design_Specification.md) — Module boundaries, IPC, data flow
- [docs/04_Security](docs/04_Security_Privacy_Hardening.md) — Threat model and hardening
- [docs/08_Plugin_SDK](docs/08_Plugin_Automation_Workflow_Spec.md) — Extension platform design

### Developer
- [docs/02_SDS](docs/02_Software_Design_Specification.md) — How modules interact
- [docs/07_CI_CD](docs/07_Repository_CI_CD_Setup.md) — Build and test pipeline
- [docs/09_Release](docs/09_Release_Packaging_Observability.md) — Packaging and deployment
- [../AGENTS.md](../AGENTS.md) — Coding conventions, gotchas, dev commands

### QA / Release Engineer
- [docs/06_QA_Testing](docs/06_QA_Testing_Release_Gates.md) — Test matrix and coverage
- [docs/05_Steam_Deck_UX](docs/05_Steam_Deck_UX_Release_Gate.md) — Controller and layout validation
- [checklists/FINAL_RELEASE](checklists/FINAL_1_0_RELEASE_CHECKLIST.md) — Go/no-go checklist
- [docs/09_Release](docs/09_Release_Packaging_Observability.md) — Packaging runbook

### Steam Deck Operator
- [docs/05_Steam_Deck_UX](docs/05_Steam_Deck_UX_Release_Gate.md) — Game Mode constraints
- [scripts/install-steamdeck.sh](scripts/install-steamdeck.sh) — SteamOS deployment
- [scripts/launch-neurodeck.sh](scripts/launch-neurodeck.sh) — Game Mode launcher

## Document Map

```
neurodeck-production-package/
├── README.md ........................................ Project overview
├── INDEX.md ......................................... This file
├── manifest.json .................................... Machine-readable package manifest
│
├── checklists/
│   ├── FINAL_1_0_RELEASE_CHECKLIST.md ............... Release go/no-go gate
│   └── PRODUCTION_BACKLOG.md ........................ Epic/story tracker
│
├── ci/
│   ├── ci.yml ....................................... Pull request + merge gate
│   └── release.yml .................................. Release build + publish
│
├── docs/
│   ├── 00_Master_Blueprint.md ....................... Complete architecture blueprint
│   ├── 01_Product_PRD.md ............................ Feature specs and stories
│   ├── 02_SDS.md .................................... Software design specification
│   ├── 03_Roadmap.md ................................ Sprint plan and milestones
│   ├── 04_Security.md ............................... Security and privacy hardening
│   ├── 05_Steam_Deck_UX.md .......................... Controller-first UX spec
│   ├── 06_QA_Testing.md ............................. Test matrix and quality gates
│   ├── 07_CI_CD.md .................................. Build pipeline specification
│   ├── 08_Plugin_SDK.md ............................. Plugin and workflow engine spec
│   └── 09_Release.md ................................ Packaging and observability
│
└── scripts/
    ├── install-steamdeck.sh ......................... SteamOS AppImage install
    └── launch-neurodeck.sh .......................... gamescope 1280×800 launcher
```

## How to Use This Package

1. **New contributor?** Start with [README.md](README.md), then [docs/02_SDS](docs/02_Software_Design_Specification.md).
2. **Planning a feature?** Read [docs/01_PRD](docs/01_Product_PRD.md) and [checklists/BACKLOG](checklists/PRODUCTION_BACKLOG.md).
3. **Starting implementation?** Check [docs/03_Roadmap](docs/03_Implementation_Roadmap.md) for current sprint, then run `npm run promptflow:audit`.
4. **Preparing release?** Walk through [checklists/FINAL_RELEASE](checklists/FINAL_1_0_RELEASE_CHECKLIST.md) and run `npm run promptflow:release`.
5. **Security review?** Reference [docs/04_Security](docs/04_Security_Privacy_Hardening.md) and run `npm run promptflow:security`.
