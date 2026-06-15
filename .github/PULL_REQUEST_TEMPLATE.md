## What does this PR do?

> One paragraph. What problem does it solve and how?

---

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor (no behavior change)
- [ ] Docs / comments
- [ ] Build / CI
- [ ] Performance
- [ ] UI / UX
- [ ] Agent-driven change

---

## Checklist

- [ ] `cargo check --workspace` passes with 0 errors
- [ ] `npm run frontend:build` passes
- [ ] New bridge commands added to `commands/mod.rs` dispatch table
- [ ] New bridge commands added to frontend `invoke()` type map / neurobridge.js
- [ ] No `display: flex` added to `#view-*` ID rules in CSS
- [ ] No `unwrap()` in bridge command handlers
- [ ] Both `llm-term.toml` copies updated if config schema changed
- [ ] `AGENTS.md` updated if new patterns or quirks were introduced
- [ ] **UI change only:** `npm run checkpoint:ui` was run and the checkpoint tag is noted below
- [ ] **UI change only:** visual regression / accessibility checks pass (or deviations are justified)

---

## UI checkpoint (if applicable)

> If this PR touches CSS/JS UI, run `npm run checkpoint:ui` and paste the tag here:

Checkpoint tag: `ui-checkpoint-...`

Can this change be reverted with `npm run rollback:ui:<tag>`?  
- [ ] Yes — the checkpoint covers the changed UI paths.
- [ ] No — explain why:

---

## Agent report

> Required for PRs opened by or on behalf of an agent. Optional for human PRs.

| Field | Value |
|-------|-------|
| Agent | e.g. `silk`, `amadeus`, `cho`, `sam`, `alexander` |
| Commit range | `<first-sha>..<last-sha>` |
| Local verification | `npm run preflight` / `npm run ci` / manual |
| Tests | `cargo test`, `npm run frontend:test`, Playwright, etc. |
| Rollback plan | Yes / No |

If rollback plan is **No**, explain why and describe the recovery steps.

---

## Testing

> How did you verify this works? What should reviewers test?

---

## Screenshots (if UI changed)

> Attach before/after screenshots or Loom link.
