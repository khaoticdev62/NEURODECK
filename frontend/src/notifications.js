import { state } from './state.js';

function updateNotifBadge() {
    const badge = document.getElementById("notif-badge");
    if (!badge) return;
    if (state.unreadNotifCount > 0) {
        badge.innerText = state.unreadNotifCount;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

function renderNotificationsList() {
    const container = document.getElementById("notif-list-container");
    if (!container) return;

    if (state.notifications.length === 0) {
        container.innerHTML = `<div class="notif-empty-state">No notifications yet.</div>`;
        return;
    }

    container.innerHTML = state.notifications.map(n => `
        <div class="notif-item ${window.escapeHtml(n.type)}">
            <div class="notif-item-header">
                <span>${window.escapeHtml(n.title)}</span>
                <span class="notif-item-time">${window.escapeHtml(n.time)}</span>
            </div>
            <div class="notif-item-text">${window.escapeHtml(n.text)}</div>
        </div>
    `).join("");
}

export function addNotification(title, text, type = 'info') {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const notif = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title,
        text,
        type,
        time: timestamp
    };
    state.notifications.unshift(notif);
    state.unreadNotifCount++;
    updateNotifBadge();

    const toastContainer = document.getElementById("toast-container");
    if (toastContainer) {
        const toast = document.createElement("div");
        toast.className = `toast-notif ${type}`;
        toast.innerHTML = `
            <div class="toast-notif-title">
                <span>${title}</span>
                <span style="font-size: 0.65rem; opacity: 0.5;">${timestamp}</span>
            </div>
            <div class="toast-notif-text">${text}</div>
        `;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    renderNotificationsList();
}

window.addNotification = addNotification;
