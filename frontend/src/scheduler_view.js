import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

let tasks = [];

export async function initSchedulerView() {
    await loadTasks();

    document.getElementById('scheduler-add-btn').addEventListener('click', handleAddTask);

    listen('scheduled_task_started', (event) => {
        const payload = event.payload;
        // Optionally display notification
        console.log("Scheduled task started:", payload);
        const notifBadge = document.getElementById('notif-badge');
        if (notifBadge) {
            notifBadge.innerText = parseInt(notifBadge.innerText || 0) + 1;
            notifBadge.classList.remove('hidden');
        }

        // Trigger agent loop silently
        if (window.invokeAgentLoopSilent) {
            window.invokeAgentLoopSilent(payload.goal);
        } else {
            console.warn("invokeAgentLoopSilent not implemented. Task started but agent did not trigger.");
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
        alert("Please fill in all fields.");
        return;
    }

    try {
        await invoke('add_scheduled_task', { name, cron, goal });
        document.getElementById('scheduler-name-input').value = '';
        document.getElementById('scheduler-cron-input').value = '';
        document.getElementById('scheduler-goal-input').value = '';
        await loadTasks();
    } catch (e) {
        alert("Failed to add task. Is the cron expression valid? Error: " + e);
    }
}

window.deleteSchedulerTask = async function(id) {
    if (!confirm("Delete this task?")) return;
    try {
        await invoke('delete_scheduled_task', { id });
        await loadTasks();
    } catch (e) {
        alert("Failed to delete task: " + e);
    }
};

window.toggleSchedulerTask = async function(id, enabled) {
    try {
        await invoke('toggle_scheduled_task', { id, enabled });
        await loadTasks();
    } catch (e) {
        alert("Failed to toggle task: " + e);
    }
};

window.runSchedulerTaskNow = async function(id) {
    try {
        await invoke('run_task_now', { id });
        alert("Task triggered!");
    } catch (e) {
        alert("Failed to run task: " + e);
    }
};
