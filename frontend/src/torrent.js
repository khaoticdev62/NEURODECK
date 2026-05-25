import { invoke } from '@tauri-apps/api/core';
import { addNotification } from './notifications.js';
import { createIcon } from './icons.js';

const TORRENT_REFRESH_INTERVAL_MS = 4000;

const torrentUi = {
  initialized: false,
  rootPath: '',
  refreshTimer: null,
  isRefreshing: false,
  items: [],
  selectedId: null,
  addBtn: null,
  refreshBtn: null,
  pauseAllBtn: null,
  resumeAllBtn: null,
  openRootBtn: null,
  sourceInput: null,
  searchInput: null,
  filterSelect: null,
  sortSelect: null,
  listEl: null,
  rootEl: null,
  countEl: null,
  inspectorEl: null,
  totalCountEl: null,
  runningCountEl: null,
  pausedCountEl: null,
  completeCountEl: null,
};

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function clampPercent(value) {
  return Math.min(100, Math.max(0, Number(value || 0)));
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
  if (entry.status === 'waiting') return 'waiting for peers';
  return entry.status;
}

function torrentActionButton(label, iconName, handler, kind = 'secondary') {
  const button = document.createElement('button');
  button.className = `send-prompt-btn nd-icon-button torrent-action-btn torrent-action-btn-${kind}`;
  button.type = 'button';
  button.innerHTML = `${createIcon(iconName, { size: 14 })}<span class="nd-button-label">${label}</span>`;
  button.addEventListener('click', handler);
  return button;
}

function notifyError(title, err) {
  console.error(err);
  addNotification?.(title, String(err), 'error');
}

function formatTorrentMeta(entry) {
  return `${entry.source_kind.toUpperCase()} | ${entry.source_value}`;
}

function formatTorrentDetails(entry) {
  return `Peers ${entry.peers} | Trackers ${entry.trackers} | Pieces ${entry.pieces_done}/${entry.pieces_total} | Added ${entry.added_at_utc}`;
}

function getFilteredItems() {
  const search = torrentUi.searchInput?.value.trim().toLowerCase() || '';
  const filter = torrentUi.filterSelect?.value || 'all';
  const sort = torrentUi.sortSelect?.value || 'recent';

  let items = [...torrentUi.items];

  if (search) {
    items = items.filter((entry) =>
      (entry.name || '').toLowerCase().includes(search) ||
      (entry.source_value || '').toLowerCase().includes(search) ||
      (entry.info_hash || '').toLowerCase().includes(search),
    );
  }

  if (filter !== 'all') {
    items = items.filter((entry) => {
      if (filter === 'running') return !entry.paused && !entry.completed;
      if (filter === 'paused') return entry.paused;
      if (filter === 'completed') return entry.completed;
      if (filter === 'metadata') return !entry.metadata_known;
      return true;
    });
  }

  items.sort((a, b) => {
    if (sort === 'progress') return clampPercent(b.progress_pct) - clampPercent(a.progress_pct);
    if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sort === 'peers') return (b.peers || 0) - (a.peers || 0);
    return (b.added_at_utc || '').localeCompare(a.added_at_utc || '');
  });

  return items;
}

function renderSummary() {
  const total = torrentUi.items.length;
  const running = torrentUi.items.filter((entry) => !entry.paused && !entry.completed).length;
  const paused = torrentUi.items.filter((entry) => entry.paused).length;
  const complete = torrentUi.items.filter((entry) => entry.completed).length;

  if (torrentUi.totalCountEl) torrentUi.totalCountEl.textContent = String(total);
  if (torrentUi.runningCountEl) torrentUi.runningCountEl.textContent = String(running);
  if (torrentUi.pausedCountEl) torrentUi.pausedCountEl.textContent = String(paused);
  if (torrentUi.completeCountEl) torrentUi.completeCountEl.textContent = String(complete);
  if (torrentUi.countEl) torrentUi.countEl.textContent = `${total} loaded | ${running} running | ${complete} complete`;
}

async function writeToClipboard(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    addNotification?.('Copied', `${label} copied to clipboard.`, 'success');
  } catch (err) {
    notifyError('Clipboard Failed', err);
  }
}

function renderInspector(entry) {
  if (!torrentUi.inspectorEl) return;
  clearNode(torrentUi.inspectorEl);

  const title = document.createElement('div');
  title.className = 'torrent-inspector-title';
  title.textContent = 'Torrent Inspector';
  torrentUi.inspectorEl.appendChild(title);

  if (!entry) {
    const empty = document.createElement('div');
    empty.className = 'torrent-inspector-empty';
    empty.textContent = 'Select a torrent to inspect swarm, source, and hash details.';
    torrentUi.inspectorEl.appendChild(empty);
    return;
  }

  const hero = document.createElement('div');
  hero.className = 'torrent-inspector-hero';

  const name = document.createElement('strong');
  name.className = 'torrent-inspector-name';
  name.textContent = entry.name || entry.id;

  const status = document.createElement('span');
  status.className = `transfer-status torrent-status ${torrentStatusClass(entry.status)}`;
  status.textContent = torrentStatusLabel(entry);

  hero.appendChild(name);
  hero.appendChild(status);
  torrentUi.inspectorEl.appendChild(hero);

  const grid = document.createElement('div');
  grid.className = 'torrent-inspector-grid';
  [
    ['Info Hash', entry.info_hash || 'Unavailable'],
    ['Source', entry.source_kind?.toUpperCase() || 'Unknown'],
    ['Progress', `${clampPercent(entry.progress_pct).toFixed(1)}%`],
    ['Pieces', `${entry.pieces_done}/${entry.pieces_total}`],
    ['Peers', String(entry.peers || 0)],
    ['Trackers', String(entry.trackers || 0)],
    ['Added', entry.added_at_utc || 'Unknown'],
    ['Root', entry.download_root || torrentUi.rootPath || 'Unavailable'],
  ].forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'torrent-inspector-row';

    const key = document.createElement('span');
    key.textContent = label;

    const val = document.createElement('strong');
    val.textContent = value;

    row.appendChild(key);
    row.appendChild(val);
    grid.appendChild(row);
  });
  torrentUi.inspectorEl.appendChild(grid);

  const source = document.createElement('div');
  source.className = 'torrent-inspector-source';
  source.textContent = entry.source_value || '';
  torrentUi.inspectorEl.appendChild(source);

  const actions = document.createElement('div');
  actions.className = 'torrent-inspector-actions';

  const copyHash = torrentActionButton('Copy Hash', 'copy', () => writeToClipboard(entry.info_hash || '', 'Info hash'));
  copyHash.disabled = !entry.info_hash;
  const copySource = torrentActionButton('Copy Source', 'clipboard', () => writeToClipboard(entry.source_value || '', 'Source'));

  const primary = entry.paused
    ? torrentActionButton('Resume', 'play', () => runTorrentAction('torrent_resume', { id: entry.id }, 'Torrent resumed.'))
    : torrentActionButton('Pause', 'pause', () => runTorrentAction('torrent_pause', { id: entry.id }, 'Torrent paused.'));

  actions.appendChild(primary);
  actions.appendChild(copyHash);
  actions.appendChild(copySource);
  torrentUi.inspectorEl.appendChild(actions);
}

async function runTorrentAction(command, payload, successMessage = '') {
  try {
    await invoke(command, payload);
    if (successMessage) {
      addNotification?.('Torrent Client', successMessage, 'success');
    }
    await refreshTorrentPanel(true);
  } catch (err) {
    notifyError('Torrent Action Failed', err);
  }
}

function renderTorrentList() {
  if (!torrentUi.listEl) return;
  clearNode(torrentUi.listEl);

  const items = getFilteredItems();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'peer-item-empty';
    empty.textContent = torrentUi.items.length
      ? 'No torrents match the current search or filter.'
      : 'No torrents loaded yet.';
    torrentUi.listEl.appendChild(empty);
    renderInspector(torrentUi.items.find((entry) => entry.id === torrentUi.selectedId) || null);
    return;
  }

  if (!items.some((entry) => entry.id === torrentUi.selectedId)) {
    torrentUi.selectedId = items[0].id;
  }

  items.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'transfer-item torrent-item torrent-item-card';
    if (entry.id === torrentUi.selectedId) {
      item.classList.add('active');
    }
    item.addEventListener('click', () => {
      torrentUi.selectedId = entry.id;
      renderTorrentList();
      renderInspector(entry);
    });

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
    meta.textContent = formatTorrentMeta(entry);

    const progressRow = document.createElement('div');
    progressRow.className = 'transfer-progress-container';

    const barBg = document.createElement('div');
    barBg.className = 'transfer-progress-bar-bg';

    const barFill = document.createElement('div');
    barFill.className = `transfer-progress-bar-fill ${entry.completed ? 'completed' : ''}`;
    barFill.style.width = `${clampPercent(entry.progress_pct)}%`;
    barBg.appendChild(barFill);

    const percent = document.createElement('span');
    percent.className = 'transfer-percent';
    percent.textContent = `${clampPercent(entry.progress_pct).toFixed(1)}%`;

    progressRow.appendChild(barBg);
    progressRow.appendChild(percent);

    const details = document.createElement('div');
    details.className = 'torrent-details';
    details.textContent = formatTorrentDetails(entry);

    const actions = document.createElement('div');
    actions.className = 'torrent-actions';

    const pauseButton = torrentActionButton('Pause', 'pause', async (event) => {
      event.stopPropagation();
      await runTorrentAction('torrent_pause', { id: entry.id }, 'Torrent paused.');
    });
    pauseButton.disabled = entry.paused;

    const resumeButton = torrentActionButton('Resume', 'play', async (event) => {
      event.stopPropagation();
      await runTorrentAction('torrent_resume', { id: entry.id }, 'Torrent resumed.');
    });
    resumeButton.disabled = !entry.paused;

    const inspectButton = torrentActionButton('Inspect', 'info', (event) => {
      event.stopPropagation();
      torrentUi.selectedId = entry.id;
      renderTorrentList();
      renderInspector(entry);
    }, 'ghost');

    actions.appendChild(pauseButton);
    actions.appendChild(resumeButton);
    actions.appendChild(inspectButton);

    item.appendChild(header);
    item.appendChild(meta);
    item.appendChild(progressRow);
    item.appendChild(details);
    item.appendChild(actions);
    torrentUi.listEl.appendChild(item);
  });

  renderInspector(torrentUi.items.find((entry) => entry.id === torrentUi.selectedId) || items[0]);
}

async function refreshTorrentPanel(silent = false) {
  if (torrentUi.isRefreshing) return;
  torrentUi.isRefreshing = true;
  try {
    const status = await invoke('torrent_get_status');
    torrentUi.rootPath = status.download_root || torrentUi.rootPath;
    torrentUi.items = status.torrents || [];
    if (!torrentUi.selectedId && torrentUi.items.length) {
      torrentUi.selectedId = torrentUi.items[0].id;
    }
    if (torrentUi.rootEl) {
      torrentUi.rootEl.textContent = `Download root: ${torrentUi.rootPath || 'Unavailable'}`;
    }
    renderSummary();
    renderTorrentList();
  } catch (err) {
    if (!silent) {
      notifyError('Torrent Refresh Failed', err);
    } else {
      console.error(err);
    }
  } finally {
    torrentUi.isRefreshing = false;
  }
}

async function addTorrentFromInput() {
  if (!torrentUi.sourceInput || !torrentUi.addBtn) return;
  const source = torrentUi.sourceInput.value.trim();
  if (!source) {
    addNotification?.('Torrent Source Required', 'Paste a magnet URI or a local .torrent path.', 'warn');
    return;
  }

  torrentUi.addBtn.disabled = true;
  torrentUi.addBtn.innerHTML = `${createIcon('loaderCircle', { size: 14 })}<span class="nd-button-label">Adding…</span>`;
  try {
    await invoke('torrent_add', { source });
    torrentUi.sourceInput.value = '';
    addNotification?.('Torrent Added', 'The torrent was validated and added paused by default.', 'success');
    await refreshTorrentPanel(true);
  } catch (err) {
    notifyError('Torrent Add Failed', err);
  } finally {
    torrentUi.addBtn.disabled = false;
    torrentUi.addBtn.innerHTML = `${createIcon('download', { size: 14 })}<span class="nd-button-label">Add Paused</span>`;
  }
}

async function openTorrentRoot() {
  try {
    await invoke('torrent_open_download_root');
  } catch (err) {
    notifyError('Open Folder Failed', err);
  }
}

export function initTorrentClient() {
  if (torrentUi.initialized) return;
  torrentUi.initialized = true;

  torrentUi.addBtn = document.getElementById('torrent-add-btn');
  torrentUi.refreshBtn = document.getElementById('torrent-refresh-btn');
  torrentUi.pauseAllBtn = document.getElementById('torrent-pause-all-btn');
  torrentUi.resumeAllBtn = document.getElementById('torrent-resume-all-btn');
  torrentUi.openRootBtn = document.getElementById('torrent-open-root-btn');
  torrentUi.sourceInput = document.getElementById('torrent-source-input');
  torrentUi.searchInput = document.getElementById('torrent-search-input');
  torrentUi.filterSelect = document.getElementById('torrent-filter-select');
  torrentUi.sortSelect = document.getElementById('torrent-sort-select');
  torrentUi.listEl = document.getElementById('torrent-list');
  torrentUi.rootEl = document.getElementById('torrent-root-label');
  torrentUi.countEl = document.getElementById('torrent-count-label');
  torrentUi.inspectorEl = document.getElementById('torrent-inspector');
  torrentUi.totalCountEl = document.getElementById('torrent-total-count');
  torrentUi.runningCountEl = document.getElementById('torrent-running-count');
  torrentUi.pausedCountEl = document.getElementById('torrent-paused-count');
  torrentUi.completeCountEl = document.getElementById('torrent-complete-count');

  if (!torrentUi.addBtn || !torrentUi.refreshBtn || !torrentUi.sourceInput || !torrentUi.listEl) {
    return;
  }

  torrentUi.addBtn.addEventListener('click', addTorrentFromInput);
  torrentUi.refreshBtn.addEventListener('click', () => refreshTorrentPanel());
  torrentUi.pauseAllBtn?.addEventListener('click', () => runTorrentAction('torrent_pause_all', {}, 'All torrents paused.'));
  torrentUi.resumeAllBtn?.addEventListener('click', () => runTorrentAction('torrent_resume_all', {}, 'All torrents resumed.'));
  torrentUi.openRootBtn?.addEventListener('click', openTorrentRoot);
  torrentUi.sourceInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTorrentFromInput();
    }
  });

  [torrentUi.searchInput, torrentUi.filterSelect, torrentUi.sortSelect].forEach((node) => {
    node?.addEventListener('input', renderTorrentList);
    node?.addEventListener('change', renderTorrentList);
  });

  refreshTorrentPanel(true);
  torrentUi.refreshTimer = window.setInterval(() => {
    const shareView = document.getElementById('view-share');
    if (shareView && shareView.classList.contains('active')) {
      refreshTorrentPanel(true);
    }
  }, TORRENT_REFRESH_INTERVAL_MS);
}
