import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// ── Cron helpers ──────────────────────────────────────────────────────────────

const CRON_PRESETS = [
    { label: 'Every minute',      value: '* * * * *' },
    { label: 'Every 5 minutes',   value: '*/5 * * * *' },
    { label: 'Every 15 minutes',  value: '*/15 * * * *' },
    { label: 'Every 30 minutes',  value: '*/30 * * * *' },
    { label: 'Every hour',        value: '0 * * * *' },
    { label: 'Every 6 hours',     value: '0 */6 * * *' },
    { label: 'Daily at 9am',      value: '0 9 * * *' },
    { label: 'Daily at midnight', value: '0 0 * * *' },
    { label: 'Weekdays 9am',      value: '0 9 * * 1-5' },
    { label: 'Weekly Monday 9am', value: '0 9 * * 1' },
];

function humanizeCron(expr) {
    const preset = CRON_PRESETS.find(p => p.value === expr.trim());
    if (preset) return preset.label;
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return expr;
    const [min, hour, , , dow] = parts;
    if (min === '*' && hour === '*') return 'Every minute';
    if (min.startsWith('*/')) return `Every ${min.slice(2)} min`;
    if (hour.startsWith('*/') && min === '0') return `Every ${hour.slice(2)} hours`;
    if (min !== '*' && hour !== '*' && dow === '*')
        return `Daily at ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
    return expr;
}

// ── State ─────────────────────────────────────────────────────────────────────

let _tasks = [];
let _unlistenFn = null;

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initSchedulerView() {
    const container = document.getElementById('view-scheduler');
    if (!container) return;

    container.innerHTML = `
        <div class="sched-header">
            <div class="sched-header-left">
                <span class="sched-title">⏱ Task Scheduler</span>
                <span class="sched-subtitle">Automated AI agent goals — cron-powered</span>
            </div>
            <button class="sched-add-btn" id="sched-open-add">＋ New Task</button>
        </div>

        <div class="sched-main">
            <div class="sched-list-col">
                <div class="sched-list" id="sched-list">
                    <div class="sched-empty" id="sched-empty">
                        <div class="sched-empty-icon">⏰</div>
                        <div class="sched-empty-text">No scheduled tasks yet.<br>Click "+ New Task" to automate a recurring AI goal.</div>
                    </div>
                </div>
            </div>

            <div class="sched-side-col">
                <!-- Add Task form (hidden until opened) -->
                <div class="sched-add-panel" id="sched-add-panel" style="display:none;">
                    <div class="sched-panel-title">New Scheduled Task</div>

                    <label class="sched-label">Task Name</label>
                    <input type="text" id="sched-name-input" class="sched-input" placeholder="e.g. Morning standup summary">

                    <label class="sched-label">Schedule <span class="sched-label-hint">(5-field cron)</span></label>
                    <div class="sched-cron-row">
                        <input type="text" id="sched-cron-input" class="sched-input" placeholder="0 9 * * *" style="flex:1;">
                        <select id="sched-cron-preset" class="sched-select">
                            <option value="">Presets</option>
                            ${CRON_PRESETS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="sched-cron-human" id="sched-cron-human"></div>

                    <label class="sched-label">Agent Goal</label>
                    <textarea id="sched-goal-input" class="sched-input sched-goal-textarea"
                        placeholder="What should the AI agent do when this fires…" rows="4"></textarea>

                    <div class="sched-form-footer">
                        <button class="sched-btn-ghost" id="sched-cancel-add">Cancel</button>
                        <button class="sched-btn-primary" id="sched-save-btn">Save Task</button>
                    </div>
                    <div class="sched-form-status" id="sched-form-status"></div>
                </div>

                <!-- Run log -->
                <div class="sched-log-panel">
                    <div class="sched-log-title">Session Run Log</div>
                    <div class="sched-log-body" id="sched-log-body">
                        <div class="sched-log-empty">No task runs yet this session.</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    _wireForm();
    await _loadTasks();
    await _subscribeEvents();
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function _loadTasks() {
    try {
        _tasks = await invoke('list_scheduled_tasks');
    } catch {
        _tasks = [];
    }
    _renderList();
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function _renderList() {
    const list = document.getElementById('sched-list');
    const empty = document.getElementById('sched-empty');
    if (!list) return;

    list.querySelectorAll('.sched-task-card').forEach(el => el.remove());

    if (_tasks.length === 0) {
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';

    _tasks.forEach(task => _appendCard(list, task));
}

function _appendCard(list, task) {
    const card = document.createElement('div');
    card.className = `sched-task-card${task.enabled ? '' : ' sched-disabled'}`;
    card.dataset.id = task.id;
    card.innerHTML = `
        <div class="sched-card-top">
            <div class="sched-card-name">${_esc(task.name)}</div>
            <div class="sched-card-actions">
                <label class="sched-toggle" title="${task.enabled ? 'Enabled' : 'Disabled'}">
                    <input type="checkbox" class="sched-toggle-chk" ${task.enabled ? 'checked' : ''}>
                    <span class="sched-toggle-track"><span class="sched-toggle-thumb"></span></span>
                </label>
                <button class="sched-icon-btn sched-run-btn" title="Run now">▶</button>
                <button class="sched-icon-btn sched-del-btn" title="Delete">✕</button>
            </div>
        </div>
        <div class="sched-card-cron">
            <span class="sched-cron-badge">${_esc(task.cron)}</span>
            <span class="sched-cron-label">${_esc(humanizeCron(task.cron))}</span>
        </div>
        <div class="sched-card-goal">${_esc(task.goal)}</div>
        <div class="sched-card-lastrun" id="sched-lr-${task.id}">${task.last_run ? 'Last run: ' + _fmtDate(task.last_run) : 'Never run'}</div>
    `;

    card.querySelector('.sched-toggle-chk').addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        card.classList.toggle('sched-disabled', !enabled);
        try {
            await invoke('toggle_scheduled_task', { id: task.id, enabled });
            task.enabled = enabled;
        } catch (err) {
            e.target.checked = !enabled;
            card.classList.toggle('sched-disabled', enabled);
            _log(`Toggle failed: ${err}`, 'error');
        }
    });

    card.querySelector('.sched-run-btn').addEventListener('click', async () => {
        try { await invoke('run_task_now', { id: task.id }); }
        catch (err) { _log(`Run failed: ${err}`, 'error'); }
    });

    card.querySelector('.sched-del-btn').addEventListener('click', async () => {
        if (!confirm(`Delete task "${task.name}"?`)) return;
        try {
            await invoke('delete_scheduled_task', { id: task.id });
            _tasks = _tasks.filter(t => t.id !== task.id);
            card.remove();
            if (_tasks.length === 0) {
                const empty = document.getElementById('sched-empty');
                if (empty) empty.style.display = 'flex';
            }
        } catch (err) { _log(`Delete failed: ${err}`, 'error'); }
    });

    list.appendChild(card);
}

// ── Form wiring ───────────────────────────────────────────────────────────────

function _wireForm() {
    document.getElementById('sched-open-add')?.addEventListener('click', () => {
        const panel = document.getElementById('sched-add-panel');
        if (panel) { panel.style.display = 'block'; document.getElementById('sched-name-input')?.focus(); }
    });

    document.getElementById('sched-cancel-add')?.addEventListener('click', () => {
        const panel = document.getElementById('sched-add-panel');
        if (panel) panel.style.display = 'none';
        _clearForm();
    });

    document.getElementById('sched-cron-input')?.addEventListener('input', (e) => {
        const h = document.getElementById('sched-cron-human');
        if (h) h.textContent = humanizeCron(e.target.value);
    });

    document.getElementById('sched-cron-preset')?.addEventListener('change', (e) => {
        if (!e.target.value) return;
        const cronIn = document.getElementById('sched-cron-input');
        if (cronIn) { cronIn.value = e.target.value; cronIn.dispatchEvent(new Event('input')); }
        e.target.value = '';
    });

    document.getElementById('sched-save-btn')?.addEventListener('click', _saveTask);
}

async function _saveTask() {
    const name = document.getElementById('sched-name-input')?.value.trim();
    const cron = document.getElementById('sched-cron-input')?.value.trim();
    const goal = document.getElementById('sched-goal-input')?.value.trim();
    const statusEl = document.getElementById('sched-form-status');
    const saveBtn = document.getElementById('sched-save-btn');

    if (!name) { _setStatus(statusEl, 'Task name is required.', 'error'); return; }
    if (!cron)  { _setStatus(statusEl, 'Cron expression is required.', 'error'); return; }
    if (!goal)  { _setStatus(statusEl, 'Agent goal is required.', 'error'); return; }

    if (saveBtn) saveBtn.disabled = true;
    _setStatus(statusEl, 'Saving…', '');

    try {
        const task = await invoke('add_scheduled_task', { name, cron, goal });
        _tasks.push(task);
        const list = document.getElementById('sched-list');
        const empty = document.getElementById('sched-empty');
        if (empty) empty.style.display = 'none';
        if (list) _appendCard(list, task);
        document.getElementById('sched-add-panel').style.display = 'none';
        _clearForm();
        _log(`Task "${task.name}" created — ${humanizeCron(task.cron)}`, 'success');
    } catch (err) {
        _setStatus(statusEl, `Error: ${err}`, 'error');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

// ── Event subscription ────────────────────────────────────────────────────────

async function _subscribeEvents() {
    if (_unlistenFn) { _unlistenFn(); _unlistenFn = null; }
    _unlistenFn = await listen('scheduled_task_started', (event) => {
        const data = typeof event.payload === 'string'
            ? JSON.parse(event.payload) : event.payload;

        const label = data.manual ? '▶ Manual' : '⏱ Scheduled';
        _log(`${label}: "${data.name}" fired at ${_fmtDate(data.triggered_at)}`, 'run');

        // Update last-run timestamp on card
        const lr = document.getElementById(`sched-lr-${data.id}`);
        if (lr) lr.textContent = `Last run: ${_fmtDate(data.triggered_at)}`;
        const task = _tasks.find(t => t.id === data.id);
        if (task) task.last_run = data.triggered_at;

        // Global notification
        if (typeof window.addNotification === 'function') {
            window.addNotification('Scheduled Task Fired', `"${data.name}" started`, 'info');
        }

        // Switch to Agent tab and pre-fill goal (if Agent input is empty)
        if (!data.manual && data.goal) {
            document.querySelector('.nav-tab[data-view="agent"]')?.click();
            setTimeout(() => {
                const agentInput = document.getElementById('agent-task-input');
                if (agentInput && !agentInput.value.trim()) agentInput.value = data.goal;
            }, 150);
        }
    }).catch(() => () => {});
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _log(msg, type = '') {
    const body = document.getElementById('sched-log-body');
    if (!body) return;
    body.querySelector('.sched-log-empty')?.remove();
    const el = document.createElement('div');
    el.className = `sched-log-entry${type ? ` sched-log-${type}` : ''}`;
    el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    body.prepend(el);
    while (body.children.length > 50) body.lastChild?.remove();
}

function _clearForm() {
    ['sched-name-input','sched-cron-input','sched-goal-input'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const h = document.getElementById('sched-cron-human');
    if (h) h.textContent = '';
    _setStatus(document.getElementById('sched-form-status'), '', '');
}

function _setStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = `sched-form-status${type ? ` sched-status-${type}` : ''}`;
}

function _fmtDate(iso) {
    try { return new Date(iso).toLocaleString(); } catch { return iso ?? ''; }
}

function _esc(s) {
    return String(s ?? '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
