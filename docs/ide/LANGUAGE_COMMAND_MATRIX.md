# Language Command Matrix

Auto-generated from `assets/language-profiles/` — do not edit by hand.
Source: `scripts/export-ide-readiness-report.ts`

## Coverage Summary

| Language | Extensions | LSP Server | Run | Test | Build | Lint | Format | Typecheck |
|---|---|---|---|---|---|---|---|---|
| TypeScript | `.ts` `.tsx` `.mts` | typescript-language-server | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| JavaScript | `.js` `.jsx` `.mjs` `.cjs` | typescript-language-server | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Python | `.py` `.pyw` `.pyi` | pyright-langserver | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| Rust | `.rs` | rust-analyzer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Go | `.go` | gopls | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Lua | `.lua` | lua-language-server | ✓ | ✓ | — | ✓ | ✓ | — |
| Bash | `.sh` `.bash` `.zsh` | bash-language-server | ✓ (confirm) | — | — | ✓ | ✓ | — |
| HTML | `.html` `.htm` | vscode-html-language-server | — | — | — | — | ✓ | — |
| CSS | `.css` `.scss` `.sass` | vscode-css-language-server | — | — | — | ✓ | ✓ | — |
| JSON | `.json` `.jsonc` | vscode-json-language-server | — | — | — | ✓ | ✓ | — |
| YAML | `.yaml` `.yml` | yaml-language-server | — | — | — | ✓ | — | — |
| TOML | `.toml` | taplo | — | — | — | ✓ | ✓ | — |
| Markdown | `.md` `.mdx` | marksman | — | — | — | — | ✓ | — |

## Per-Language Command Detail

### TypeScript / JavaScript
| Category | Command | Args | Safety | Condition |
|---|---|---|---|---|
| runFile | `node` | `[dist/main.js]` | safe | always |
| runFile | `npx` | `[ts-node, src/index.ts]` | safe | always |
| runFile | `npx` | `[tsx, src/index.ts]` | safe | always |
| testProject | `npm` | `[run, test]` | safe | scripts.test present |
| testProject | `npx` | `[vitest]` | safe | always |
| testProject | `npx` | `[jest]` | safe | always |
| build | `npm` | `[run, build]` | safe | scripts.build present |
| build | `npx` | `[tsc]` | safe | always |
| lint | `npx` | `[eslint, .]` | safe | eslint config present |
| format | `npx` | `[prettier, --write, .]` | safe | always |
| typecheck | `npx` | `[tsc, --noEmit]` | safe | always |
| packageInstall | `npm` | `[install]` | confirm | package-lock.json |
| packageInstall | `pnpm` | `[install]` | confirm | pnpm-lock.yaml |
| dependencyAdd | `npm` | `[install, --save]` | confirm | always |

### Python
| Category | Command | Args | Safety | Condition |
|---|---|---|---|---|
| runFile | `python3` | `[{file}]` | safe | always |
| testProject | `python3` | `[-m, pytest]` | safe | always |
| lint | `python3` | `[-m, ruff, check, .]` | safe | always |
| format | `python3` | `[-m, ruff, format, .]` | safe | always |
| typecheck | `python3` | `[-m, mypy, .]` | safe | always |
| packageInstall | `pip` | `[install, -r, requirements.txt]` | confirm | requirements.txt |
| packageInstall | `pip` | `[install, -e, .]` | confirm | pyproject.toml |

### Rust
| Category | Command | Args | Safety | Condition |
|---|---|---|---|---|
| runProject | `cargo` | `[run]` | safe | always |
| runProject | `cargo` | `[run, --release]` | safe | always |
| testProject | `cargo` | `[test]` | safe | always |
| build | `cargo` | `[build]` | safe | always |
| build | `cargo` | `[build, --release]` | safe | always |
| lint | `cargo` | `[clippy]` | safe | always |
| format | `cargo` | `[fmt]` | safe | always |
| typecheck | `cargo` | `[check]` | safe | always |
| dependencyAdd | `cargo` | `[add]` | confirm | always |

### Go
| Category | Command | Args | Safety | Condition |
|---|---|---|---|---|
| runFile | `go` | `[run, .]` | safe | always |
| testProject | `go` | `[test, ./...]` | safe | always |
| build | `go` | `[build, ./...]` | safe | always |
| lint | `go` | `[vet, ./...]` | safe | always |
| format | `gofmt` | `[-w, .]` | safe | always |
| packageInstall | `go` | `[mod, tidy]` | confirm | go.mod |
| dependencyAdd | `go` | `[get]` | confirm | always |

### Lua
| Category | Command | Args | Safety | Condition |
|---|---|---|---|---|
| runFile | `lua` | `[{file}]` | safe | always |
| testProject | `busted` | `[]` | safe | always |
| lint | `luacheck` | `[.]` | safe | always |
| format | `stylua` | `[.]` | safe | always |

### Bash
All execution commands require **confirm** tier (user must approve before run).
| Category | Command | Args | Safety | Condition |
|---|---|---|---|---|
| runFile | `bash` | `[{file}]` | confirm | always |
| lint | `shellcheck` | `[{file}]` | safe | always |
| format | `shfmt` | `[-w, .]` | safe | always |

## Safety Policy

| Tier | Behavior | Examples |
|---|---|---|
| `safe` | Execute immediately | `cargo build`, `go test`, `npx tsc --noEmit` |
| `confirm` | Show confirm dialog before execution | `npm install`, `pip install`, `bash script.sh` |
| `dangerous` | Require typing "CONFIRM" | `rm -rf`, `git reset --hard`, `drop database` |
| `blocked` | Reject with error, never execute | `curl \| sh`, `sudo rm`, fork bombs, `mimikatz` |
