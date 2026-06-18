"""Tests for secret redaction."""

from promptflow.redaction import redact_text


class TestRedaction:
    def test_redact_aws_key(self) -> None:
        text = "AWS_KEY=AKIAIOSFODNN7EXAMPLE"
        result = redact_text(text)
        assert "AKIAIOSFODNN7EXAMPLE" not in result
        assert "[REDACTED" in result

    def test_redact_api_key(self) -> None:
        text = 'api_key = "sk-1234567890abcdef"'
        result = redact_text(text)
        assert "sk-1234567890abcdef" not in result
        assert "[REDACTED_API_KEY]" in result

    def test_redact_password(self) -> None:
        text = "password = supersecret123"
        result = redact_text(text)
        assert "supersecret123" not in result
        assert "[REDACTED_PASSWORD]" in result

    def test_redact_jwt(self) -> None:
        text = "token: eyJhbGciOiJIUzI1NiIs.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMe"
        result = redact_text(text)
        assert "eyJhbGciOiJIUzI1NiIs" not in result
        assert "[REDACTED_JWT]" in result

    def test_redact_private_key(self) -> None:
        text = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
        result = redact_text(text)
        assert "BEGIN RSA PRIVATE KEY" not in result
        assert "[REDACTED_PRIVATE_KEY]" in result

    def test_redact_env_values(self) -> None:
        text = "DATABASE_URL=postgres://user:pass@localhost/db\nAPI_KEY=secret123"
        result = redact_text(text)
        assert "secret123" not in result
        assert "[REDACTED_ENV_VALUE]" in result

    def test_redact_connection_string(self) -> None:
        text = "mysql://admin:hunter2@db.example.com:3306/prod"
        result = redact_text(text)
        assert "hunter2" not in result
        assert "[REDACTED_PASSWORD]" in result

    def test_no_false_positives_on_safe_text(self) -> None:
        text = "The quick brown fox jumps over the lazy dog."
        result = redact_text(text)
        assert result == text

    def test_redact_bearer_token(self) -> None:
        text = "Authorization: Bearer abc.def.ghi"
        result = redact_text(text)
        assert "abc.def.ghi" not in result
        assert "[REDACTED_BEARER_TOKEN]" in result
