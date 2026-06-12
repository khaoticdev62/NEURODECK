# IDE Readiness Report

> Generated: 2026-06-12T02:28:26.265Z

## Summary

| Metric | Count |
|---|---|
| Languages | 12 |
| Total Commands | 58 |
| Total Snippets | 72 |
| LSP Channels | 9 |
| IDE Controller Actions | 17 |

## Language Command Matrix

| Language | LSP Server | Commands | Snippets | Run by Default |
|---|---|---|---|---|
| Bash / Shell | `bash-language-server` | 4 | 6 | 🔒 |
| JSON | `vscode-json-language-server` | 2 | 4 | ✅ |
| YAML | `yaml-language-server` | 2 | 5 | ✅ |
| TOML | `taplo` | 1 | 5 | ✅ |
| Markdown | `marksman` | 2 | 4 | ✅ |
| Go | `gopls` | 7 | 8 | ✅ |
| HTML | `vscode-html-language-server` | 2 | 4 | ✅ |
| CSS / SCSS | `vscode-css-language-server` | 2 | 4 | ✅ |
| Lua | `lua-language-server` | 5 | 8 | ✅ |
| Python | `pyright-langserver` | 9 | 8 | ✅ |
| Rust | `rust-analyzer` | 8 | 8 | ✅ |
| TypeScript / JavaScript | `typescript-language-server` | 14 | 8 | ✅ |

## LSP Channel Coverage

| Channel | Registered |
|---|---|
| `lsp:start-server` | ✅ |
| `lsp:stop-server` | ✅ |
| `lsp:open-document` | ✅ |
| `lsp:change-document` | ✅ |
| `lsp:close-document` | ✅ |
| `lsp:completion` | ✅ |
| `lsp:hover` | ✅ |
| `lsp:definition` | ✅ |
| `lsp:format` | ✅ |

### Preload Methods

- `startServer`
- `stopServer`
- `openDocument`
- `changeDocument`
- `closeDocument`
- `completion`
- `hover`
- `definition`
- `format`
- `onDiagnostics`
- `onStatusChanged`

LSP Manager exists: ✅

## Controller Action Map

| Action | Registered |
|---|---|
| `IDE_ACCEPT_COMPLETION` | ✅ |
| `IDE_NEXT_COMPLETION` | ✅ |
| `IDE_PREV_COMPLETION` | ✅ |
| `IDE_DISMISS_COMPLETION` | ✅ |
| `IDE_OPEN_COMMAND_WHEEL` | ✅ |
| `IDE_FORMAT_FILE` | ✅ |
| `IDE_RUN_COMMAND` | ✅ |
| `IDE_NEXT_DIAGNOSTIC` | ✅ |
| `IDE_GO_TO_DEFINITION` | ✅ |
| `IDE_TOGGLE_PREDICTIVE_BAR` | ✅ |
| `IDE_SAVE_FILE` | ✅ |
| `IDE_PREV_TAB` | ✅ |
| `IDE_NEXT_TAB` | ✅ |
| `IDE_CANCEL_COMMAND` | ✅ |
| `IDE_CONFIRM_COMMAND` | ✅ |
| `IDE_ENTER_EDIT_MODE` | ✅ |
| `IDE_ENTER_NAVIGATION_MODE` | ✅ |

### Mode Bindings

- `ide_prediction`
- `ide_edit`
- `ide_navigation`
- `ide_command`
- `ide_snippet`
