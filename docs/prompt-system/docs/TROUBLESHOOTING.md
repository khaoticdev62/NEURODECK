# Troubleshooting

## Missing prompt pack

```
Error: Prompt pack directory does not exist: ./prompts
```

Fix: Update `prompt_pack` in `promptflow.yaml` to the correct path.

## Provider errors

```
OpenAI provider requires the 'openai' package.
```

Fix: Install the optional dependency:

```bash
pip install promptflow[openai]
```

## Config errors

```
Config file not found: promptflow.yaml
```

Fix: Run `promptflow init` to create one.

## Permission errors

If the output directory is not writable:

```bash
promptflow doctor
```

This checks directory permissions. Choose a writable path for `output_dir`.

## Large repo context

If context building is slow or too large:

- Reduce `max_context_files` and `max_file_bytes` in config
- Add paths to `context.exclude`
- Enable `respect_gitignore: true`

## Resume issues

If a run cannot be resumed:

- Check that the run directory still exists under `output_dir/`
- Verify `state.json` is present and valid
- Use `promptflow report --run-id <id>` to inspect

## Manual mode input

On Windows, press `Ctrl+Z` then `Enter` to finish multi-line input.
On Unix, press `Ctrl+D`.
