# Safe Command Execution Policy

All IDE commands execute via `child_process.spawn(command, args[], {cwd})` with an explicit
args array — never shell string concatenation.

## Command Safety Tiers

| Tier | Description | UX |
|---|---|---|
| `safe` | Read-only, format, lint, check commands | Execute immediately |
| `confirm` | Install, build, network operations | Show confirmation modal (A to run, B to cancel) |
| `dangerous` | Destructive operations (rm -rf, git reset --hard) | Modal requires typing "CONFIRM" |
| `blocked` | Rejected regardless of confirmation | Error message only — never executed |

## Blocked Command Patterns

- `curl \| sh` / `curl \| bash` / `wget \| sh`
- `rm -rf /`
- `sudo rm`
- `del /f /s /q c:\\`
- `chmod -R 777` / `sudo chmod -R 777`
- Fork bomb: `:(){ :|:& };:`
- `mimikatz` / `hashdump`

## Confirm-Tier Prefixes

`npm install`, `npm ci`, `pnpm install`, `pnpm add`, `yarn`, `bun install`,
`cargo add`, `cargo update`, `go get`, `pip install`, `python -m pip install`,
`bash `, `sh `, `pwsh `, `chmod`, `chown`, `git reset`, `git clean`,
`git push --force`, `make install`

## Safe-Tier Examples

`cargo check`, `cargo clippy`, `cargo fmt`, `go test ./...`, `go fmt ./...`,
`go vet ./...`, `eslint`, `prettier`, `ruff check`, `mypy`, `tsc --noEmit`,
`python -m pytest` (no install), `lua-language-server --check`

## Security Notes

- The renderer never has access to `child_process`
- The preload does not expose `child_process` or `spawn` directly
- All command execution goes through the Electron main process IPC handler
- Command history is kept for the last 50 commands only
- Timeout defaults to 60 seconds; commands exceeding this are SIGTERM'd
