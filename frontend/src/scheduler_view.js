import { invoke } from './neurobridge.js';
import { listen } from './neurobridge.js';

let tasks = [];

export async function initSchedulerView() {
    await loadTasks();

    document.getElementById('scheduler-add-btn').addEventListener('click', handleAddTask);

    listen('scheduled_task_started', (event) => {
        const payload = event.payload;
        const notifBadge = document.getElementById('notif-badge');
        if (notifBadge) {
            notifBadge.innerText = parseInt(notifBadge.innerText || 0) + 1;
            notifBadge.classList.remove('hidden');
        }
        if (window.invokeAgentLoopSilent) {
            window.invokeAgentLoopSilent(payload.goal);
        }
    });
}

export async function loadTasks() {
    try {
        tasks = await invoke('list_scheduled_tasks');
        renderTasks();
    } catch (e) {
        console.error("Failed to load scheduled tasks:", e);
    }
}

function renderTasks() {
    const listEl = document.getElementById('scheduler-task-list');
    if (!listEl) return;

    if (tasks.length === 0) {
        listEl.innerHTML = '<div class="agent-empty-state">No scheduled tasks found. Add one below.</div>';
        return;
    }

    listEl.innerHTML = tasks.map(t => `
        <div class="task-card" style="padding: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(0,255,136,0.2); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="margin: 0; color: var(--response-color); font-size: 1.1rem;">${window.escapeHtml(t.name)}</h4>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="font-size: 0.8rem;">
                        <input type="checkbox" ${t.enabled ? 'checked' : ''} onchange="window.toggleSchedulerTask('${t.id}', this.checked)"> Enabled
                    </label>
                    <button class="canvas-btn canvas-btn-sm" onclick="window.runSchedulerTaskNow('${t.id}')">▶ Run</button>
                    <button class="canvas-btn canvas-btn-sm" style="color: var(--error-color);" onclick="window.deleteSchedulerTask('${t.id}')">✕</button>
                </div>
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: #aaa; margin-bottom: 8px;">Cron: ${t.cron}</div>
            <div style="font-size: 0.9rem; color: #ddd; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">Goal: ${window.escapeHtml(t.goal)}</div>
        </div>
    `).join('');
}

async function handleAddTask() {
    const name = document.getElementById('scheduler-name-input').value.trim();
    const cron = document.getElementById('scheduler-cron-input').value.trim();
    const goal = document.getElementById('scheduler-goal-input').value.trim();

    if (!name || !cron || !goal) {
        addNotification('Missing Fields', 'Please fill in all fields.', 'warning');
        return;
    }

    try {
        await invoke('add_scheduled_task', { name, cron, goal });
        document.getElementById('scheduler-name-input').value = '';
        document.getElementById('scheduler-cron-input').value = '';
        document.getElementById('scheduler-goal-input').value = '';
        await loadTasks();
    } catch (e) {
        addNotification('Add Task Failed', 'Check cron expression. ' + String(e), 'error');
    }
}

window.deleteSchedulerTask = async function(id) {
    const confirmed = await showConfirm("Delete this task?", { confirmText: "Delete", cancelText: "Keep" }); if (!confirmed) return;
    try {
        await invoke('delete_scheduled_task', { id });
        await loadTasks();
    } catch (e) {
        addNotification('Delete Failed', String(e), 'error');
    }
};

window.toggleSchedulerTask = async function(id, enabled) {
    try {
        await invoke('toggle_scheduled_task', { id, enabled });
        await loadTasks();
    } catch (e) {
        addNotification('Toggle Failed', String(e), 'error');
    }
};

window.runSchedulerTaskNow = async function(id) {
    try {
        await invoke('run_task_now', { id });
        addNotification('Task Triggered', 'Task has been executed.', 'success');
    } catch (e) {
        addNotification('Run Failed', String(e), 'error');
    }
};
