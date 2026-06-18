"""Safe repository inspection and context gathering."""

from __future__ import annotations

import fnmatch
import os
from pathlib import Path
from typing import Any

from promptflow.errors import RepoInspectionError

# Known stack indicators
STACK_INDICATORS: dict[str, list[str]] = {
    "Node.js": ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"],
    "Python": ["requirements.txt", "pyproject.toml", "setup.py", "setup.cfg", "Pipfile"],
    "Rust": ["Cargo.toml", "Cargo.lock"],
    "Go": ["go.mod", "go.sum"],
    "Java": ["pom.xml", "build.gradle", "build.gradle.kts"],
    "Ruby": ["Gemfile", "Gemfile.lock"],
    "PHP": ["composer.json", "composer.lock"],
    ".NET": [".csproj", ".sln", "packages.config"],
    "Docker": ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"],
}

LOCKFILES = [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
    "Pipfile.lock",
    "Cargo.lock",
    "go.sum",
    "Gemfile.lock",
    "composer.lock",
    "yarn.lock",
    "package-lock.json",
    "Cargo.lock",
    "poetry.lock",
    "mix.lock",
    "pnpm-lock.yaml",
    "bun.lockb",
]

BUILD_FILES = [
    "Makefile",
    "CMakeLists.txt",
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "vite.config.ts",
    "vite.config.js",
    "webpack.config.js",
    "rollup.config.js",
    "tsconfig.json",
    "esbuild.js",
]

CI_PATTERNS = [
    ".github/workflows/*.yml",
    ".github/workflows/*.yaml",
    ".gitlab-ci.yml",
    ".gitlab-ci.yaml",
    ".circleci/config.yml",
    "azure-pipelines.yml",
    "Jenkinsfile",
    ".travis.yml",
    "appveyor.yml",
]

TEST_PATTERNS = [
    "test_*",
    "*_test",
    "*_spec",
    "*.test.*",
    "*.spec.*",
    "tests",
    "__tests__",
    "spec",
    "cypress",
    "playwright",
    "jest.config.*",
    "vitest.config.*",
    "pytest.ini",
    "tox.ini",
]

HIGH_RISK_PATTERNS = [
    "*.pem",
    "*.key",
    "*.p12",
    "*.crt",
    "*.env",
    ".env.*",
    "id_rsa",
    "id_ed25519",
    "id_ecdsa",
    "known_hosts",
    "authorized_keys",
    "credentials",
    "secrets",
    "*.keystore",
]

EXCLUDED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".mp4",
    ".mov",
    ".mp3",
    ".zip",
    ".tar",
    ".gz",
    ".7z",
    ".rar",
    ".db",
    ".sqlite",
    ".sqlite3",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".eot",
    ".pdf",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
}


def _parse_gitignore(repo_path: Path) -> list[str]:
    """Read and parse .gitignore patterns (basic support)."""
    gitignore = repo_path / ".gitignore"
    if not gitignore.exists():
        return []
    patterns: list[str] = []
    for line in gitignore.read_text(encoding="utf-8", errors="ignore").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        patterns.append(stripped)
    return patterns


def _matches_gitignore(relative: Path, patterns: list[str]) -> bool:
    """Check if a relative path matches any gitignore pattern."""
    path_str = relative.as_posix()
    path_str_dir = path_str + "/"
    matched = False
    for pattern in patterns:
        if pattern.startswith("!"):
            # Negation
            neg_pattern = pattern[1:]
            if _match_pattern(path_str, neg_pattern) or _match_pattern(path_str_dir, neg_pattern):
                matched = False
        else:
            if _match_pattern(path_str, pattern) or _match_pattern(path_str_dir, pattern):
                matched = True
    return matched


def _match_pattern(path_str: str, pattern: str) -> bool:
    """Match a path against a single gitignore-style pattern."""
    # Handle directory-only patterns
    dir_only = pattern.endswith("/")
    if dir_only:
        pattern = pattern[:-1]

    # Handle anchored patterns (contain / but do not start with /)
    if "/" in pattern and not pattern.startswith("/"):
        # Match from repo root
        if fnmatch.fnmatch(path_str, pattern):
            return True
        if fnmatch.fnmatch(path_str, "**" + "/" + pattern):
            return True
    elif pattern.startswith("/"):
        pattern = pattern[1:]
        if fnmatch.fnmatch(path_str, pattern):
            return True
        if fnmatch.fnmatch(path_str, pattern + "/*"):
            return True
    else:
        # Unanchored — match any path component
        parts = path_str.split("/")
        for part in parts:
            if fnmatch.fnmatch(part, pattern):
                return True
        # Also match full path with **/ prefix
        if fnmatch.fnmatch(path_str, "**/" + pattern):
            return True
    return False


def _is_binary(file_path: Path, sample_bytes: int = 8192) -> bool:
    """Heuristic: check if a file is binary by looking for null bytes."""
    try:
        with file_path.open("rb") as f:
            chunk = f.read(sample_bytes)
            if b"\x00" in chunk:
                return True
            # Also check for very high ratio of non-printable bytes
            if not chunk:
                return False
            non_text = sum(1 for b in chunk if b < 32 and b not in (9, 10, 13))
            return non_text / len(chunk) > 0.30
    except OSError:
        return True


def inspect_repo(
    repo_path: Path | str,
    respect_gitignore: bool = True,
    extra_excludes: list[str] | None = None,
    max_files: int = 80,
    max_file_bytes: int = 200_000,
) -> dict[str, Any]:
    """Inspect a repository and return a structured summary."""
    repo = Path(repo_path).resolve()
    if not repo.exists():
        raise RepoInspectionError(f"Repository does not exist: {repo}")
    if not repo.is_dir():
        raise RepoInspectionError(f"Repository path is not a directory: {repo}")

    gitignore_patterns = _parse_gitignore(repo) if respect_gitignore else []
    extra_excludes = extra_excludes or []

    file_tree: list[str] = []
    root_files: list[str] = []
    lockfiles_found: list[str] = []
    build_files_found: list[str] = []
    test_files_found: list[str] = []
    ci_files_found: list[str] = []
    docs_found: list[str] = []
    high_risk_found: list[str] = []
    source_summaries: list[dict[str, Any]] = []
    stack_votes: dict[str, int] = dict.fromkeys(STACK_INDICATORS, 0)

    total_files = 0

    for root, dirs, files in os.walk(repo, topdown=True):
        root_path = Path(root)
        rel_root = root_path.relative_to(repo)

        # Filter out excluded directories
        dirs_to_remove: list[str] = []
        for d in dirs:
            rel_dir = rel_root / d if str(rel_root) != "." else Path(d)
            rel_dir_str = rel_dir.as_posix()
            # Hardcoded excludes
            if d in {
                ".git",
                "node_modules",
                "__pycache__",
                ".venv",
                "venv",
                "dist",
                "build",
                "target",
                "coverage",
                ".pytest_cache",
                ".mypy_cache",
                ".ruff_cache",
            }:
                dirs_to_remove.append(d)
                continue
            if extra_excludes and any(
                fnmatch.fnmatch(rel_dir_str, pat) or fnmatch.fnmatch(d, pat)
                for pat in extra_excludes
            ):
                dirs_to_remove.append(d)
                continue
            if respect_gitignore and _matches_gitignore(rel_dir, gitignore_patterns):
                dirs_to_remove.append(d)
                continue
        for d in dirs_to_remove:
            dirs.remove(d)

        for file_name in files:
            rel_file = rel_root / file_name if str(rel_root) != "." else Path(file_name)
            rel_file_str = rel_file.as_posix()

            if extra_excludes and any(
                fnmatch.fnmatch(rel_file_str, pat) or fnmatch.fnmatch(file_name, pat)
                for pat in extra_excludes
            ):
                continue

            if respect_gitignore and _matches_gitignore(rel_file, gitignore_patterns):
                continue

            file_path = root_path / file_name
            suffix = file_path.suffix.lower()

            if suffix in EXCLUDED_EXTENSIONS:
                continue

            total_files += 1
            file_tree.append(rel_file_str)

            # Root files
            if str(rel_root) == ".":
                root_files.append(file_name)

            # Stack detection
            for stack, indicators in STACK_INDICATORS.items():
                if file_name in indicators:
                    stack_votes[stack] += 1

            # Lockfiles
            if file_name in LOCKFILES:
                lockfiles_found.append(rel_file_str)

            # Build files
            if file_name in BUILD_FILES or file_name.lower().startswith("dockerfile"):
                build_files_found.append(rel_file_str)

            # CI files
            for pat in CI_PATTERNS:
                if fnmatch.fnmatch(rel_file_str, pat) or fnmatch.fnmatch(file_name, pat):
                    ci_files_found.append(rel_file_str)
                    break

            # Test files
            for pat in TEST_PATTERNS:
                if fnmatch.fnmatch(file_name, pat) or fnmatch.fnmatch(rel_file_str, pat):
                    test_files_found.append(rel_file_str)
                    break

            # Docs
            if (
                file_name.lower().startswith("readme")
                or file_name.lower().startswith("changelog")
                or file_name.lower().startswith("contributing")
                or file_name.lower().startswith("license")
            ):
                docs_found.append(rel_file_str)
            if rel_file_str.startswith("docs/") or rel_file_str.startswith("doc/"):
                docs_found.append(rel_file_str)

            # High-risk files
            for pat in HIGH_RISK_PATTERNS:
                if fnmatch.fnmatch(file_name, pat) or fnmatch.fnmatch(rel_file_str, pat):
                    high_risk_found.append(rel_file_str)
                    break

            # Source summaries (respect limits, skip high-risk files)
            is_high_risk = any(
                fnmatch.fnmatch(file_name, pat) or fnmatch.fnmatch(rel_file_str, pat)
                for pat in HIGH_RISK_PATTERNS
            )
            if len(source_summaries) < max_files and not is_high_risk:
                try:
                    size = file_path.stat().st_size
                    if size <= max_file_bytes and not _is_binary(file_path):
                        content = file_path.read_text(encoding="utf-8", errors="ignore")
                        lines = content.count("\n") + 1
                        source_summaries.append(
                            {
                                "path": rel_file_str,
                                "size": size,
                                "lines": lines,
                                "preview": content[:500] if content else "",
                            }
                        )
                except OSError:
                    pass

    detected_stacks = sorted(
        [s for s, v in stack_votes.items() if v > 0],
        key=lambda s: stack_votes[s],
        reverse=True,
    )

    # Git status
    git_status = ""
    git_branch = ""
    try:
        import subprocess

        result = subprocess.run(
            ["git", "status", "--short"],
            cwd=repo,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            git_status = result.stdout.strip()
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=repo,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            git_branch = result.stdout.strip()
    except Exception:
        pass

    suggested_first = "14"
    if detected_stacks:
        suggested_first = "01"

    return {
        "repo_path": str(repo),
        "total_files_scanned": total_files,
        "file_tree": file_tree,
        "root_files": root_files,
        "detected_stacks": detected_stacks,
        "lockfiles": lockfiles_found,
        "build_files": build_files_found,
        "test_files": test_files_found,
        "ci_files": ci_files_found,
        "docs": docs_found,
        "high_risk_files": high_risk_found,
        "source_summaries": source_summaries,
        "git_branch": git_branch,
        "git_status": git_status,
        "suggested_first_prompt": suggested_first,
    }
