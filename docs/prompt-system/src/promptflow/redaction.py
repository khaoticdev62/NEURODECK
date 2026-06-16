"""Secret redaction utilities."""

from __future__ import annotations

import re
from typing import Any

# Patterns for likely secrets
_REDACTION_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # AWS keys
    (re.compile(r"AKIA[0-9A-Z]{16}"), "[REDACTED_AWS_KEY]"),
    # JWTs (three base64url sections separated by dots) — match before token/api_key patterns
    (re.compile(r"eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*"), "[REDACTED_JWT]"),
    # Generic API keys
    (
        re.compile(r"(?i)(api[_-]?key\s*[:=]\s*)['\"]?[a-z0-9_\-]{16,}['\"]?"),
        r"\1[REDACTED_API_KEY]",
    ),
    # Generic tokens
    (re.compile(r"(?i)(token\s*[:=]\s*)['\"]?[a-z0-9_\-]{8,}['\"]?"), r"\1[REDACTED_TOKEN]"),
    # Passwords
    (re.compile(r"(?i)(password\s*[:=]\s*)['\"]?[^\s'\"]+['\"]?"), r"\1[REDACTED_PASSWORD]"),
    # Secret values
    (re.compile(r"(?i)(secret\s*[:=]\s*)['\"]?[^\s'\"]+['\"]?"), r"\1[REDACTED_SECRET]"),
    # Authorization Bearer
    (re.compile(r"(?i)(authorization\s*:\s*bearer\s+)\S+"), r"\1[REDACTED_BEARER_TOKEN]"),
    # Basic auth
    (re.compile(r"(?i)(authorization\s*:\s*basic\s+)\S+"), r"\1[REDACTED_BASIC_AUTH]"),
    # Connection strings with passwords
    (re.compile(r"(?i)([a-z]+://[^:]+:)([^@]+)(@.+)"), r"\1[REDACTED_PASSWORD]\3"),
    # Database URLs
    (
        re.compile(r"(?i)(DATABASE_URL\s*[:=]\s*)['\"]?[^\s'\"]+['\"]?"),
        r"\1[REDACTED_DATABASE_URL]",
    ),
    # Private keys (PEM blocks)
    (
        re.compile(
            r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"
        ),
        "[REDACTED_PRIVATE_KEY]",
    ),
    # .env values (only uppercase keys like traditional environment variables)
    (re.compile(r"^(\s*[A-Z_][A-Z0-9_]*\s*=\s*)(.+)$", re.MULTILINE), r"\1[REDACTED_ENV_VALUE]"),
    # Cookies
    (re.compile(r"(?i)(cookie\s*:\s*)[^\r\n]+"), r"\1[REDACTED_COOKIE]"),
    # OAuth client secrets
    (
        re.compile(r"(?i)(client_secret\s*[:=]\s*)['\"]?[^\s'\"]+['\"]?"),
        r"\1[REDACTED_CLIENT_SECRET]",
    ),
    # GCP service account keys
    (
        re.compile(
            r"\"type\":\s*\"service_account\".*?\"private_key\":\s*\"-----BEGIN PRIVATE KEY-----[\\s\\S]*?-----END PRIVATE KEY-----\"",
            re.DOTALL,
        ),
        "[REDACTED_GCP_SERVICE_ACCOUNT]",
    ),
    # Azure keys
    (
        re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"),
        "[REDACTED_UUID]",
    ),
    # SSH keys inline
    (re.compile(r"ssh-(rsa|ed25519|ecdsa)\s+AAAA[0-9A-Za-z+/]+[=]{0,3}"), "[REDACTED_SSH_KEY]"),
    # Slack tokens
    (re.compile(r"xox[baprs]-[0-9a-zA-Z\-]+"), "[REDACTED_SLACK_TOKEN]"),
    # GitHub tokens
    (re.compile(r"gh[pousr]_[A-Za-z0-9_]{36,}"), "[REDACTED_GITHUB_TOKEN]"),
]


def redact_text(text: str) -> str:
    """Redact likely secrets from text."""
    result = text
    for pattern, replacement in _REDACTION_PATTERNS:
        result = pattern.sub(replacement, result)
    return result


def redact_dict(data: dict[str, str]) -> dict[str, str]:
    """Redact values in a dictionary."""
    return {k: redact_text(v) for k, v in data.items()}


def redaction_summary(original: str, redacted: str) -> dict[str, Any]:
    """Return a summary of redaction actions (without leaking secrets)."""
    return {
        "redaction_applied": original != redacted,
        "original_length": len(original),
        "redacted_length": len(redacted),
        "note": "Secrets were redacted before output. Original content was not logged.",
    }
