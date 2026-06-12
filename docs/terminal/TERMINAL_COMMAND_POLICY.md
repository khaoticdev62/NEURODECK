# Terminal Command Policy

Commands are classified as `safe`, `confirm`, `dangerous`, `blocked`, or `unknown`.

- `safe`: allow direct PTY write.
- `confirm`: require explicit user approval.
- `dangerous`: require stronger confirmation.
- `blocked`: do not write to the PTY.
- `unknown`: surface as unverified and let the user decide.

