import { useCallback, useEffect, useState, type ElementType } from "react";
import {
  GitBranch,
  RefreshCw,
  GitCommit,
  GitMerge,
  FilePlus,
  FileMinus,
  CircleDot,
  AlertTriangle,
  ArrowUpFromLine,
} from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { Panel } from "../../components/primitives/Panel";
import { ErrorState } from "../../components/primitives/ErrorState";
import { TextInput } from "../../components/primitives/TextInput";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type {
  GitFile,
  GitCommit as GitCommitType,
  GitBranch as GitBranchType,
} from "../../services/bridgeAdapter";

// FileItem must be a top-level component — defining it inside the render function
// causes React to create a new component type on every render, unmounting/remounting
// all file rows on every keystroke or state change.
function FileItem({
  file,
  icon: Icon,
  color,
  statusLabel,
  onDiff,
}: {
  file: GitFile;
  icon: ElementType;
  color: string;
  statusLabel: string;
  onDiff: (path: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onDiff(file.path)}
      aria-label={`${statusLabel}: ${file.path} — click to view diff`}
      className="flex min-h-touch w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-nd-text-primary/80 hover:bg-nd-surface-hover/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40"
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} aria-hidden="true" />
      <span className={`shrink-0 font-mono font-semibold ${color}`}>{statusLabel}</span>
      <span className="truncate font-mono text-nd-text-muted/80">{file.path}</span>
    </button>
  );
}

export function GitView() {
  const [staged, setStaged] = useState<GitFile[]>([]);
  const [unstaged, setUnstaged] = useState<GitFile[]>([]);
  const [untracked, setUntracked] = useState<GitFile[]>([]);
  const [branches, setBranches] = useState<GitBranchType[]>([]);
  const [commits, setCommits] = useState<GitCommitType[]>([]);
  const [commitMsg, setCommitMsg] = useState("");
  const [diff, setDiff] = useState("");
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [gitUnavailable, setGitUnavailable] = useState(false);
  const [loadError, setLoadError] = useState<{ message: string; retry?: () => void } | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);

  const showNotice = (kind: "error" | "ok", text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setGitUnavailable(false);
    setLoadError(null);
    try {
      const status = await neurodeckApi.git.status();
      setStaged(status.staged || []);
      setUnstaged(status.unstaged || []);
      setUntracked(status.untracked || []);
    } catch {
      setGitUnavailable(true);
      setLoading(false);
      return;
    }
    try {
      const branchList = await neurodeckApi.git.branchList();
      setBranches(branchList);
    } catch (e) {
      setLoadError((prev) => prev || { message: `Could not load branches: ${e}`, retry: loadStatus });
    }
    try {
      const log = await neurodeckApi.git.log(20);
      setCommits(log);
    } catch (e) {
      setLoadError((prev) => prev || { message: `Could not load commits: ${e}`, retry: loadStatus });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const stageAll = async () => {
    const files = [...unstaged, ...untracked].map((f) => f.path);
    if (!files.length) return;
    setMutating(true);
    try {
      await neurodeckApi.git.stage(files);
      await loadStatus();
    } catch (e) {
      showNotice("error", `Stage failed: ${e}`);
    } finally {
      setMutating(false);
    }
  };

  const unstageAll = async () => {
    const files = staged.map((f) => f.path);
    if (!files.length) return;
    setMutating(true);
    try {
      await neurodeckApi.git.unstage(files);
      await loadStatus();
    } catch (e) {
      showNotice("error", `Unstage failed: ${e}`);
    } finally {
      setMutating(false);
    }
  };

  const doCommit = async () => {
    if (!commitMsg.trim() || mutating) return;
    setMutating(true);
    try {
      await neurodeckApi.git.commit(commitMsg);
      setCommitMsg("");
      showNotice("ok", "Committed successfully.");
      await loadStatus();
    } catch (e) {
      showNotice("error", `Commit failed: ${e}`);
    } finally {
      setMutating(false);
    }
  };

  const doPush = async () => {
    setMutating(true);
    try {
      await neurodeckApi.git.push();
      showNotice("ok", "Pushed to remote.");
      await loadStatus();
    } catch (e) {
      showNotice("error", `Push failed: ${e}`);
    } finally {
      setMutating(false);
    }
  };

  const doPull = async () => {
    setMutating(true);
    try {
      await neurodeckApi.git.pull();
      showNotice("ok", "Pulled from remote.");
      await loadStatus();
    } catch (e) {
      showNotice("error", `Pull failed: ${e}`);
    } finally {
      setMutating(false);
    }
  };

  const showDiff = async (file?: string) => {
    setDiffError(null);
    try {
      const result = await neurodeckApi.git.diff(file);
      setDiff(result.diff);
    } catch (e) {
      setDiff("");
      setDiffError(`Could not load diff: ${e}`);
    }
  };

  if (gitUnavailable) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
            <GitBranch className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-nd-text-primary">Git</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-nd-accent-error/20 bg-nd-accent-error/5 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-nd-accent-error" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-nd-text-primary">Git not available</h3>
            <p className="mt-1 text-sm text-nd-text-muted">
              No repository found at the workspace path, or git is not installed.
            </p>
          </div>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void loadStatus()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
          <GitBranch className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text-primary">Git</h2>
          <p className="text-xs text-nd-text-muted">Repository management</p>
        </div>
        <IconButton
          aria-label="Refresh repository status"
          size="md"
          variant="outline"
          disabled={loading}
          onClick={() => void loadStatus()}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
        </IconButton>
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
            notice.kind === "ok"
              ? "border-nd-accent-success/25 bg-nd-accent-success/10 text-nd-accent-success"
              : "border-nd-accent-error/25 bg-nd-accent-error/10 text-nd-accent-error"
          }`}
        >
          {notice.text}
        </div>
      )}

      {loadError && (
        <div className="mb-3">
          <ErrorState
            title="Load failed"
            message={loadError.message}
            onRetry={loadError.retry}
            onClose={() => setLoadError(null)}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Left: Worktree */}
        <div className="flex w-64 shrink-0 flex-col gap-3 overflow-auto">
          <Panel className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
                Staged
              </h3>
              <Button
                variant="ghost"
                size="xs"
                disabled={mutating || !staged.length}
                onClick={() => void unstageAll()}
              >
                Unstage all
              </Button>
            </div>
            {staged.map((f) => (
              <FileItem
                key={f.path}
                file={f}
                icon={FilePlus}
                color="text-nd-accent-success"
                statusLabel="A"
                onDiff={showDiff}
              />
            ))}
            {!staged.length && (
              <p className="py-2 text-center text-xs text-nd-text-muted/70">No staged files</p>
            )}
          </Panel>

          <Panel className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
                Unstaged
              </h3>
              <Button
                variant="ghost"
                size="xs"
                disabled={mutating || (!unstaged.length && !untracked.length)}
                onClick={() => void stageAll()}
              >
                Stage all
              </Button>
            </div>
            {unstaged.map((f) => (
              <FileItem
                key={f.path}
                file={f}
                icon={CircleDot}
                color="text-nd-accent-warning"
                statusLabel="M"
                onDiff={showDiff}
              />
            ))}
            {!unstaged.length && (
              <p className="py-2 text-center text-xs text-nd-text-muted/70">No unstaged files</p>
            )}
          </Panel>

          <Panel className="p-3">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
              Untracked
            </h3>
            {untracked.map((f) => (
              <FileItem
                key={f.path}
                file={f}
                icon={FileMinus}
                color="text-nd-text-muted"
                statusLabel="?"
                onDiff={showDiff}
              />
            ))}
            {!untracked.length && (
              <p className="py-2 text-center text-xs text-nd-text-muted/70">No untracked files</p>
            )}
          </Panel>
        </div>

        {/* Center: Commit + Diff */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Panel className="p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
              Commit
            </h3>
            <div className="flex gap-2">
              <TextInput
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="Commit message..."
                aria-label="Commit message"
                disabled={mutating}
                onKeyDown={(e) => e.key === "Enter" && void doCommit()}
                className="flex-1"
              />
              <Button
                variant="success"
                size="sm"
                icon={GitCommit}
                disabled={mutating || !commitMsg.trim()}
                onClick={() => void doCommit()}
              >
                Commit
              </Button>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                size="xs"
                icon={ArrowUpFromLine}
                disabled={mutating}
                onClick={() => void doPush()}
              >
                Push
              </Button>
              <Button
                variant="outline"
                size="xs"
                icon={GitMerge}
                disabled={mutating}
                onClick={() => void doPull()}
              >
                Pull
              </Button>
            </div>
          </Panel>

          {diff && !diffError ? (
            <Panel className="min-h-0 flex-1 overflow-auto p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
                Diff
              </h3>
              <pre className="font-mono text-xs text-nd-text-primary/80">{diff}</pre>
            </Panel>
          ) : diffError ? (
            <Panel className="min-h-0 flex-1 overflow-auto p-3">
              <ErrorState title="Diff unavailable" message={diffError} onClose={() => setDiffError(null)} />
            </Panel>
          ) : null}

          <Panel className="min-h-0 flex-1 overflow-auto p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
              Recent Commits
            </h3>
            <ul className="mt-2 space-y-2" aria-label="Commit history">
              {commits.map((c) => (
                <li
                  key={c.hash}
                  className="rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/30 p-2"
                >
                  <p className="text-xs font-medium text-nd-text-primary/90">{c.message}</p>
                  <div className="mt-1 flex gap-2 text-[10px] text-nd-text-muted/70">
                    <code className="font-mono">{c.hash.slice(0, 7)}</code>
                    <span>{c.author}</span>
                    <time>{c.date}</time>
                  </div>
                </li>
              ))}
              {!commits.length && (
                <li className="py-2 text-center text-xs text-nd-text-muted/70">No commits</li>
              )}
            </ul>
          </Panel>
        </div>

        {/* Right: Branches */}
        <Panel className="w-48 shrink-0 overflow-auto p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
            Branches
          </h3>
          <ul className="mt-2 space-y-1" aria-label="Branch list">
            {branches.map((b) => (
              <li key={b.name}>
                <button
                  type="button"
                  onClick={async () => {
                    setMutating(true);
                    try {
                      await neurodeckApi.git.branchCheckout(b.name);
                      await loadStatus();
                    } catch (e) {
                      showNotice("error", `Checkout failed: ${e}`);
                    } finally {
                      setMutating(false);
                    }
                  }}
                  disabled={mutating}
                  aria-current={b.current ? "true" : undefined}
                  aria-label={`Checkout ${b.name}${b.current ? " (current)" : ""}`}
                  className={`flex min-h-touch w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 disabled:opacity-40 ${
                    b.current
                      ? "bg-nd-accent-primary/10 text-nd-accent-primary"
                      : "text-nd-text-muted hover:bg-nd-surface-hover/50"
                  }`}
                >
                  <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="truncate">{b.name}</span>
                </button>
              </li>
            ))}
            {!branches.length && (
              <li>
                <p className="py-2 text-center text-xs text-nd-text-muted/70">No branches</p>
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
