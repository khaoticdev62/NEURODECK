# Terminal Architecture

Renderer UI -> typed preload API -> bridge command -> Rust PTY/session service -> real shell process.

The renderer never receives raw PTY handles or shell access. It only:

1. Requests session lifecycle changes.
2. Streams input/output through typed bridge calls.
3. Renders diagnostics and history state.
4. Uses command safety classification before execution.
