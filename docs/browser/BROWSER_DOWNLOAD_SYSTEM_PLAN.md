# Browser Download System Plan

This document outlines the download management, security boundaries, and auditing systems for **NeuroBrowse**.

## 1. Safety & Path Sanitization
- **Path Traversal Prevention**: Filenames are stripped of path navigation characters (such as `..`, `/`, `\`) using `path.basename()` to force all downloads to reside within the designated downloads directory.
- **File Extensions Warnings**:
  - Safe types: `.txt`, `.pdf`, `.png`, `.jpg`, `.md`, `.zip` (archives require warning).
  - High-risk types: `.exe`, `.msi`, `.bat`, `.sh`, `.cmd`, `.js`, `.vbs`.
  - When a user downloads a high-risk file, a confirmation modal is displayed warning of execution risks.
- **Directory Isolation**: All download folder writes must route through the main process's `will-download` API to prevent sandboxed guest code from choosing arbitrary paths.

## 2. Diagnostics Tracking
Each download event registers a record containing:
- `id`: Unique download ID.
- `url`: Source URL.
- `filename`: Sanitized filename.
- `totalBytes`: Expected file size.
- `receivedBytes`: Progress counter.
- `state`: `progressing` | `completed` | `cancelled` | `interrupted`.
- `profileId`: Owner profile.
