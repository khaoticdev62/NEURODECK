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
