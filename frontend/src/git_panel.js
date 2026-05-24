import { invoke } from '@tauri-apps/api/core';

// ── State ─────────────────────────────────────────────────────────────────────

let _repoPath = '';        // currently browsed repo path
let _status   = null;      // last GitStatus result
let _activeTab = 'changes'; // 'changes' | 'log'
let _selectedFiles = new Set(); // file paths checked for staging

// ── Public API ────────────────────────────────────────────────────────────────

export function initGitPanel() {
    const btn = document.getElementById('canvas-git-btn');
    const panel = document.getElementById('canvas-git-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', () => {
        const open = panel.classList.toggle('open');
        btn.classList.toggle('active', open);
        if (open) _refresh();
    });

    // Tab switching
    panel.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-git-tab]');
        if (tab) _switchTab(tab.dataset.gitTab);
    });

    // Repo path input
    const pathInput = panel.querySelector('#git-path-input');
    const pathApply = panel.querySelector('#git-path-apply');
    if (pathInput && pathApply) {
        pathApply.addEventListener('click', () => {
            _repoPath = pathInput.value.trim() || '.';
            _refresh();
        });
        pathInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') pathApply.click();
        });
    }

    // Stage All
    panel.querySelector('#git-stage-all-btn')?.addEventListener('click', async () => {
        await _runGitOp(() => invoke('git_stage_all', { path: _repoPath }), 'Staged all changes');
    });

    // Stage Selected
    panel.querySelector('#git-stage-sel-btn')?.addEventListener('click', async () => {
        const files = [..._selectedFiles];
        if (!files.length) { _setStatus('No files selected', 'warn'); return; }
        await _runGitOp(() => invoke('git_stage', { path: _repoPath, files }), `Staged ${files.length} file(s)`);
        _selectedFiles.clear();
    });

    // AI generate commit message
    panel.querySelector('#git-gen-msg-btn')?.addEventListener('click', async () => {
        const msgInput = panel.querySelector('#git-commit-msg');
        if (!msgInput) return;
        _setStatus('Generating commit message…', '');
        try {
            const diff = await invoke('git_diff', { path: _repoPath, file: null });
            const msg = await invoke('generate_commit_message', { diff });
            msgInput.value = msg;
            _setStatus('Message generated', 'ok');
        } catch (e) {
            _setStatus(`AI error: ${e}`, 'error');
        }
    });

    // Commit
    panel.querySelector('#git-commit-btn')?.addEventListener('click', async () => {
        const msgInput = panel.querySelector('#git-commit-msg');
        const message = msgInput?.value.trim();
        if (!message) { _setStatus('Commit message required', 'warn'); return; }
        await _runGitOp(
            () => invoke('git_commit', { path: _repoPath, message }),
            'Committed successfully',
            () => { if (msgInput) msgInput.value = ''; }
        );
    });
}

// ── Refresh ───────────────────────────────────────────────────────────────────

async function _refresh() {
    if (_activeTab === 'changes') await _loadStatus();
    else await _loadLog();
}

async function _loadStatus() {
    const panel = document.getElementById('canvas-git-panel');
    if (!panel) return;
    _setStatus('Loading…', '');
    try {
        _status = await invoke('git_status', { path: _repoPath || '.' });
        _repoPath = _status.path;
        const pathInput = panel.querySelector('#git-path-input');
        if (pathInput && !pathInput.value) pathInput.value = _repoPath;
        _renderChanges(_status);
        _setStatus(`Branch: ${_status.branch}`, 'ok');
    } catch (e) {
        _renderEmpty('Not a git repo. Enter a repo path above.');
        _setStatus(String(e), 'error');
    }
}

async function _loadLog() {
    _setStatus('Loading log…', '');
    try {
        const commits = await invoke('git_log', { path: _repoPath || '.', limit: 30 });
        _renderLog(commits);
        _setStatus(`${commits.length} commits`, 'ok');
    } catch (e) {
        _renderEmpty('No commits found.');
        _setStatus(String(e), 'error');
    }
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function _renderChanges(status) {
    const body = document.querySelector('#git-changes-body');
    if (!body) return;

    const allFiles = [
        ...status.staged.map(f => ({ name: f, state: 'staged' })),
        ...status.unstaged.map(f => ({ name: f, state: 'unstaged' })),
        ...status.untracked.map(f => ({ name: f, state: 'untracked' })),
    ];

    if (!allFiles.length) {
        body.innerHTML = '<div class="git-empty">Working tree clean.</div>';
        return;
    }

    const groups = [
        { label: 'Staged', files: status.staged,   cls: 'staged'    },
        { label: 'Changes', files: status.unstaged, cls: 'unstaged'  },
        { label: 'Untracked', files: status.untracked, cls: 'untracked' },
    ].filter(g => g.files.length > 0);

    body.innerHTML = groups.map(group => `
        <div class="git-group-label">${group.label} (${group.files.length})</div>
        ${group.files.map(f => `
            <div class="git-file-row git-file-${group.cls}" data-file="${_esc(f)}">
                <label class="git-file-check-wrap">
                    <input type="checkbox" class="git-file-chk" value="${_esc(f)}" ${_selectedFiles.has(f) ? 'checked' : ''}>
                </label>
                <span class="git-file-badge git-badge-${group.cls}">${group.cls[0].toUpperCase()}</span>
                <span class="git-file-name" title="${_esc(f)}">${_esc(_basename(f))}</span>
                <button class="git-diff-btn" data-file="${_esc(f)}" title="View diff">≠</button>
            </div>
        `).join('')}
    `).join('');

    // Checkboxes
    body.querySelectorAll('.git-file-chk').forEach(chk => {
        chk.addEventListener('change', () => {
            if (chk.checked) _selectedFiles.add(chk.value);
            else _selectedFiles.delete(chk.value);
        });
    });

    // Diff preview
    body.querySelectorAll('.git-diff-btn').forEach(btn => {
        btn.addEventListener('click', () => _showDiff(btn.dataset.file));
    });
}

function _renderLog(commits) {
    const body = document.querySelector('#git-log-body');
    if (!body) return;

    if (!commits.length) {
        body.innerHTML = '<div class="git-empty">No commits found.</div>';
        return;
    }

    body.innerHTML = commits.map(c => `
        <div class="git-log-row">
            <span class="git-log-hash">${_esc(c.short_hash)}</span>
            <span class="git-log-msg">${_esc(c.message)}</span>
            <span class="git-log-meta">${_esc(c.author)} · ${_esc(c.timestamp)}</span>
        </div>
    `).join('');
}

function _renderEmpty(msg) {
    const body = document.querySelector('#git-changes-body') || document.querySelector('#git-log-body');
    if (body) body.innerHTML = `<div class="git-empty">${_esc(msg)}</div>`;
}

async function _showDiff(file) {
    const diffEl = document.getElementById('git-diff-preview');
    if (!diffEl) return;
    diffEl.textContent = 'Loading diff…';
    diffEl.style.display = 'block';
    try {
        const diff = await invoke('git_diff', { path: _repoPath || '.', file });
        diffEl.innerHTML = _colorDiff(diff);
    } catch (e) {
        diffEl.textContent = `Diff error: ${e}`;
    }
}

// ── Tab switching ─────────────────────────────────────────────────────────────

function _switchTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('[data-git-tab]').forEach(el => {
        el.classList.toggle('active', el.dataset.gitTab === tab);
    });
    const changesPane = document.getElementById('git-changes-pane');
    const logPane     = document.getElementById('git-log-pane');
    if (changesPane) changesPane.style.display = tab === 'changes' ? 'block' : 'none';
    if (logPane)     logPane.style.display     = tab === 'log'     ? 'block' : 'none';
    _refresh();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _runGitOp(fn, successMsg, onSuccess) {
    _setStatus('Working…', '');
    try {
        await fn();
        _setStatus(successMsg, 'ok');
        if (onSuccess) onSuccess();
        await _loadStatus();
    } catch (e) {
        _setStatus(String(e), 'error');
    }
}

function _setStatus(msg, type) {
    const el = document.getElementById('git-status-line');
    if (!el) return;
    el.textContent = msg;
    el.className = `git-status-line${type ? ` git-status-${type}` : ''}`;
}

function _colorDiff(raw) {
    return raw.split('\n').map(line => {
        const escaped = _esc(line);
        if (line.startsWith('+') && !line.startsWith('+++'))
            return `<span class="git-diff-add">${escaped}</span>`;
        if (line.startsWith('-') && !line.startsWith('---'))
            return `<span class="git-diff-del">${escaped}</span>`;
        if (line.startsWith('@@'))
            return `<span class="git-diff-hunk">${escaped}</span>`;
        return `<span class="git-diff-ctx">${escaped}</span>`;
    }).join('\n');
}

function _basename(path) {
    return path.split(/[/\\]/).pop() || path;
}

function _esc(s) {
    return String(s ?? '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
