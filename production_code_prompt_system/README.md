# PromptFlow

Professional CLI workflow runner for the [Production Code Prompt System](https://github.com/example/promptflow).

PromptFlow turns a 15-part prompt pack into a structured, resumable, safe workflow that guides your codebase through audits, security hardening, testing, refactoring, and release certification.

## What it does

- **Discovers** prompt files and validates them
- **Inspects** your repository safely (respects `.gitignore`, excludes binaries, redacts secrets)
- **Runs** prompts in configurable sequences
- **Saves** every AI request payload and response for auditability
- **Tracks** state and supports resuming interrupted runs
- **Generates** consolidated reports (summary, blockers, warnings, next actions)
- **Exports** complete run packages for sharing

## Safety-first design

- **Manual mode** works without any API keys
- **Report-only** by default — never modifies your repo automatically
- **Secret redaction** before any data leaves your machine
- **Git checkpoint branches** before applying patches
- **Command allowlist** with confirmation gates

## Installation

```bash
pip install -e ".[dev]"
```

Or with optional AI provider support:

```bash
pip install -e ".[openai]"
pip install -e ".[anthropic]"
pip install -e ".[all]"
```

## Quickstart

```bash
# Create config
promptflow init

# Validate setup
promptflow doctor

# List available prompts
promptflow list-prompts

# Inspect a repository
promptflow inspect-repo --repo .

# Run a workflow (dry-run first)
promptflow run --sequence audit-only --dry-run

# Run for real with manual mode
promptflow run --sequence audit-only --provider manual --repo .

# Generate reports
promptflow report --run-id latest
```

## Commands

| Command | Description |
|---|---|
| `promptflow init` | Create `promptflow.yaml` |
| `promptflow doctor` | Validate environment and setup |
| `promptflow list-prompts` | Show detected prompts |
| `promptflow inspect-repo` | Safe repo summary |
| `promptflow run` | Run a workflow sequence |
| `promptflow step` | Run a single stage |
| `promptflow resume` | Resume interrupted run |
| `promptflow report` | Generate consolidated reports |
| `promptflow export` | Export run package (zip) |
| `promptflow clean` | Remove old runs |

## Manual mode

No API keys required. PromptFlow writes the full AI prompt payload to a markdown file, instructs you to paste it into your AI tool, and accepts the response back.

## Provider modes

- `manual` — default, no API keys
- `openai` — requires `OPENAI_API_KEY`
- `anthropic` — requires `ANTHROPIC_API_KEY`
- `gemini` — requires `GOOGLE_API_KEY`
- `ollama` — local, requires Ollama running

## Output structure

```
promptflow_runs/
  2026-06-03_170000_full/
    state.json
    config_snapshot.yaml
    repo_summary.md
    prompts/
      01_payload.md
    responses/
      01_response.md
    reports/
      summary.md
      blockers.md
      warnings.md
      next_actions.md
    logs/
      run.log
```

## Documentation

- [Setup](docs/SETUP.md)
- [Configuration](docs/CONFIGURATION.md)
- [Providers](docs/PROVIDERS.md)
- [Workflows](docs/WORKFLOWS.md)
- [Safety](docs/SAFETY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## License

MIT
