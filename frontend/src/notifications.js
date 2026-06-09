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

function _buildToast(notif, title, text, timestamp, type, navigateTo) {
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
    if (navigateTo) {
        toast.style.cursor = 'pointer';
        toast.title = 'Click to navigate';
        toast.addEventListener('click', () => {
            if (typeof window.activateViewByName === 'function') window.activateViewByName(navigateTo);
        });
    }
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => { toast.remove(); state.notifications = state.notifications.filter(n => n.id !== notif.id); }, 300);
    }, 4000);
    return toast;
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
    if (toastContainer) toastContainer.appendChild(_buildToast(notif, title, text, timestamp, type, navigateTo));

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

/**
 * Electron-safe replacement for window.prompt().
 * Returns the entered string, or null if the user cancelled.
 */
export function showPrompt(message, defaultValue = '', options = {}) {
    const { title = 'Input', confirmText = 'OK', cancelText = 'Cancel' } = options;
    return new Promise((resolve) => {
        const dialog = document.createElement('dialog');
        dialog.className = 'confirm-modal';
        dialog.innerHTML = `
            <div class="confirm-modal-content">
                <h3 class="confirm-modal-title">${escapeHtml(title)}</h3>
                <p class="confirm-modal-message">${escapeHtml(message)}</p>
                <input class="confirm-modal-input" type="text" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(defaultValue)}" autocomplete="off">
                <div class="confirm-modal-actions">
                    <button class="btn btn-secondary" id="prompt-cancel-btn">${escapeHtml(cancelText)}</button>
                    <button class="btn btn-primary" id="prompt-ok-btn">${escapeHtml(confirmText)}</button>
                </div>
            </div>
        `;

        const input = dialog.querySelector('.confirm-modal-input');
        const okBtn = dialog.querySelector('#prompt-ok-btn');
        const cancelBtn = dialog.querySelector('#prompt-cancel-btn');

        const submit = () => {
            const val = input.value;
            dialog.close();
            dialog.remove();
            resolve(val);
        };

        okBtn.addEventListener('click', submit);
        cancelBtn.addEventListener('click', () => {
            dialog.close();
            dialog.remove();
            resolve(null);
        });
        dialog.addEventListener('cancel', () => {
            dialog.remove();
            resolve(null);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
            if (e.key === 'Escape') { e.preventDefault(); dialog.close(); dialog.remove(); resolve(null); }
        });

        document.body.appendChild(dialog);
        dialog.showModal();
        // Select all text in input so user can type immediately
        setTimeout(() => { input.select(); }, 50);
    });
}

window.showPrompt = showPrompt;
