# Epic: Repository Restructuring and Duplicate Cleanup

## Objective
Standardize and clean up the repository by removing duplicate and redundant directories, consolidating shell scripts, and ensuring configuration files are properly preserved and referenced.

## Background
Over multiple dev sprints, duplicate folders (like `.agent/` and `.agents/`) and empty directories (like `themes/` and `src-tauri/plugins/`) have accumulated. To prepare the project for production packaging and maintain clean workspace hygiene, we need to consolidate scripts, eliminate redundant folders, and update paths in scripts and documentation.

## User Stories

### Story 1: Consolidate Agent Skills Directory
**As a** developer or automated agent,
**I want to** have a single, unified skills directory (`.agents/`),
**So that** there is no confusion between `.agent/` and `.agents/` and tools fetch from the correct path.
- **Acceptance Criteria**:
  - Remove the duplicate root-level `.agent/` directory.
  - Retain `.agents/` as the single source of truth for BMAD skills.

### Story 2: Clean Up Empty Legacy Folders
**As a** contributor,
**I want to** remove empty directories that serve no current purpose,
**So that** the project tree remains minimal and clean.
- **Acceptance Criteria**:
  - Remove root-level empty `themes/` directory.
  - Remove `src-tauri/plugins/` (since plugins are resolved dynamically from root `plugins/` or packaging).

### Story 3: Consolidate Shell Scripts
**As a** Linux packager,
**I want to** locate all build and helper shell scripts in the `scripts/shell/` folder,
**So that** the repository root does not contain loose utility scripts.
- **Acceptance Criteria**:
  - Move `build_flatpak.sh` to `scripts/shell/build_flatpak.sh`.
  - Update `scripts/kfms/khaotic-init.sh` to remove `build_flatpak.sh` from the root preservation list.
  - Update references to `build_flatpak.sh` in the release plan and documentation.

### Story 4: Verify Hygiene and Sync KFMS
**As a** release manager,
**I want to** verify that the restructuring satisfies the KFMS standard and does not break builds,
**So that** we maintain health score 100 before tagging the release.
- **Acceptance Criteria**:
  - Run `khaotic-init.sh status` and `validate` to confirm a clean workspace and health score.
  - Verify both Tauri backend compiles and frontend builds successfully.
