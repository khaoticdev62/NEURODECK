# Terminal Security Model

- Shell execution lives in the Rust main process.
- Renderer code does not import `child_process`, `fs`, `node-pty`, or `process.env`.
- Secrets and command-line credentials are redacted from history and diagnostics.
- Private or read-only profiles are treated as policy, not decoration.

