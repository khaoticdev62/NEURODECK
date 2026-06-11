# NEURODECK Backend Readiness Report

Generated: 2026-06-11T19:22:44.965Z
Version: 1.8.0
Score: 100/100

## Service Status

| Status | Count |
|--------|------:|
| production_ready | 11 |
| not_configured | 3 |
| **Total** | **14** |

## Gate Result

**✅ PASSED**



## Service Inventory

| ID | Category | Status | Mock Risk |
|----|----------|--------|-----------|
| ipc-main-handlers | ipc | production_ready | none |
| ipc-service-handlers | ipc | production_ready | none |
| browser-webcontentsview | service | production_ready | none |
| lsp-manager | lsp | not_configured | none |
| connection-registry | service | production_ready | low |
| rust-sidecar | service | production_ready | none |
| provider-gemini | provider | not_configured | low |
| provider-ollama | provider | not_configured | none |
| memory-store | storage | production_ready | none |
| session-store | storage | production_ready | none |
| settings-store | settings | production_ready | low |
| plugin-runtime | plugin | production_ready | none |
| telemetry-system | telemetry | production_ready | low |
| bridge-adapter-frontend | ipc | production_ready | medium |
