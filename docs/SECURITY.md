# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.3.x   | :white_check_mark: |
| < 1.2.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in NEURODECK, please report it responsibly.

**Please do NOT open a public GitHub issue for security bugs.**

Instead, email the maintainer directly at:

```
khaoticdev62 [at] gmail [dot] com
```

Include the following details:
- A clear description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact assessment
- Suggested mitigation or patch (if you have one)

You can expect an initial response within **72 hours**. We will work with you to validate the issue, develop a fix, and coordinate disclosure.

## Security Hardening

NEURODECK undergoes regular security audits. The latest audit reports are available in:

- `docs/SECURITY_AUDIT_2026-05-26.md`
- `docs/SECURITY_AUDIT_2026-05-26_POST_ONBOARDING.md`

## Security-Related Environment Variables

- `NEURODECK_ALLOW_UNSAFE_EXEC` — Bypasses the script execution blocklist. Use only in isolated development environments.
- `GEMINI_API_KEY` — Your LLM provider API key. Never commit this to version control.

## Automated Scanning

Security scanning is run automatically via GitHub Actions on every push and weekly via cron:

- `cargo audit` — Rust dependency vulnerability scanning
- `cargo deny` — License and crate policy enforcement
- `npm audit` — Node.js dependency vulnerability scanning
- CodeQL — Static analysis for Rust and JavaScript
- TruffleHog — Secret leakage detection
