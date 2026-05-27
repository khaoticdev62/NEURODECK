# Environment Variables

NEURODECK uses a minimal set of environment variables. Copy `.env.example` to `.env` and fill in your values.

## Required

| Variable        | Purpose                              | Example                        |
|-----------------|--------------------------------------|--------------------------------|
| `GEMINI_API_KEY`| Gemini API key for LLM features      | `AIzaSy...`                    |

## Optional

| Variable                     | Purpose                           | Default                        |
|------------------------------|-----------------------------------|--------------------------------|
| `LLM_PROVIDER`               | Override LLM provider             | `gemini` (or `ollama`)         |
| `OLLAMA_HOST`                | Ollama base URL                   | `http://localhost:11434`       |
| `GOOGLE_CLIENT_ID`           | Google OAuth2 client ID           | *(none)*                       |
| `NEURODECK_ALLOW_UNSAFE_EXEC`| Bypass script blocklist           | *(unset)*                      |
| `TAURI_DEBUG`                | Enable debug build/source maps    | *(unset)*                      |

## Security Notes

- `GEMINI_API_KEY` is stored in the OS keychain at runtime, not in plain text.
- `NEURODECK_ALLOW_UNSAFE_EXEC` bypasses the script execution blocklist. **Only use in isolated development environments.**
- Never commit `.env` to version control. `.gitignore` already excludes it.

## Public vs Private

All environment variables are **backend/private** only. The frontend does not use `VITE_` or `NEXT_PUBLIC_` prefixed variables because the app is a Tauri desktop app, not a web app.
