import { useCallback, useEffect, useState } from 'react';
import { GitBranch, RefreshCw, GitCommit, GitPullRequest, GitMerge, FilePlus, FileMinus, CircleDot } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { GitFile, GitCommit as GitCommitType, GitBranch as GitBranchType } from '../../services/bridgeAdapter';

export function GitView() {
  const [staged, setStaged] = useState<GitFile[]>([]);
  const [unstaged, setUnstaged] = useState<GitFile[]>([]);
  const [untracked, setUntracked] = useState<GitFile[]>([]);
  const [branches, setBranches] = useState<GitBranchType[]>([]);
  const [commits, setCommits] = useState<GitCommitType[]>([]);
  const [commitMsg, setCommitMsg] = useState('');
  const [diff, setDiff] = useState('');
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const status = await neurodeckApi.git.status();
      setStaged(status.staged || []);
      setUnstaged(status.unstaged || []);
      setUntracked(status.untracked || []);
    } catch (_) { /* ignore */ }
    try {
      const branchList = await neurodeckApi.git.branchList();
      setBranches(branchList);
    } catch (_) { /* ignore */ }
    try {
      const log = await neurodeckApi.git.log(20);
      setCommits(log);
    } catch (_) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const stageAll = async () => {
    const files = [...unstaged, ...untracked].map((f) => f.path);
    if (!files.length) return;
    try { await neurodeckApi.git.stage(files); loadStatus(); } catch (_) { }
  };

  const unstageAll = async () => {
    const files = staged.map((f) => f.path);
    if (!files.length) return;
    try { await neurodeckApi.git.unstage(files); loadStatus(); } catch (_) { }
  };

  const doCommit = async () => {
    if (!commitMsg.trim()) return;
    try { await neurodeckApi.git.commit(commitMsg); setCommitMsg(''); loadStatus(); } catch (_) { }
  };

  const showDiff = async (file?: string) => {
    try {
      const result = await neurodeckApi.git.diff(file);
      setDiff(result.diff);
    } catch (_) { setDiff(''); }
  };

  const FileItem = ({ file, icon: Icon, color, statusLabel }: { file: GitFile; icon: any; color: string; statusLabel: string }) => (
    <button
      type="button"
      onClick={() => showDiff(file.path)}
      aria-label={`${statusLabel}: ${file.path} — click to view diff`}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-nd-text/80 hover:bg-nd-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} aria-hidden="true" />
      <span className={`shrink-0 font-mono font-semibold ${color}`}>{statusLabel}</span>
      <span className="truncate font-mono text-nd-text-muted/80">{file.path}</span>
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <GitBranch className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">Git</h2>
          <p className="text-xs text-nd-text-muted">Repository management</p>
        </div>
        <button type="button" onClick={loadStatus} disabled={loading} aria-label="Refresh repository status" className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Left: Worktree */}
        <div className="flex w-64 flex-col gap-3 overflow-auto">
          <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">Staged</span>
              <button type="button" onClick={unstageAll} className="text-[11px] text-nd-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded">Unstage all</button>
            </div>
            {staged.map((f) => <FileItem key={f.path} file={f} icon={FilePlus} color="text-nd-success" statusLabel="A" />)}
            {!staged.length && <p className="py-2 text-center text-xs text-nd-text-muted/70">No staged files</p>}
          </div>

          <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">Unstaged</span>
              <button type="button" onClick={stageAll} className="text-[11px] text-nd-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded">Stage all</button>
            </div>
            {unstaged.map((f) => <FileItem key={f.path} file={f} icon={CircleDot} color="text-nd-warning" statusLabel="M" />)}
            {!unstaged.length && <p className="py-2 text-center text-xs text-nd-text-muted/70">No unstaged files</p>}
          </div>

          <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">Untracked</span>
            {untracked.map((f) => <FileItem key={f.path} file={f} icon={FileMinus} color="text-nd-text-muted" statusLabel="?" />)}
            {!untracked.length && <p className="py-2 text-center text-xs text-nd-text-muted/70">No untracked files</p>}
          </div>
        </div>

        {/* Center: Commit + Diff */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="Commit message..."
                aria-label="Commit message"
                className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
                onKeyDown={(e) => e.key === 'Enter' && doCommit()}
              />
              <button type="button" onClick={doCommit} className="flex items-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-3 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
                <GitCommit className="h-4 w-4" aria-hidden="true" /> Commit
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => neurodeckApi.git.push().then(loadStatus)} className="flex items-center gap-1 rounded-lg border border-nd-text-muted/15 px-2 py-1 text-xs text-nd-text-muted hover:bg-nd-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
                <GitPullRequest className="h-3 w-3" aria-hidden="true" /> Push
              </button>
              <button type="button" onClick={() => neurodeckApi.git.pull().then(loadStatus)} className="flex items-center gap-1 rounded-lg border border-nd-text-muted/15 px-2 py-1 text-xs text-nd-text-muted hover:bg-nd-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
                <GitMerge className="h-3 w-3" aria-hidden="true" /> Pull
              </button>
            </div>
          </div>

          {diff && (
            <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
              <pre className="font-mono text-xs text-nd-text/80">{diff}</pre>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">Recent Commits</span>
            <div className="mt-2 space-y-2">
              {commits.map((c) => (
                <div key={c.hash} className="rounded-lg border border-nd-text-muted/10 bg-nd-surface/30 p-2">
                  <p className="text-xs font-medium text-nd-text/90">{c.message}</p>
                  <div className="mt-1 flex gap-2 text-[10px] text-nd-text-muted/70">
                    <span className="font-mono">{c.hash.slice(0, 7)}</span>
                    <span>{c.author}</span>
                    <span>{c.date}</span>
                  </div>
                </div>
              ))}
              {!commits.length && <p className="py-2 text-center text-xs text-nd-text-muted/70">No commits</p>}
            </div>
          </div>
        </div>

        {/* Right: Branches */}
        <div className="w-48 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">Branches</span>
          <div className="mt-2 space-y-1">
            {branches.map((b) => (
              <button
                key={b.name}
                type="button"
                onClick={() => neurodeckApi.git.branchCheckout(b.name).then(loadStatus)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 ${b.current ? 'bg-nd-accent/10 text-nd-accent' : 'text-nd-text-muted hover:bg-nd-surface/50'}`}
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span className="truncate">{b.name}</span>
              </button>
            ))}
            {!branches.length && <p className="py-2 text-center text-xs text-nd-text-muted/70">No branches</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
