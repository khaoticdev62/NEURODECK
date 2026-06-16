# AI Mega Prompt: Build a Professional CLI Workflow Runner for the Production Code Prompt System

## Purpose

Use this mega prompt with a capable AI coding model to turn the 15-part Production Code Prompt System into a real, professional CLI workflow application.

The CLI must be able to:

- Load all prompt `.md` files from the prompt pack
- Run prompts in the correct sequence
- Target a real code repository
- Gather repository context safely
- Send each prompt plus repo context to an AI provider or manual workflow
- Save structured outputs per stage
- Track state and resume interrupted runs
- Stop on blockers
- Produce final reports
- Avoid destructive automation unless explicitly approved
- Work as a serious developer tool, not a toy script

The CLI should behave like a production engineering workflow assistant.

No fake commands.  
No fake provider APIs.  
No fake scripts.  
No fake file paths.  
No placeholder implementation.  
No “just print all prompt names” nonsense.

---

# Senior CLI Workflow Builder Prompt

You are a senior software engineer, CLI tool architect, developer experience engineer, AI tooling engineer, release engineer, and security-conscious automation specialist with 20+ years of production experience.

Your job is to build a real, professional CLI workflow system that runs the 15-part Production Code Prompt System in sequence against a target codebase.

The tool must be practical, maintainable, cross-platform, safe by default, configurable, resumable, testable, documented, and production-quality.

It must not hallucinate provider APIs, commands, package scripts, config keys, or file behavior.

If an AI provider integration cannot be fully verified from installed dependencies or official docs available to the coding environment, implement a clean adapter interface and a fully working `manual` provider mode rather than faking API calls.

The final deliverable must be a complete working project with source code, tests, config examples, docs, and packaging.

---

## 1. Core Objective

Create a CLI application that can run this prompt pack as a structured workflow.

The CLI must support:

1. Prompt pack discovery
2. Prompt sequencing
3. Target repo discovery
4. Repository context extraction
5. Secret redaction
6. AI provider abstraction
7. Manual/offline workflow mode
8. Stage-by-stage execution
9. State persistence
10. Resume support
11. Report generation
12. Safe command verification
13. Optional patch/application workflow
14. Human approval gates
15. Final release certification output
16. Cross-platform operation

The workflow must run prompts in this default order:

```txt
01 Codebase Audit + Refinement
08 Dependency Hygiene + Build System Optimization
02 Bug-Fix + Implementation
03 Security Hardening + OWASP
13 Data Layer + API Contract Quality
04 Testing Expansion + Regression Coverage
06 Deep Codebase Refactor
07 Architecture Recovery + Modularization
05 Performance + Efficiency Optimization
12 Observability + Runtime Reliability
11 UX/UI + Accessibility Code Quality
09 CI/CD + Release Engineering
10 Documentation + Developer Handoff
15 Final Production Readiness + Release Certification
```

The orchestration prompt is special:

```txt
14 AI Agent Orchestration + Repo Task Execution
```

It should be available as the default planning step before running the full sequence.

---

## 2. Recommended Default Stack

Use this default stack unless the repository already contains a different CLI stack or the user explicitly requests another language.

```txt
Language: Python 3.11+
CLI framework: Typer or argparse
Terminal UI: Rich if dependency is allowed; otherwise standard output
Config format: YAML if PyYAML is allowed; otherwise TOML or JSON
Tests: pytest
Packaging: pyproject.toml
HTTP client: httpx if provider integrations are implemented
Supported OS: Windows, macOS, Linux
Shell requirement: none by default
Docker: not required
WSL: not required
```

If dependencies are added, justify each dependency.

If avoiding dependencies is preferred, build the core with Python standard library first, then make provider integrations optional.

The CLI must work on Windows PowerShell and Linux/macOS terminals.

Do not use Unix-only commands unless clearly labeled and optional.

---

## 3. Application Name

Use one of these names unless the user provides a project name:

```txt
promptflow
prompt-chain-runner
repo-prompt-runner
prodcode-flow
```

Preferred command name:

```bash
promptflow
```

---

## 4. Required CLI Commands

Implement these commands.

### `promptflow init`

Creates a local config file.

```bash
promptflow init
```

Expected output:

```txt
promptflow.yaml created.
```

Config should include:

```yaml
prompt_pack: ./production_code_prompt_system/prompts
target_repo: .
output_dir: ./promptflow_runs
provider: manual
model: null
sequence: production_readiness
stop_on_blocker: true
require_approval_for_patches: true
redact_secrets: true
max_context_files: 80
max_file_bytes: 200000
```

---

### `promptflow doctor`

Validates environment and project setup.

```bash
promptflow doctor
```

Checks:

- Python version
- Config file exists
- Prompt pack path exists
- All required prompt files exist
- Target repo exists
- Output directory is writable
- Git availability, if used
- Provider config, if provider mode is not manual
- Required environment variables
- No obvious prompt-pack corruption

Must not require network access unless provider validation is explicitly requested.

---

### `promptflow list-prompts`

Lists detected prompts in execution order.

```bash
promptflow list-prompts
```

Output table:

```txt
Order | ID | Title | File | Status
```

---

### `promptflow inspect-repo`

Creates a safe repository summary without calling an AI provider.

```bash
promptflow inspect-repo --repo .
```

Must output:

- File tree summary
- Detected language/framework/package manager
- Lockfiles
- Build files
- Test files
- CI/CD files
- Docs
- High-risk files
- Ignored/excluded paths
- Possible secrets redacted
- Suggested first prompt

---

### `promptflow run`

Runs the workflow.

```bash
promptflow run --repo . --prompt-pack ./production_code_prompt_system/prompts
```

Must support:

```bash
promptflow run --sequence full
promptflow run --sequence audit-only
promptflow run --sequence release-certification
promptflow run --from 03 --to 10
promptflow run --only 01
promptflow run --resume
promptflow run --dry-run
promptflow run --provider manual
promptflow run --provider openai
promptflow run --provider anthropic
promptflow run --provider gemini
promptflow run --provider ollama
```

Do not fake provider integrations. Implement provider adapters only when correct API behavior can be verified or clearly documented.

Manual mode must be fully functional.

---

### `promptflow step`

Runs one prompt stage.

```bash
promptflow step 03 --repo .
```

This should:

1. Load the selected prompt
2. Gather repo context
3. Build the final AI request payload
4. Send it to provider or export it for manual execution
5. Save the response
6. Update state

---

### `promptflow resume`

Resumes an interrupted workflow.

```bash
promptflow resume
```

Must read persisted state and continue from the next incomplete stage.

---

### `promptflow report`

Generates a consolidated report from all stage outputs.

```bash
promptflow report --run-id latest
```

Must produce:

```txt
summary.md
full_report.md
blockers.md
warnings.md
next_actions.md
```

---

### `promptflow export`

Exports a run package.

```bash
promptflow export --run-id latest --format zip
```

Must include:

- Config snapshot
- Prompt sequence used
- Repo summary
- Stage outputs
- Consolidated reports
- Logs
- State file
- Verification checklist

---

### `promptflow clean`

Safely removes old run outputs.

```bash
promptflow clean --older-than 30d
```

Must never delete source repo files.

---

## 5. Required File Structure

Generate a professional project structure.

Recommended:

```txt
promptflow/
  pyproject.toml
  README.md
  LICENSE
  .gitignore
  promptflow.yaml.example

  src/
    promptflow/
      __init__.py
      __main__.py
      cli.py
      config.py
      models.py
      prompts.py
      sequences.py
      repo_inspector.py
      context_builder.py
      redaction.py
      providers/
        __init__.py
        base.py
        manual.py
        openai_provider.py
        anthropic_provider.py
        gemini_provider.py
        ollama_provider.py
      runner.py
      state.py
      reports.py
      safety.py
      commands.py
      logging_config.py
      errors.py
      utils.py

  tests/
    test_config.py
    test_prompts.py
    test_sequences.py
    test_repo_inspector.py
    test_redaction.py
    test_state.py
    test_reports.py
    test_manual_provider.py
    test_runner.py

  docs/
    SETUP.md
    CONFIGURATION.md
    PROVIDERS.md
    WORKFLOWS.md
    SAFETY.md
    TROUBLESHOOTING.md
```

If using another language, produce an equivalent professional structure.

---

## 6. Prompt Pack Rules

The CLI must detect prompt files by filename prefix.

Expected prompt files:

```txt
01_codebase_audit_refinement.md
02_bugfix_implementation.md
03_security_hardening_owasp.md
04_testing_regression_coverage.md
05_performance_efficiency.md
06_deep_codebase_refactor.md
07_architecture_recovery_modularization.md
08_dependency_hygiene_build_system.md
09_cicd_release_engineering.md
10_documentation_developer_handoff.md
11_ux_ui_accessibility.md
12_observability_runtime_reliability.md
13_data_layer_api_contracts.md
14_ai_agent_orchestration.md
15_final_release_certification.md
```

The CLI must validate:

- Files exist
- Files are readable
- Files are non-empty
- Numeric order is valid
- Required titles can be inferred
- Missing files are reported clearly

Do not continue full workflow if required prompt files are missing unless user passes:

```bash
--allow-missing-prompts
```

---

## 7. Sequence Definitions

Implement named sequences.

### `full`

Runs:

```txt
14, 01, 08, 02, 03, 13, 04, 06, 07, 05, 12, 11, 09, 10, 15
```

### `audit-only`

Runs:

```txt
14, 01
```

### `security`

Runs:

```txt
14, 03, 13, 12, 04
```

### `build-repair`

Runs:

```txt
14, 08, 09, 10
```

### `refactor`

Runs:

```txt
14, 01, 04, 06, 07, 15
```

### `frontend`

Runs:

```txt
14, 11, 05, 04, 10
```

### `release-certification`

Runs:

```txt
14, 15
```

### `docs`

Runs:

```txt
14, 10
```

The user must also be able to define custom sequences in config.

---

## 8. Repository Context Builder

Implement a safe context builder.

It must collect:

- Repository file tree
- Important root files
- Package/dependency files
- Lockfiles
- Build/config files
- Test config
- CI/CD files
- README/docs
- Source file summaries
- Git status, if available
- Detected stack
- Available commands, inferred only from real config files
- Known constraints from config
- Previous stage outputs

It must exclude:

```txt
.git/
node_modules/
vendor/
dist/
build/
target/
coverage/
.env
.env.*
*.pem
*.key
*.p12
*.db
*.sqlite
*.zip
*.tar
*.7z
*.png
*.jpg
*.jpeg
*.gif
*.mp4
*.mov
*.mp3
```

It must respect:

- `.gitignore`
- User-configured excludes
- Max file count
- Max file size
- Binary detection
- Secret redaction

It must never dump an entire huge repo into the prompt blindly.

---

## 9. Secret Redaction

Implement redaction before sending data to any provider.

Redact likely secrets:

- API keys
- Tokens
- Passwords
- Private keys
- Authorization headers
- Cookies
- Database URLs
- Connection strings
- OAuth secrets
- AWS/GCP/Azure-style credentials
- JWTs
- SSH keys
- `.env` values

Use patterns but avoid false confidence.

Replace with:

```txt
[REDACTED_SECRET]
```

Log that redaction happened, but never log the original secret.

The redactor must have tests.

---

## 10. Provider Architecture

Create a provider abstraction.

```python
class AIProvider:
    def complete(self, request: PromptRequest) -> PromptResponse:
        ...
```

Required provider modes:

### Manual Provider

Must work fully without API keys.

Behavior:

1. Writes the final prompt payload to a markdown file
2. Prints instructions for the user to paste it into an AI tool
3. Lets the user paste response into terminal or provide a response file
4. Saves the response as the stage output

This is mandatory.

### OpenAI Provider

Optional but recommended if correct SDK usage is known in the environment.

Requirements:

- Use environment variable for key
- Do not hardcode secrets
- Configurable model
- Timeout
- Retry with backoff
- Save response
- Handle errors safely

If implementation cannot be verified, create a stub adapter that raises:

```txt
OpenAI provider is not configured. Use manual mode or install/configure provider support.
```

Do not fake successful calls.

### Anthropic Provider

Same rules as OpenAI.

### Gemini Provider

Same rules as OpenAI.

### Ollama Provider

Local provider option.

Requirements:

- Configurable base URL
- Configurable model
- Timeout
- Clear error if Ollama is unavailable
- No internet required

If implementing HTTP directly, use real documented API behavior only.

---

## 11. AI Request Format

Each stage request must include:

```md
# Workflow Stage

- Stage ID:
- Stage title:
- Sequence:
- Target repository:
- Previous stages completed:
- Current task:

# Specialist Prompt

[prompt file content]

# Repository Context

[redacted context summary]

# Previous Stage Outputs

[relevant previous summaries]

# Execution Rules

- Do not invent commands.
- Do not invent files.
- Do not modify files unless explicitly instructed.
- Provide exact file paths.
- Provide verification commands only if real.
- Stop on blockers.
- Provide rollback steps.
```

The tool must save each constructed prompt payload for auditability.

---

## 12. State Management

Persist state per run.

Recommended path:

```txt
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

State file must track:

```json
{
  "run_id": "",
  "sequence": "",
  "target_repo": "",
  "prompt_pack": "",
  "started_at": "",
  "updated_at": "",
  "current_stage": "",
  "completed_stages": [],
  "failed_stages": [],
  "blockers": [],
  "warnings": [],
  "provider": "",
  "model": "",
  "status": "running"
}
```

Support statuses:

```txt
initialized
running
blocked
failed
completed
cancelled
```

---

## 13. Blocker Detection

The runner must scan AI responses for release blockers and stage blockers.

Detect markers such as:

```txt
Release blocked
BLOCKED
Critical
High severity
Cannot continue
Missing command
Build fails
Tests fail
Security risk
Secrets exposed
Data loss risk
Migration unsafe
```

If `stop_on_blocker: true`, stop the workflow and write:

```txt
Workflow stopped because blocker was detected in stage [ID].
```

Allow override:

```bash
promptflow run --continue-on-blocker
```

---

## 14. Patch Handling

Default mode must be report-only.

The CLI must not automatically modify the target repo unless explicitly enabled.

Supported modes:

```txt
report-only
patch-review
apply-patch
```

### `report-only`

Only saves AI recommendations.

### `patch-review`

Extracts code blocks/patches into review files but does not apply them.

### `apply-patch`

Applies patches only after explicit confirmation.

Before applying patches:

- Check git status
- Warn if working tree is dirty
- Create optional checkpoint branch
- Show files to change
- Require confirmation unless `--yes`
- Backup touched files if not using git
- Run verification commands after applying

Never apply destructive database migrations automatically.

---

## 15. Safe Command Runner

If the CLI supports running verification commands, it must be safe.

Rules:

- Do not run arbitrary commands from AI output automatically
- Only run commands from verified config or allowlist
- Use `subprocess.run` with argument arrays when possible
- Avoid `shell=True`
- Show command before running
- Require confirmation for risky commands
- Capture stdout/stderr
- Save logs
- Timeout commands
- Never run destructive commands by default

Risky command examples:

```txt
rm -rf
del /s
format
drop database
delete from
git reset --hard
git clean -fdx
docker system prune
npm publish
twine upload
cargo publish
deployment commands
migration apply commands
```

These require explicit confirmation.

---

## 16. Config File

Create `promptflow.yaml`.

Required fields:

```yaml
prompt_pack: ./production_code_prompt_system/prompts
target_repo: .
output_dir: ./promptflow_runs

provider:
  name: manual
  model: null
  timeout_seconds: 120
  max_retries: 2

workflow:
  sequence: full
  stop_on_blocker: true
  mode: report-only
  include_orchestration: true
  require_approval_for_patches: true

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

commands:
  allow_verification_commands: true
  require_confirmation_for_commands: true
  timeout_seconds: 300

reports:
  generate_summary: true
  generate_blockers: true
  generate_warnings: true
  generate_next_actions: true
```

Validate config with clear errors.

---

## 17. Error Handling

Create custom errors:

```txt
PromptPackError
ConfigError
ProviderError
RepoInspectionError
StateError
SafetyError
CommandExecutionError
ReportError
```

All CLI errors must be user-friendly.

Do not dump stack traces unless debug mode is enabled.

Support:

```bash
promptflow --debug ...
```

---

## 18. Logging

Implement logging.

Requirements:

- Console-friendly output
- File log per run
- Debug mode
- No secret leakage
- Stage start/end logs
- Provider errors
- Command outputs
- State transitions
- Report generation

Use structured-ish logs where practical.

Example:

```txt
[2026-06-03 17:00:00] INFO stage=03 status=started title="Security Hardening + OWASP"
```

---

## 19. Report Generation

Generate:

### `summary.md`

- Run ID
- Target repo
- Sequence used
- Provider
- Completed stages
- Blockers
- Warnings
- Next actions

### `full_report.md`

Concatenates all stage outputs with headings.

### `blockers.md`

Only blockers and required fixes.

### `warnings.md`

Major/minor warnings.

### `next_actions.md`

Prioritized next steps.

### `release_decision.md`

If stage 15 ran, extract final release decision.

---

## 20. Testing Requirements

Create tests for:

- Config loading
- Config validation
- Prompt discovery
- Prompt ordering
- Sequence resolution
- Repo inspection exclusions
- Secret redaction
- Manual provider
- State creation
- Resume behavior
- Report generation
- Blocker detection
- Command safety allowlist
- CLI smoke tests

Use the existing chosen test framework.

If Python, use pytest.

Tests must not require real AI API keys.

Provider API tests must be mocked.

---

## 21. Documentation Requirements

Create:

### `README.md`

Must include:

- What the tool does
- Installation
- Quickstart
- Commands
- Manual mode
- Provider modes
- Safety model
- Output structure
- Examples

### `docs/SETUP.md`

- Install from source
- Editable install
- Python version
- Windows/Linux/macOS notes

### `docs/CONFIGURATION.md`

- Full config reference

### `docs/PROVIDERS.md`

- Manual provider
- Optional AI providers
- Required env vars
- No hardcoded secrets

### `docs/WORKFLOWS.md`

- Named sequences
- Recommended use cases

### `docs/SAFETY.md`

- Redaction
- Patch modes
- Command safety
- Git safety
- Blocker handling

### `docs/TROUBLESHOOTING.md`

- Missing prompt pack
- Provider errors
- Config errors
- Permission errors
- Large repo context
- Resume issues

---

## 22. Packaging Requirements

Create:

```txt
pyproject.toml
```

Must define:

- Project name
- Version
- Python requirement
- Dependencies
- Optional provider dependencies if needed
- Console script entry point

Example concept:

```toml
[project.scripts]
promptflow = "promptflow.cli:app"
```

Only use real syntax for the chosen packaging tool.

---

## 23. Implementation Phases

Work in this exact order.

### Phase 1: Project scaffold

Create file structure, packaging, CLI entrypoint.

### Phase 2: Config system

Load, validate, and create default config.

### Phase 3: Prompt discovery and sequences

Detect prompt pack and resolve sequence order.

### Phase 4: Repo inspector and context builder

Collect safe repo context.

### Phase 5: Redaction

Implement secret redaction and tests.

### Phase 6: Provider abstraction and manual provider

Manual provider must work first.

### Phase 7: Runner and state

Run stages, save state, support resume.

### Phase 8: Reports

Generate summary, blockers, warnings, next actions.

### Phase 9: Safety systems

Patch mode, command safety, blocker handling.

### Phase 10: Optional provider adapters

Implement only if real APIs can be verified.

### Phase 11: Tests

Add unit and CLI smoke tests.

### Phase 12: Documentation

Add README and docs.

### Phase 13: Final verification

Run install, tests, lint/type checks if configured.

---

## 24. Required Final Output From The AI Coding Model

The AI model must return:

```md
# CLI Workflow Builder Implementation Report

## Summary

- Tool name:
- Language:
- CLI framework:
- Package manager:
- Provider modes:
- Safety mode:
- Files created:

## Project Structure

```txt
[final file tree]
```

## Commands

```bash
# install
[real command]

# run CLI
[real command]

# initialize config
[real command]

# inspect repo
[real command]

# run full workflow
[real command]

# run tests
[real command]
```

## Implementation Notes

- Prompt discovery:
- Sequence handling:
- Context builder:
- Redaction:
- Providers:
- State:
- Reports:
- Safety:

## Files Created

For each file, provide complete contents or patches.

## Tests Created

List tests and what they cover.

## Verification

- Install:
- Tests:
- CLI smoke test:
- Manual provider test:

## Known Limitations

List honestly.

## Next Improvements

Prioritized list.
```

---

# Critical Build Requirements

The implementation must be usable immediately.

A successful minimum version must support:

```bash
promptflow init
promptflow doctor
promptflow list-prompts
promptflow inspect-repo --repo .
promptflow run --provider manual --sequence audit-only --repo .
promptflow report --run-id latest
```

If provider APIs are not implemented yet, that is acceptable only if manual mode fully works.

Manual mode is not a placeholder. It is the offline fallback workflow.

---

# Example User Story

A user has this folder:

```txt
production_code_prompt_system/
  prompts/
    01_codebase_audit_refinement.md
    ...
    15_final_release_certification.md
```

They run:

```bash
promptflow init
promptflow doctor
promptflow run --repo C:\Projects\MyApp --prompt-pack .\production_code_prompt_system\prompts --provider manual --sequence full
```

The CLI:

1. Validates config
2. Detects prompts
3. Inspects `C:\Projects\MyApp`
4. Builds stage 14 orchestration prompt payload
5. Saves it to `promptflow_runs/.../prompts/14_payload.md`
6. Asks the user to paste it into an AI model
7. Accepts pasted response or response file
8. Saves response
9. Checks for blockers
10. Continues or stops
11. Repeats for each stage
12. Generates final reports

This must work without API keys.

---

# Final Instruction

Build the CLI as a real project.

Start with manual mode and local workflow safety.

Do not fake cloud AI integrations.

Do not run destructive commands.

Do not assume Unix-only behavior.

Do not mutate the target repository unless explicitly requested.

Make the tool boring, reliable, inspectable, resumable, and safe.

The goal is a professional prompt-runner CLI that can guide a repo through the full 15-stage production code workflow without turning the developer’s project into a confetti cannon.
