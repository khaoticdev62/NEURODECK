// Thin re-export so ESLint's flat-config base path is the repo root, which is
// an ancestor of both `frontend/` and `src/renderer/`. The actual rules live in
// frontend/eslint.config.js — flat config resolves `files`/`ignores` patterns
// relative to whichever config file's directory is used as the base path, and
// frontend/ is NOT an ancestor of src/renderer/, so linting `src/renderer/**`
// from frontend/eslint.config.js always reports "all matched files are ignored".
export default (await import("./frontend/eslint.config.js")).default;
