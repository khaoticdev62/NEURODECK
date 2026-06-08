# Security & Privacy Hardening Spec

## Required Controls

- Electron context isolation
- Renderer Node disabled
- Explicit preload allowlist
- Credential encryption
- Sealed memory encryption
- Permission service for agents/workflows/plugins
- Export redaction
- Support bundle redaction
- Plugin manifest validation
- Plugin sandbox API
- No wildcard permissions
- No hidden context injection

## Memory Privacy Levels

| Level | Search | Snippet | Context | Export | Plugin |
|---|---|---|---|---|---|
| standard | yes | yes | yes | yes | permission required |
| private | scoped | limited | confirmation | warning | denied default |
| sensitive | title only | no | confirmation | strong warning | denied |
| sealed | locked | no | unlock required | unlock required | denied |
