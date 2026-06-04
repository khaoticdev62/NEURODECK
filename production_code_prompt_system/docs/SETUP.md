# Setup

## Requirements

- Python 3.11 or higher
- Windows, macOS, or Linux

## Install from source

```bash
git clone https://github.com/example/promptflow.git
cd promptflow
pip install -e ".[dev]"
```

## Editable install

```bash
pip install -e .
```

This creates the `promptflow` command and reflects code changes without reinstallation.

## Verify installation

```bash
promptflow --help
promptflow doctor
```

## Windows notes

- Works in PowerShell and Command Prompt
- No WSL required
- Use forward slashes in config paths or escaped backslashes

## Linux/macOS notes

- Standard terminal usage
- Git is recommended for checkpoint branches
