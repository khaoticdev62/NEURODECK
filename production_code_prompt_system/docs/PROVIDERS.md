# Providers

## Manual provider (default)

No setup required. PromptFlow writes the prompt payload to a file and asks you to paste the AI response.

```bash
promptflow run --provider manual
```

## OpenAI

Requires `openai` package and API key.

```bash
pip install promptflow[openai]
export OPENAI_API_KEY="sk-..."
promptflow run --provider openai --model gpt-4o
```

## Anthropic

Requires `anthropic` package and API key.

```bash
pip install promptflow[anthropic]
export ANTHROPIC_API_KEY="sk-ant-..."
promptflow run --provider anthropic --model claude-3-5-sonnet-latest
```

## Gemini

Requires `google-generativeai` package and API key.

```bash
pip install promptflow[gemini]
export GOOGLE_API_KEY="..."
promptflow run --provider gemini --model gemini-1.5-flash
```

## Ollama

Requires `httpx` and a running Ollama instance.

```bash
pip install promptflow[ollama]
ollama serve
promptflow run --provider ollama --model llama3.1
```

## No hardcoded secrets

PromptFlow never embeds API keys in source code or config files. Keys are read from environment variables at runtime.
