import { state } from './state.js';
import { invoke } from './neurobridge.js';

export function updateNotifBadge() {
    const badge = document.getElementById("notif-badge");
    if (!badge) return;
    if (state.unreadNotifCount > 0) {
        badge.textContent = String(state.unreadNotifCount);
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

export function renderNotificationsList() {
    const container = document.getElementById("notif-list-container");
    if (!container) return;

    if (state.notifications.length === 0) {
        const empty = document.createElement("div");
        empty.className = "notif-empty-state";
        empty.textContent = "No notifications yet.";
        container.replaceChildren(empty);
        return;
    }

    const fragment = document.createDocumentFragment();
    state.notifications.forEach((n) => {
        const item = document.createElement("div");
        item.className = "notif-item";
        item.classList.add(String(n.type || "info"));

        const header = document.createElement("div");
        header.className = "notif-item-header";

        const title = document.createElement("span");
        title.textContent = String(n.title ?? "");

        const time = document.createElement("span");
        time.className = "notif-item-time";
        time.textContent = String(n.time ?? "");

        const text = document.createElement("div");
        text.className = "notif-item-text";
        text.textContent = String(n.text ?? "");

        header.append(title, time);
        item.append(header, text);
        fragment.appendChild(item);
    });

    container.replaceChildren(fragment);
}

export function addNotification(title, text, type = 'info', navigateTo = null) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const notif = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title,
        text,
        type,
        time: timestamp,
        navigateTo
    };
    state.notifications.unshift(notif);
    // Cap notification history to prevent unbounded growth
    if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
    }
    state.unreadNotifCount++;
    updateNotifBadge();

    if (typeof globalThis.window !== 'undefined' && typeof window.announceToScreenReader === 'function') {
        window.announceToScreenReader(`${title}: ${text}`);
    }

    const toastContainer = document.getElementById("toast-container");
    if (toastContainer) {
        const toast = document.createElement("div");
        toast.className = `toast-notif ${type}`;
        const titleRow = document.createElement("div");
        titleRow.className = "toast-notif-title";

        const titleText = document.createElement("span");
        titleText.textContent = String(title);

        const timeText = document.createElement("span");
        timeText.style.fontSize = "0.65rem";
        timeText.style.opacity = "0.5";
        timeText.textContent = timestamp;

        const body = document.createElement("div");
        body.className = "toast-notif-text";
        body.textContent = String(text);

        titleRow.append(titleText, timeText);
        toast.append(titleRow, body);

        // Click-to-navigate support
        if (navigateTo) {
            toast.style.cursor = 'pointer';
            toast.title = 'Click to navigate';
            toast.addEventListener('click', () => {
                if (typeof window.activateViewByName === 'function') {
                    window.activateViewByName(navigateTo);
                }
            });
        }

        toastContainer.appendChild(toast);

        const toastId = notif.id;
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => {
                toast.remove();
                // Auto-prune dismissed toast from state array
                state.notifications = state.notifications.filter(n => n.id !== toastId);
            }, 300);
        }, 4000);
    }

    renderNotificationsList();

    // Relay to connected remote WebSocket clients (fire-and-forget — no error handling needed)
    invoke('remote_relay_notification', { title, text, notifType: type }).catch(() => {});
}

export function showConfirm(message, options = {}) {
    const { confirmText = 'Confirm', cancelText = 'Cancel', title = 'Confirm' } = options;

    return new Promise((resolve) => {
        const dialog = document.createElement('dialog');
        dialog.className = 'confirm-modal';
        dialog.innerHTML = `
            <div class="confirm-modal-content">
                <h3 class="confirm-modal-title">${escapeHtml(title)}</h3>
                <p class="confirm-modal-message">${escapeHtml(message)}</p>
                <div class="confirm-modal-actions">
                    <button class="btn btn-secondary" id="cancel-btn">${escapeHtml(cancelText)}</button>
                    <button class="btn btn-primary" id="confirm-btn">${escapeHtml(confirmText)}</button>
                </div>
            </div>
        `;

        const confirmBtn = dialog.querySelector('#confirm-btn');
        const cancelBtn = dialog.querySelector('#cancel-btn');

        confirmBtn.addEventListener('click', () => {
            dialog.close();
            dialog.remove();
            resolve(true);
        });

        cancelBtn.addEventListener('click', () => {
            dialog.close();
            dialog.remove();
            resolve(false);
        });

        dialog.addEventListener('cancel', () => {
            dialog.remove();
            resolve(false);
        });

        document.body.appendChild(dialog);
        dialog.showModal();
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.addNotification = addNotification;
window.showConfirm = showConfirm;
