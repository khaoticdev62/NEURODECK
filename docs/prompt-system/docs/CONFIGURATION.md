# Configuration

PromptFlow uses a YAML config file (`promptflow.yaml` by default).

## Create config

```bash
promptflow init
```

## Full config reference

```yaml
# Paths
prompt_pack: ./prompts
target_repo: .
output_dir: ./promptflow_runs

# AI provider
provider:
  name: manual          # manual | openai | anthropic | gemini | ollama
  model: null           # e.g., gpt-4o, claude-3-5-sonnet-latest
  timeout_seconds: 120
  max_retries: 2

# Workflow behavior
workflow:
  sequence: full
  stop_on_blocker: true
  mode: report-only     # report-only | patch-review | apply-patch
  include_orchestration: true
  require_approval_for_patches: true

# Repository context limits
context:
  max_context_files: 80
  max_file_bytes: 200000
  include_git_status: true
  respect_gitignore: true
  redact_secrets: true
  exclude:
    - .git
    - node_modules
    - dist
    - build
    - target
    - coverage

# Command execution
commands:
  allow_verification_commands: true
  require_confirmation_for_commands: true
  timeout_seconds: 300

# Report generation
reports:
  generate_summary: true
  generate_blockers: true
  generate_warnings: true
  generate_next_actions: true
```

## Custom sequences

Add custom sequences under `workflow.custom_sequences` (not yet exposed; use CLI flags or define inline).

## Override via CLI

Most config values can be overridden with CLI flags:

```bash
promptflow run --repo ./my-app --provider openai --sequence security
```
