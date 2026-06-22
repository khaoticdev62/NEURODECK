# Epic 9: Models

## Delivered

- Encrypted provider configuration with no renderer secret exposure.
- Real OpenAI-compatible model discovery and chat completion invocation.
- Auditable routing decisions across all eight required profiles.
- Live memory, battery, and thermal inputs from `SystemMetricsService`.
- Private, Offline, Local First, and Low Cost profiles block cloud routes.
- Persisted provider enable/disable state.
- Capability-detected Ollama running-state, load, unload, and benchmark operations.
- ND-035 Model Control Center, ND-036 Model Detail, and ND-037 Routing Profiles.

## Security boundaries

- Stored API keys use Electron `safeStorage` and are decrypted only in the main process for one provider request.
- All renderer inputs are Zod-validated at IPC.
- Private routes cannot select cloud providers.
- Disabled or unreachable providers cannot be selected.
- No model daemon is installed, launched, or granted system privileges by NeuroDeck.
- Generic endpoints never receive Ollama-specific runtime calls.

## Evidence

- Real loopback HTTP servers verify discovery, privacy routing, measured routing inputs, and completion invocation.
- Existing provider-store tests verify encrypted persistence and secret redaction.
- Model UI tests verify real IPC-backed provider flows.
- Full typecheck, lint, build, and unit test commands are recorded in the handoff.

## Explicit platform limits

- Ollama must already be installed and reachable; NeuroDeck manages models through its published local API but does not bundle the daemon.
- OpenAI-compatible discovery does not standardize model capability, context-size, price, or storage metadata. NeuroDeck reports only provider-returned data and does not infer those values from model names.
- Speech, vision, embedding, and provider-specific non-OpenAI adapters require a provider protocol that exposes those capabilities; no unsupported controls are shown.
