# FALLOW AUDIT REPORT

## 1. Executive Summary
This report summarizes the codebase health, dead-code findings, cyclomatic/cognitive complexity, and code duplication findings across the **NEURODECK** repository using the Fallow auditing tool.

* **Verdict**: PASS (no new issues introduced on the current branch)
* **Dead Code Issues**: 0 unused files/exports (except 16 minor unresolved type imports in declaration files)
* **Complexity Findings**: 0 critical complexity violations on new code
* **Duplication Percentage**: 0.0% duplication on audited regions

---

## 2. Dead Code Audit Findings
The dead-code run returned **0 unused files** and **0 unused exports**. 

### Unresolved Imports (Type Warnings)
There are 16 occurrences of unresolved type imports inside [vite-env.d.ts](file:///c:/Users/thecr/Desktop/S-Term/frontend/src/react/types/vite-env.d.ts). These are references to `./types/neurodeck` inside the TypeScript declaration file, which does not impact runtime execution but triggers developer warnings.

**Remediation Plan:**
- Suppress via `.fallowrc.json` or fix specifier resolution in `tsconfig.json`.

---

## 3. Code Complexity & Hotspots
The Fallow health score identified several hotspots in legacy/uncovered functions where complexity is high:

1. **`frontend/src/main.js`**
   - **Metrics**: Cognitive complexity is high in legacy monolithic views.
   - **Hotspot**: `_updateHelpPreview` (cognitive: 34), `_editCommand` (cognitive: 34).
   - **Recommendation**: Extract these helper methods into separate files.

2. **`frontend/src/react/features/torrent/TorrentView.tsx`**
   - **Metrics**: Complexity Density = 0.33 (threshold: 0.3).
   - **Hotspots**: `TorrentView` (cognitive: 16), `torrentStatusKey` (cognitive: 11), `formatEta` (cognitive: 10).
   - **Recommendation**: Write unit tests for `formatEta` and split the `TorrentView` into sub-components.

3. **`frontend/src/api_lab.js`**
   - **Metrics**: Complexity Density = 0.36.
   - **Hotspots**: `_getAuthHeaders` (cognitive: 12), `_saveRequestToCollection` (cognitive: 12), `_sendRequest` (cognitive: 11).

4. **`frontend/src/workflow_view.js`**
   - **Metrics**: Complexity Density = 0.36.
   - **Hotspots**: `_execNode` (cognitive: 22), `_renderNodes` (cognitive: 21), `_evalCondition` (cognitive: 20).

---

## 4. Code Duplication / Clone Groups
* **Duplicated Lines**: 0 lines
* **Duplicated Tokens**: 0 tokens
* **Duplication Percentage**: 0.0%

---

## 5. Architectural Boundary Check
* **Boundary Violations**: 0
* **Circular Dependencies**: 0
* **Policy Violations**: 0

*No architectural boundaries are violated in the current branch. All modules adhere strictly to the Monorepo package scope.*
