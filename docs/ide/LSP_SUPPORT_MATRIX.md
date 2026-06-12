# LSP Support Matrix

Documents which language servers are used, how to install them, and which LSP capabilities are wired.

## Architecture

Two LSP paths exist in NEURODECK:

| Path | Used By | Location |
|---|---|---|
| **Electron LSP** (primary) | React `IDEView.tsx` | `electron/services/lsp/lspManager.js` |
| **Rust LSP** (legacy) | Vanilla `ide_view.js` | `src-tauri/src/lsp.rs` |

All new IDE features use the Electron LSP path. The Rust LSP path continues to serve the vanilla view.

## Server Coverage

| Language | Server | Install | Completion | Hover | GoTo Def | Diagnostics | Format | Code Actions |
|---|---|---|---|---|---|---|---|---|
| TypeScript / JavaScript | `typescript-language-server` | `npm i -g typescript-language-server typescript` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Python | `pyright-langserver` | `pip install pyright` | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Rust | `rust-analyzer` | `rustup component add rust-analyzer` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Go | `gopls` | `go install golang.org/x/tools/gopls@latest` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lua | `lua-language-server` | Download from GitHub releases | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Bash | `bash-language-server` | `npm i -g bash-language-server` | ✓ | ✓ | — | ✓ | — | — |
| HTML | `vscode-html-language-server` | `npm i -g vscode-langservers-extracted` | ✓ | ✓ | — | ✓ | ✓ | — |
| CSS / SCSS | `vscode-css-language-server` | `npm i -g vscode-langservers-extracted` | ✓ | ✓ | — | ✓ | ✓ | — |
| JSON | `vscode-json-language-server` | `npm i -g vscode-langservers-extracted` | ✓ | ✓ | — | ✓ | ✓ | — |

## IPC Channels

All LSP communication goes through the Electron preload boundary (`window.neurodeck.lsp.*`):

| Channel | Direction | Purpose |
|---|---|---|
| `lsp:start-server` | renderer → main | Start LSP server for a language |
| `lsp:stop-server` | renderer → main | Stop LSP server |
| `lsp:open-document` | renderer → main | Notify server of file open |
| `lsp:close-document` | renderer → main | Notify server of file close |
| `lsp:change-document` | renderer → main | Send document change (debounced 300ms) |
| `lsp:completion` | renderer → main | Request completions at cursor |
| `lsp:hover` | renderer → main | Request hover info at cursor |
| `lsp:definition` | renderer → main | Go-to-definition request |
| `lsp:format` | renderer → main | Format document |
| `lsp:diagnostics` | main → renderer | Publish diagnostics (push event) |

## IDEView LSP Lifecycle

```
openFile(path)
  └─ lsp.openDocument(languageId, fileUri, content)

onEditorInput (debounced 300ms)
  └─ lsp.changeDocument(languageId, fileUri, content, version++)

onEditorCursorChange (debounced 200ms)
  └─ ide.getPredictions(filePath, languageId, line, char, ...)
       └─ predictiveCodingService.rankPredictions(...)

listen('lsp:diagnostics')
  └─ setDiagnostics([...]) → renders in gutter + DiagnosticFixPanel

closeTab(path)
  └─ lsp.closeDocument(languageId, fileUri)
```

## Steam Deck Considerations

- LSP servers start on demand (first file open for that language)
- Completions are requested on cursor movement (200ms debounce) — does not block input
- Diagnostics are pushed asynchronously — never blocks the editor
- If the LSP server is not installed, `lspStatus` shows `missing` in `LanguageModeBadge`
- Missing LSP = no completions, no diagnostics; file editing still works

## Known Limitations

| Language | Limitation |
|---|---|
| Java | `jdtls` requires JDK + Eclipse JDT — not auto-started on fresh install |
| C# | `omnisharp-roslyn` requires .NET SDK and a complex startup sequence |
| C/C++ | `clangd` requires LLVM toolchain; language profile is available but not listed in matrix above |
| Markdown | `marksman` is optional; Markdown editing works without it |
| YAML | `yaml-language-server` is optional; YAML editing works without it |
