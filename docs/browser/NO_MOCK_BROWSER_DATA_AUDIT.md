# No Mock Browser Data Audit

This document traces mock elements in the browser codebase and certifies the integrity of real data flow in **NeuroBrowse**.

## 1. Audit Strategy
- **Target Terms**: `mockTabs`, `fakeTabs`, `demoTabs`, `placeholderTabs`, `mockHistory`, `fakeHistory`, `mockBookmarks`, `fakeBookmarks`, `mockDownloads`, `fakeDownloads`.
- **Allowed Contexts**: `tests/**`, `*.test.ts`, `*.spec.ts`, and test fixtures.
- **Forbidden Contexts**: Production code under `src/main/services/browser/`, `electron/`, and `frontend/src/react/features/browser/`.

## 2. Findings
- **History list**: The current history is stored in an in-memory array in `electron/main.js` which is reset on restart. This is a partial mock (since it does not persist). It will be migrated to a SQLite-backed persistence database or a local JSON file.
- **Permission states**: Currently set to mock decisions (always allowing notifications). This will be replaced with a stateful permissions registry.
- **Local url downloads**: Handled in-memory without validation. The new service will write download events to disk.
