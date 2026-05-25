import { invoke } from '@tauri-apps/api/core';
import { addNotification } from './notifications.js';
import { createIcon } from './icons.js';

const TORRENT_REFRESH_INTERVAL_MS = 4000;

const torrentUi = {
  initialized: false,
  rootPath: '',
  refreshTimer: null,
  isRefreshing: false,
  addBtn: null,
  refreshBtn: null,
  sourceInput: null,
  listEl: null,
  rootEl: null,
  countEl: null,
};

function torrentActionButton(label, iconName, handler, kind = 'secondary') {
  const button = document.createElement('button');
  button.className = `send-prompt-btn nd-icon-button torrent-action-btn torrent-action-btn-${kind}`;
  button.type = 'button';
  button.innerHTML = `${createIcon(iconName, { size: 14 })}<span class="nd-button-label">${label}</span>`;
  button.addEventListener('click', handler);
  return button;
}

function torrentStatusClass(status) {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'paused':
    case 'paused-complete':
      return 'pending';
    case 'metadata':
      return 'transferring';
    case 'waiting':
      return 'pending';
    default:
      return 'transferring';
  }
}

function torrentStatusLabel(entry) {
  if (entry.completed && entry.paused) return 'paused complete';
  if (entry.completed) return 'completed';
  if (entry.paused) return 'paused';
  if (!entry.metadata_known) return 'fetching metadata';
  if (entry.status === 'waiting') return 'waiting';
  return entry.status;
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function renderTorrentList(items) {
  if (!torrentUi.listEl) return;
  clearNode(torrentUi.listEl);

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'peer-item-empty';
    empty.textContent = 'No torrents loaded yet.';
    torrentUi.listEl.appendChild(empty);
    return;
  }

  items.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'transfer-item torrent-item';

    const header = document.createElement('div');
    header.className = 'transfer-header torrent-header';

    const title = document.createElement('span');
    title.className = 'transfer-filename torrent-title';
    title.textContent = entry.name || entry.id;

    const status = document.createElement('span');
    status.className = `transfer-status torrent-status ${torrentStatusClass(entry.status)}`;
    status.textContent = torrentStatusLabel(entry);

    header.appendChild(title);
    header.appendChild(status);

    const meta = document.createElement('div');
    meta.className = 'torrent-meta';
    meta.textContent = `${entry.source_kind.toUpperCase()} · ${entry.source_value}`;

    const progressRow = document.createElement('div');
    progressRow.className = 'transfer-progress-container';

    const barBg = document.createElement('div');
    barBg.className = 'transfer-progress-bar-bg';

    const barFill = document.createElement('div');
    barFill.className = `transfer-progress-bar-fill ${entry.completed ? 'completed' : ''}`;
    barFill.style.width = `${Math.min(100, Math.max(0, entry.progress_pct || 0))}%`;
    barBg.appendChild(barFill);

    const percent = document.createElement('span');
    percent.className = 'transfer-percent';
    percent.textContent = `${Math.min(100, Math.max(0, entry.progress_pct || 0)).toFixed(1)}%`;

    progressRow.appendChild(barBg);
    progressRow.appendChild(percent);

    const details = document.createElement('div');
    details.className = 'torrent-details';
    details.textContent = `Peers ${entry.peers} · Trackers ${entry.trackers} · Pieces ${entry.pieces_done}/${entry.pieces_total} · Added ${entry.added_at_utc}`;

    const actions = document.createElement('div');
    actions.className = 'torrent-actions';

    const pauseButton = torrentActionButton('Pause', 'pause', async () => {
      try {
        await invoke('torrent_pause', { id: entry.id });
        await refreshTorrentPanel(true);
      } catch (err) {
        console.error(err);
        addNotification?.('Torrent Pause Failed', String(err), 'error');
      }
    });
    pauseButton.disabled = entry.paused;

    const resumeButton = torrentActionButton('Resume', 'play', async () => {
      try {
        await invoke('torrent_resume', { id: entry.id });
        await refreshTorrentPanel(true);
      } catch (err) {
        console.error(err);
        addNotification?.('Torrent Resume Failed', String(err), 'error');
      }
    });
    resumeButton.disabled = !entry.paused;

    actions.appendChild(pauseButton);
    actions.appendChild(resumeButton);

    item.appendChild(header);
    item.appendChild(meta);
    item.appendChild(progressRow);
    item.appendChild(details);
    item.appendChild(actions);
    torrentUi.listEl.appendChild(item);
  });
}

async function refreshTorrentPanel(silent = false) {
  if (torrentUi.isRefreshing) return;
  torrentUi.isRefreshing = true;
  try {
    const status = await invoke('torrent_get_status');
    torrentUi.rootPath = status.download_root || torrentUi.rootPath;
    if (torrentUi.rootEl) {
      torrentUi.rootEl.textContent = `Download root: ${torrentUi.rootPath || 'Unavailable'}`;
    }
    if (torrentUi.countEl) {
      torrentUi.countEl.textContent = `${status.torrent_count || 0} active`;
    }
    renderTorrentList(status.torrents || []);
  } catch (err) {
    console.error(err);
    if (!silent) {
      addNotification?.('Torrent Refresh Failed', String(err), 'error');
    }
  } finally {
    torrentUi.isRefreshing = false;
  }
}

async function addTorrentFromInput() {
  if (!torrentUi.sourceInput) return;
  const source = torrentUi.sourceInput.value.trim();
  if (!source) {
    addNotification?.('Torrent Source Required', 'Paste a magnet URI or a local .torrent path.', 'warn');
    return;
  }

  torrentUi.addBtn.disabled = true;
  torrentUi.addBtn.innerText = 'Adding...';
  try {
    await invoke('torrent_add', { source });
    torrentUi.sourceInput.value = '';
    addNotification?.('Torrent Added', 'The torrent was validated and added paused by default.', 'success');
    await refreshTorrentPanel(true);
  } catch (err) {
    console.error(err);
    addNotification?.('Torrent Add Failed', String(err), 'error');
  } finally {
    torrentUi.addBtn.disabled = false;
    torrentUi.addBtn.innerHTML = `${createIcon('download', { size: 14 })}<span class="nd-button-label">Add Paused</span>`;
  }
}

export function initTorrentClient() {
  if (torrentUi.initialized) return;
  torrentUi.initialized = true;

  torrentUi.addBtn = document.getElementById('torrent-add-btn');
  torrentUi.refreshBtn = document.getElementById('torrent-refresh-btn');
  torrentUi.sourceInput = document.getElementById('torrent-source-input');
  torrentUi.listEl = document.getElementById('torrent-list');
  torrentUi.rootEl = document.getElementById('torrent-root-label');
  torrentUi.countEl = document.getElementById('torrent-count-label');

  if (!torrentUi.addBtn || !torrentUi.refreshBtn || !torrentUi.sourceInput || !torrentUi.listEl) {
    return;
  }

  torrentUi.addBtn.addEventListener('click', addTorrentFromInput);
  torrentUi.refreshBtn.addEventListener('click', () => refreshTorrentPanel());
  torrentUi.sourceInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTorrentFromInput();
    }
  });

  refreshTorrentPanel(true);
  torrentUi.refreshTimer = window.setInterval(() => {
    const shareView = document.getElementById('view-share');
    if (shareView && shareView.classList.contains('active')) {
      refreshTorrentPanel(true);
    }
  }, TORRENT_REFRESH_INTERVAL_MS);
}
