import { invoke } from "./neurobridge.js";

let currentRepoPath = null;
let selectedFiles = new Set();

function _showLoadingBar() {
  const workspace = document.querySelector(".git-workspace");
  if (!workspace) return null;
  const bar = document.createElement("div");
  bar.className = "loading-bar";
  bar.setAttribute("aria-hidden", "true");
  workspace.style.position = "relative";
  workspace.appendChild(bar);
  return bar;
}

function _hideLoadingBar(bar) {
  bar?.remove();
}

export function initGitView() {
  wireRepoActions();
  wireCommitBar();
  loadRepoList();
  loadAccountList();
}

// ── Repo List ──────────────────────────────────────────────────────────────

async function loadRepoList() {
  const list = document.getElementById("git-repo-list");
  if (!list) return;
  try {
    const repos = await invoke("git_list_repos");
    if (!repos || repos.length === 0) {
      list.innerHTML = `<div class="git-empty">No repositories yet.</div>`;
      return;
    }
    list.innerHTML = repos
      .map(
        (r) => `
      <div class="git-repo-item" data-path="${escapeHtml(r.path)}">
        <span class="git-repo-name">${escapeHtml(r.name)}</span>
        <span class="git-repo-path">${escapeHtml(r.path)}</span>
      </div>
    `
      )
      .join("");
    list.querySelectorAll(".git-repo-item").forEach((el) => {
      el.addEventListener("click", () => openRepo(el.dataset.path));
    });
  } catch (e) {
    list.innerHTML = `<div class="git-empty">Error loading repos: ${escapeHtml(String(e))}</div>`;
  }
}

function wireRepoActions() {
  document.getElementById("git-clone-btn")?.addEventListener("click", async () => {
    const url = await showPrompt("Git URL to clone:", "", { title: "Clone Repository" });
    if (!url) return;
    const path = await showPrompt("Clone into directory:", ".", { title: "Clone Repository" });
    if (!path) return;
    try {
      await invoke("git_clone", { url, path });
      await openRepo(path);
      await loadRepoList();
    } catch (e) {
      addNotification("Clone Failed", String(e), "error");
    }
  });

  document.getElementById("git-init-btn")?.addEventListener("click", async () => {
    const path = await showPrompt("Initialize repo in directory:", ".", {
      title: "Init Repository",
    });
    if (!path) return;
    try {
      await invoke("git_init", { path });
      await openRepo(path);
      await loadRepoList();
    } catch (e) {
      addNotification("Init Failed", String(e), "error");
    }
  });

  document.getElementById("git-open-btn")?.addEventListener("click", async () => {
    const path = await showPrompt("Path to existing repo:", ".", { title: "Open Repository" });
    if (!path) return;
    await openRepo(path);
    await loadRepoList();
  });
}

// ── Open Repo ──────────────────────────────────────────────────────────────

async function openRepo(path) {
  currentRepoPath = path;
  selectedFiles.clear();
  const bar = _showLoadingBar();
  try {
    const status = await invoke("git_open_repo", { path });
    document.getElementById("git-repo-name").textContent = path.split(/[\\/]/).pop() || path;
    document.getElementById("git-repo-branch").textContent = status.branch || "";
    await refreshWorktree();
    await refreshBranches();
    await refreshHistory();
    await refreshRemotes();
  } catch (e) {
    addNotification("Open Repo Failed", String(e), "error");
    currentRepoPath = null;
  } finally {
    _hideLoadingBar(bar);
  }
}

// ── Worktree ───────────────────────────────────────────────────────────────

async function refreshWorktree() {
  const list = document.getElementById("git-worktree");
  if (!list || !currentRepoPath) return;
  try {
    const files = await invoke("git_status", { path: currentRepoPath });
    if (!files || files.length === 0) {
      list.innerHTML = `<div class="git-empty">Working tree clean.</div>`;
      return;
    }
    list.innerHTML = files
      .map(
        (f) => `
      <div class="git-file-row" data-path="${escapeHtml(f.path)}" data-status="${f.status}">
        <input type="checkbox" class="git-file-check" ${selectedFiles.has(f.path) ? "checked" : ""}>
        <span class="git-file-status git-status-${f.status}">${statusIcon(f.status)}</span>
        <span class="git-file-name">${escapeHtml(f.path)}</span>
      </div>
    `
      )
      .join("");

    list.querySelectorAll(".git-file-row").forEach((row) => {
      const path = row.dataset.path;
      const checkbox = row.querySelector(".git-file-check");
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedFiles.add(path);
        else selectedFiles.delete(path);
      });
      row.addEventListener("dblclick", () => showDiff(path));
    });
  } catch (e) {
    list.innerHTML = `<div class="git-empty">Error: ${escapeHtml(String(e))}</div>`;
  }
}

function statusIcon(status) {
  const map = {
    staged: "S",
    modified: "M",
    untracked: "U",
    renamed: "R",
    deleted: "D",
    conflict: "C",
  };
  return map[status] || "?";
}

// ── Diff ───────────────────────────────────────────────────────────────────

async function showDiff(filePath) {
  const viewer = document.getElementById("git-diff-body");
  if (!viewer || !currentRepoPath) return;
  try {
    const diff = await invoke("git_diff", { path: currentRepoPath });
    // Filter to file-specific lines if possible, otherwise show full diff
    const lines = diff.split("\n");
    const fileStart = lines.findIndex((l) => l.includes(filePath));
    if (fileStart !== -1) {
      const nextFile = lines.slice(fileStart + 1).findIndex((l) => l.startsWith("diff --git"));
      const end = nextFile === -1 ? lines.length : fileStart + 1 + nextFile;
      viewer.textContent = lines.slice(fileStart, end).join("\n");
    } else {
      viewer.textContent = diff;
    }
  } catch (e) {
    viewer.textContent = "Error loading diff: " + e;
  }
}

// ── Commit Bar ─────────────────────────────────────────────────────────────

function wireCommitBar() {
  document.getElementById("git-stage-btn")?.addEventListener("click", async () => {
    if (!currentRepoPath || selectedFiles.size === 0) return;
    const files = Array.from(selectedFiles);
    await invoke("git_stage", { path: currentRepoPath, files });
    selectedFiles.clear();
    await refreshWorktree();
  });

  document.getElementById("git-unstage-btn")?.addEventListener("click", async () => {
    if (!currentRepoPath || selectedFiles.size === 0) return;
    const files = Array.from(selectedFiles);
    await invoke("git_unstage", { path: currentRepoPath, files });
    selectedFiles.clear();
    await refreshWorktree();
  });

  document.getElementById("git-discard-btn")?.addEventListener("click", async () => {
    if (!currentRepoPath || selectedFiles.size === 0) return;
    const confirmed = await showConfirm("Discard changes to selected files?", {
      confirmText: "Discard",
      cancelText: "Keep",
    });
    if (!confirmed) return;
    const files = Array.from(selectedFiles);
    await invoke("git_discard", { path: currentRepoPath, files });
    selectedFiles.clear();
    await refreshWorktree();
  });

  document.getElementById("git-commit-btn")?.addEventListener("click", async () => {
    if (!currentRepoPath) return;
    const msg = document.getElementById("git-commit-msg").value.trim();
    if (!msg) {
      addNotification("Missing Commit Message", "Enter a commit message.", "warning");
      return;
    }
    // Use generic author for now; could be configurable
    try {
      const sha = await invoke("git_commit", {
        path: currentRepoPath,
        message: msg,
        authorName: "NEURODECK",
        authorEmail: "dev@neurodeck.local",
      });
      document.getElementById("git-commit-msg").value = "";
      await refreshWorktree();
      await refreshHistory();
      addNotification("Commit Successful", `Committed: ${sha.slice(0, 7)}`, "success");
    } catch (e) {
      addNotification("Commit Failed", String(e), "error");
    }
  });

  document.getElementById("git-ai-commit-btn")?.addEventListener("click", async () => {
    if (!currentRepoPath) return;
    const btn = document.getElementById("git-ai-commit-btn");
    btn.textContent = "…";
    try {
      const msg = await invoke("git_generate_commit_message", { path: currentRepoPath });
      document.getElementById("git-commit-msg").value = msg;
    } catch (e) {
      addNotification("AI Suggestion Failed", String(e), "error");
    } finally {
      btn.textContent = "✨";
    }
  });
}

// ── Branches ───────────────────────────────────────────────────────────────

async function refreshBranches() {
  const list = document.getElementById("git-branch-list");
  if (!list || !currentRepoPath) return;
  try {
    const branches = await invoke("git_branch_list", { path: currentRepoPath });
    list.innerHTML = (branches || [])
      .map(
        (b) => `
      <div class="git-branch-row">
        <span class="git-branch-name">${escapeHtml(b)}</span>
        <button class="git-btn-small" data-action="checkout" data-branch="${escapeHtml(b)}">Checkout</button>
        <button class="git-btn-small" data-action="delete" data-branch="${escapeHtml(b)}">Del</button>
      </div>
    `
      )
      .join("");

    list.querySelectorAll("[data-action='checkout']").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await invoke("git_branch_checkout", { path: currentRepoPath, name: btn.dataset.branch });
        await openRepo(currentRepoPath);
      });
    });
    list.querySelectorAll("[data-action='delete']").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const confirmed = await showConfirm(`Delete branch ${btn.dataset.branch}?`, {
          confirmText: "Delete",
          cancelText: "Keep",
        });
        if (!confirmed) return;
        await invoke("git_branch_delete", { path: currentRepoPath, name: btn.dataset.branch });
        await refreshBranches();
      });
    });
  } catch (e) {
    list.innerHTML = `<div class="git-empty">Error: ${escapeHtml(String(e))}</div>`;
  }
}

// ── History ────────────────────────────────────────────────────────────────

async function refreshHistory() {
  const list = document.getElementById("git-history-list");
  if (!list || !currentRepoPath) return;
  try {
    const commits = await invoke("git_log", { path: currentRepoPath, maxCount: 25 });
    list.innerHTML = (commits || [])
      .map(
        (c) => `
      <div class="git-commit-row" title="${escapeHtml(c.message)}">
        <span class="git-commit-sha">${escapeHtml(c.shortSha)}</span>
        <span class="git-commit-msg">${escapeHtml(c.message.split("\\n")[0])}</span>
      </div>
    `
      )
      .join("");
  } catch (e) {
    list.innerHTML = `<div class="git-empty">Error: ${escapeHtml(String(e))}</div>`;
  }
}

// ── Remotes (rendered in left pane under accounts) ─────────────────────────

async function refreshRemotes() {
  // Remotes shown in left pane if needed
}

// ── Accounts / Credentials ─────────────────────────────────────────────────

async function loadAccountList() {
  const list = document.getElementById("git-account-list");
  if (!list) return;

  const render = (creds) => {
    if (!creds || creds.length === 0) {
      list.innerHTML = `<div class="git-empty">No accounts saved.</div>`;
      return;
    }
    list.innerHTML = creds
      .map(
        (c) => `
      <div class="git-account-row">
        <span class="git-account-host">${escapeHtml(c.host)}</span>
        <span class="git-account-user">${escapeHtml(c.username)}</span>
        <button class="git-btn-small" data-host="${escapeHtml(c.host)}">Remove</button>
      </div>
    `
      )
      .join("");
    list.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await invoke("git_credential_delete", { host: btn.dataset.host });
        await loadAccountList();
      });
    });
  };

  // For now we don't have a list-all endpoint; add one or iterate known hosts
  // Using a simple static list for demo; in full impl add git_credential_list
  list.innerHTML = `<div class="git-empty">No accounts saved.</div>`;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
