# NEURODECK UI Checkpoint & Rollback Guide

The UI checkpoint system lets contributors save a known-good UI state before large changes (especially AAAA cosmetic passes) and roll back to it safely if something breaks.

---

## What is a UI checkpoint?

A UI checkpoint is:
- A git annotated tag: `ui-checkpoint-<name>`
- A build-verified snapshot of UI-related files
- An entry in `ui-checkpoints.json` with metadata (sha, branch, timestamp, protected paths, build hash)

Checkpoints never touch user data in `~/.config/neurodeck/` or `%APPDATA%\neurodeck\`.

---

## Creating a checkpoint

```bash
# On a ui/* or feature/* branch
npm run checkpoint:ui -- --name my-feature --description "Baseline before new theme"
```

This will:
1. Validate the branch name (use `--force` to override on other branches).
2. Run `npm run frontend:build` and `npm run build:main`.
3. Create the tag `ui-checkpoint-my-feature`.
4. Append the checkpoint to `ui-checkpoints.json`.

---

## Listing checkpoints

```bash
npm run rollback:ui:list
```

Prints a Markdown table of all recorded checkpoints with rollback commands.

---

## Rolling back

All rollback commands are safe to inspect before applying.

### Soft preview (non-destructive)

```bash
npm run rollback:ui:preview ui-checkpoint-my-feature
```

Shows which files would be reset and builds the checkpoint in a temporary worktree to compare build outputs.

### Apply rollback

```bash
npm run rollback:ui:apply ui-checkpoint-my-feature
```

1. Stashes current changes.
2. Resets the protected UI paths to the checkpoint tag.
3. Rebuilds the frontend and main process.
4. Marks the checkpoint as `rolledBack: true` in `ui-checkpoints.json`.

To restore the stashed work afterward:

```bash
git stash pop
```

### Roll back to the latest checkpoint

```bash
npm run rollback:ui:latest
```

Uses the most recent non-rolled-back checkpoint.

---

## CI checkpoint gate

Pull requests that touch frontend or Electron UI files trigger `.github/workflows/ui-checkpoint-gate.yml`.

The gate verifies:
- A UI checkpoint tag exists for the PR.
- The checkpoint is recorded in `ui-checkpoints.json`.
- The checkpoint build output is consistent with the PR (within an expected diff threshold).

If the gate fails, the PR receives a comment with the recommended rollback command.

---

## Best practices

- Create a checkpoint before starting any AAAA cosmetic pass or large UI refactor.
- Name checkpoints descriptively: `ui-checkpoint-phase-1-aaaa`.
- Push checkpoint tags to the remote so CI can find them: `git push origin ui-checkpoint-<name>`.
- Do not delete checkpoint tags; mark them `rolledBack` instead.

---

## Troubleshooting

### `No UI checkpoints recorded yet`

Run `npm run checkpoint:ui` on a UI branch first.

### `Checkpoint tag not found`

The tag may exist locally but not on the remote. Push it:

```bash
git push origin ui-checkpoint-<name>
```

### Build diff is too large

The checkpoint may be stale. Create a fresh checkpoint from the current branch state.
