import { invoke } from './neurobridge.js';
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
  selectedIds: new Set(),
  completionNotifiedIds: new Set(),
  addBtn: null,
  refreshBtn: null,
  pauseAllBtn: null,
  resumeAllBtn: null,
  openRootBtn: null,
  sourceInput: null,
  dropzone: null,
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
  batchCopyEl: null,
  selectVisibleBtn: null,
  clearSelectionBtn: null,
  pauseSelectedBtn: null,
  resumeSelectedBtn: null,
  removeSelectedBtn: null,
};

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function clampPercent(value) {
  return Math.min(100, Math.max(0, Number(value || 0)));
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let scaled = value;
  let unitIndex = 0;
  while (scaled >= 1024 && unitIndex < units.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }
  const precision = scaled >= 100 || unitIndex === 0 ? 0 : scaled >= 10 ? 1 : 2;
  return `${scaled.toFixed(precision)} ${units[unitIndex]}`;
}

function formatRate(bps) {
  return `${formatBytes(bps)}/s`;
}

function formatEta(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const totalSeconds = Number(seconds);
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  if (totalSeconds === 0) return 'done';
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    return secs ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function torrentStatusKey(entry) {
  if (!entry) return 'unknown';
  if (entry.completed && entry.paused) return 'paused-complete';
  if (entry.completed) return 'completed';
  if (entry.paused) return 'paused';
  if (!entry.metadata_known) return 'metadata';
  if (entry.status === 'waiting' && Number(entry.peers || 0) === 0) return 'stalled';
  if (entry.status === 'waiting') return 'waiting';
  return entry.status || 'running';
}

function torrentStatusClass(entry) {
  switch (torrentStatusKey(entry)) {
    case 'completed':
      return 'completed';
    case 'paused':
    case 'paused-complete':
    case 'waiting':
      return 'pending';
    case 'stalled':
      return 'failed';
    case 'metadata':
    case 'running':
    default:
      return 'transferring';
  }
}

function torrentStatusLabel(entry) {
  switch (torrentStatusKey(entry)) {
    case 'paused-complete':
      return 'paused complete';
    case 'completed':
      return 'completed';
    case 'paused':
      return 'paused';
    case 'metadata':
      return 'fetching metadata';
    case 'waiting':
      return 'waiting for peers';
    case 'stalled':
      return 'stalled';
    case 'running':
    default:
      return 'downloading';
  }
}

function torrentInsight(entry) {
  if (!entry.metadata_known) return 'Metadata has not resolved yet. Magnet bootstrap is still in progress.';
  if (entry.completed && entry.paused) return 'Payload is complete and safely parked. Resume only if you want to seed.';
  if (entry.completed) return 'Download is complete. This swarm is now in seeding posture.';
  if (entry.paused) return 'Queue entry is parked. It will not talk to the swarm until resumed.';
  if (Number(entry.peers || 0) === 0) return 'No active peers detected. The swarm may be cold or trackers may be lagging.';
  if (Number(entry.peers || 0) <= 2) return 'Low peer availability. Expect unstable throughput until more peers appear.';
  if (Number(entry.download_rate_bps || 0) === 0 && Number(entry.bytes_remaining || 0) > 0) return 'Swarm is connected but not moving data yet. Watch peer quality and tracker churn.';
  if (clampPercent(entry.progress_pct) >= 95) return 'Final pieces are in flight. Completion should be close if the swarm stays healthy.';
  if (Number(entry.trackers || 0) === 0) return 'Tracker count is empty. This swarm may be relying on magnet metadata and peer discovery only.';
  return 'Healthy swarm. Peers and trackers are active enough to keep this queue moving.';
}

function torrentSourceLabel(entry) {
  return `${(entry.source_kind || 'unknown').toUpperCase()} · ${entry.source_display || entry.source_value || 'No source detail'}`;
}

function formatTorrentPieces(entry) {
  return `${entry.pieces_done}/${entry.pieces_total}`;
}

function formatTorrentDetails(entry) {
  return `DL ${formatRate(entry.download_rate_bps)} · UL ${formatRate(entry.upload_rate_bps)} · ETA ${formatEta(entry.eta_seconds)} · Remaining ${formatBytes(entry.bytes_remaining)}`;
}

function queueMetric(value, suffix = '') {
  return `${value ?? 0}${suffix}`;
}

function switchSharePanel(panel) {
  document
    .querySelectorAll('.share-inner-tab')
    .forEach((tab) => tab.classList.toggle('active', tab.getAttribute('data-panel') === panel));
  document
    .querySelectorAll('.share-panel-section')
    .forEach((section) => section.classList.toggle('active', section.id === `share-panel-${panel}`));
}

function handoffTorrentToLan(entry) {
  const savePath = normalizeSourceValue(entry?.save_path);
  if (!savePath) {
    addNotification?.('Payload Pending', 'This torrent does not have a resolved save path yet.', 'warn');
    return;
  }

  switchSharePanel('lan');
  const pathInput = document.getElementById('share-filepath-input');
  if (!pathInput) {
    addNotification?.('LAN Share Unavailable', 'The LAN transfer path field is not available right now.', 'error');
    return;
  }

  pathInput.value = savePath;
  pathInput.dispatchEvent(new Event('input', { bubbles: true }));
  pathInput.focus();
  addNotification?.('LAN Handoff Ready', 'Payload path staged in the LAN transfer panel.', 'success');
}

function normalizeSourceValue(value) {
  return String(value || '').trim();
}

function eqIgnoreCase(left, right) {
  return normalizeSourceValue(left).toLowerCase() === normalizeSourceValue(right).toLowerCase();
}

function extractMagnetInfoHash(source) {
  const normalized = normalizeSourceValue(source);
  if (!normalized.toLowerCase().startsWith('magnet:')) return '';
  const match = normalized.match(/(?:[?&]|^)xt=urn:(?:btih|btmh):([^&]+)/i);
  if (!match?.[1]) return '';
  try {
    return decodeURIComponent(match[1]).trim().toUpperCase();
  } catch {
    return match[1].trim().toUpperCase();
  }
}

function findDuplicateTorrent(source) {
  const normalizedSource = normalizeSourceValue(source);
  if (!normalizedSource) return null;

  const exactMatch = torrentUi.items.find((entry) => eqIgnoreCase(entry.source_value, normalizedSource));
  if (exactMatch) return exactMatch;

  const magnetHash = extractMagnetInfoHash(normalizedSource);
  if (!magnetHash) return null;

  return torrentUi.items.find((entry) => eqIgnoreCase(entry.info_hash, magnetHash));
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

function getFilteredItems() {
  const search = torrentUi.searchInput?.value.trim().toLowerCase() || '';
  const filter = torrentUi.filterSelect?.value || 'all';
  const sort = torrentUi.sortSelect?.value || 'recent';

  let items = [...torrentUi.items];

  if (search) {
    items = items.filter((entry) =>
      (entry.name || '').toLowerCase().includes(search) ||
      (entry.source_display || '').toLowerCase().includes(search) ||
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
      if (filter === 'stalled') return torrentStatusKey(entry) === 'stalled';
      return true;
    });
  }

  items.sort((a, b) => {
    if (sort === 'progress') return clampPercent(b.progress_pct) - clampPercent(a.progress_pct);
    if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sort === 'peers') return (b.peers || 0) - (a.peers || 0);
    if (sort === 'status') return torrentStatusLabel(a).localeCompare(torrentStatusLabel(b));
    return (b.added_at_utc || '').localeCompare(a.added_at_utc || '');
  });

  return items;
}

function getSelectedEntries() {
  return torrentUi.items.filter((entry) => torrentUi.selectedIds.has(entry.id));
}

function syncSelectionState() {
  const activeIds = new Set(torrentUi.items.map((entry) => entry.id));
  torrentUi.selectedIds = new Set([...torrentUi.selectedIds].filter((id) => activeIds.has(id)));
  if (torrentUi.selectedId && !activeIds.has(torrentUi.selectedId)) {
    torrentUi.selectedId = torrentUi.items[0]?.id || null;
  }
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
  const selected = torrentUi.selectedIds.size;
  if (torrentUi.countEl) {
    torrentUi.countEl.textContent = `${total} queued · ${running} running · ${complete} complete${selected ? ` · ${selected} selected` : ''}`;
  }
  if (torrentUi.batchCopyEl) {
    torrentUi.batchCopyEl.textContent = selected
      ? `${selected} queue item${selected === 1 ? '' : 's'} selected.`
      : 'No queue items selected.';
  }
  if (torrentUi.clearSelectionBtn) torrentUi.clearSelectionBtn.disabled = selected === 0;
  if (torrentUi.pauseSelectedBtn) torrentUi.pauseSelectedBtn.disabled = selected === 0;
  if (torrentUi.resumeSelectedBtn) torrentUi.resumeSelectedBtn.disabled = selected === 0;
  if (torrentUi.removeSelectedBtn) torrentUi.removeSelectedBtn.disabled = selected === 0;
}

async function writeToClipboard(value, label) {
  if (!value) {
    addNotification?.('Nothing to Copy', `${label} is not available yet.`, 'warn');
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    addNotification?.('Copied', `${label} copied to clipboard.`, 'success');
  } catch (err) {
    notifyError('Clipboard Failed', err);
  }
}

function confirmTorrentRemoval(entry, deleteData) {
  const mode = deleteData ? 'remove this torrent and delete its downloaded payload from the managed root' : 'remove this torrent from the session';
  return window.confirm(`Do you want to ${mode}?\n\n${entry.name || entry.id}`);
}

function buildInspectorSection(titleText) {
  const section = document.createElement('section');
  section.className = 'torrent-inspector-section';

  const title = document.createElement('div');
  title.className = 'torrent-inspector-section-title';
  title.textContent = titleText;
  section.appendChild(title);

  return section;
}

function buildInspectorGrid(rows) {
  const grid = document.createElement('div');
  grid.className = 'torrent-inspector-grid';

  rows.forEach(([label, value]) => {
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

  return grid;
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
    empty.textContent = 'Select a queue item to inspect swarm posture, source lineage, and next actions.';
    torrentUi.inspectorEl.appendChild(empty);
    return;
  }

  const hero = document.createElement('div');
  hero.className = 'torrent-inspector-hero';

  const heroText = document.createElement('div');
  heroText.className = 'torrent-inspector-hero-copy';

  const name = document.createElement('strong');
  name.className = 'torrent-inspector-name';
  name.textContent = entry.name || entry.id;

  const sourceMeta = document.createElement('div');
  sourceMeta.className = 'torrent-inspector-meta';
  sourceMeta.textContent = torrentSourceLabel(entry);

  heroText.appendChild(name);
  heroText.appendChild(sourceMeta);

  const heroStatus = document.createElement('div');
  heroStatus.className = 'torrent-inspector-status-stack';

  const status = document.createElement('span');
  status.className = `transfer-status torrent-status ${torrentStatusClass(entry)}`;
  status.textContent = torrentStatusLabel(entry);

  const percent = document.createElement('strong');
  percent.className = 'torrent-inspector-progress';
  percent.textContent = `${clampPercent(entry.progress_pct).toFixed(1)}%`;

  heroStatus.appendChild(status);
  heroStatus.appendChild(percent);

  hero.appendChild(heroText);
  hero.appendChild(heroStatus);
  torrentUi.inspectorEl.appendChild(hero);

  const insight = document.createElement('div');
  insight.className = 'torrent-inspector-insight';
  insight.textContent = torrentInsight(entry);
  torrentUi.inspectorEl.appendChild(insight);

  const overview = buildInspectorSection('Overview');
  overview.appendChild(
    buildInspectorGrid([
      ['Progress', `${clampPercent(entry.progress_pct).toFixed(1)}%`],
      ['Pieces', formatTorrentPieces(entry)],
      ['Queue State', torrentStatusLabel(entry)],
      ['Added', entry.added_at_utc || 'Unknown'],
      ['Remaining', formatBytes(entry.bytes_remaining)],
      ['ETA', formatEta(entry.eta_seconds)],
    ]),
  );
  torrentUi.inspectorEl.appendChild(overview);

  const swarm = buildInspectorSection('Swarm');
  swarm.appendChild(
    buildInspectorGrid([
      ['Peers', queueMetric(entry.peers)],
      ['Trackers', queueMetric(entry.trackers)],
      ['Down Rate', formatRate(entry.download_rate_bps)],
      ['Up Rate', formatRate(entry.upload_rate_bps)],
      ['Downloaded', formatBytes(entry.downloaded_bytes)],
      ['Uploaded', formatBytes(entry.uploaded_bytes)],
      ['Ratio', entry.ratio == null ? '—' : `${entry.ratio.toFixed(2)}x`],
      ['Metadata', entry.metadata_known ? 'Resolved' : 'Pending'],
      ['Completed', entry.completed ? 'Yes' : 'No'],
    ]),
  );
  torrentUi.inspectorEl.appendChild(swarm);

  const source = buildInspectorSection('Source');
  source.appendChild(
    buildInspectorGrid([
      ['Info Hash', entry.info_hash || 'Unavailable'],
      ['Source Kind', (entry.source_kind || 'unknown').toUpperCase()],
      ['Root', entry.download_root || torrentUi.rootPath || 'Unavailable'],
      ['Save Path', entry.save_path || 'Pending metadata'],
      ['Record ID', entry.id],
    ]),
  );

  const sourceBlock = document.createElement('div');
  sourceBlock.className = 'torrent-inspector-source';
  sourceBlock.textContent = entry.source_value || entry.source_display || 'No source string available.';
  source.appendChild(sourceBlock);
  torrentUi.inspectorEl.appendChild(source);

  const actions = buildInspectorSection('Actions');
  const actionGrid = document.createElement('div');
  actionGrid.className = 'torrent-inspector-actions';

  const primary = entry.paused
    ? torrentActionButton('Resume', 'play', () => runTorrentAction('torrent_resume', { id: entry.id }, 'Torrent resumed.'))
    : torrentActionButton('Pause', 'pause', () => runTorrentAction('torrent_pause', { id: entry.id }, 'Torrent paused.'));
  const copyHash = torrentActionButton('Copy Hash', 'copy', () => writeToClipboard(entry.info_hash || '', 'Info hash'));
  const copySource = torrentActionButton('Copy Source', 'clipboard', () => writeToClipboard(entry.source_value || '', 'Source'));
  const openRoot = torrentActionButton('Open Root', 'folderOpen', openTorrentRoot, 'ghost');
  const openPayload = torrentActionButton('Reveal Payload', 'arrowUpRight', async () => {
    await runTorrentAction('torrent_open_save_path', { id: entry.id }, '');
  }, 'ghost');
  const sendToLan = torrentActionButton('Send to LAN', 'share2', () => handoffTorrentToLan(entry), 'ghost');
  const remove = torrentActionButton('Remove', 'trash2', async () => {
    if (!confirmTorrentRemoval(entry, false)) return;
    await runTorrentAction('torrent_remove', { id: entry.id, deleteData: false }, 'Torrent removed from the session.');
  }, 'danger');
  const purge = torrentActionButton('Purge Data', 'trash2', async () => {
    if (!confirmTorrentRemoval(entry, true)) return;
    await runTorrentAction('torrent_remove', { id: entry.id, deleteData: true }, 'Torrent removed and payload deleted.');
  }, 'danger');

  actionGrid.appendChild(primary);
  actionGrid.appendChild(copyHash);
  actionGrid.appendChild(copySource);
  actionGrid.appendChild(openRoot);
  actionGrid.appendChild(openPayload);
  actionGrid.appendChild(sendToLan);
  actionGrid.appendChild(remove);
  actionGrid.appendChild(purge);
  actions.appendChild(actionGrid);
  torrentUi.inspectorEl.appendChild(actions);
}

function renderQueueHeader() {
  const header = document.createElement('div');
  header.className = 'torrent-queue-header';
  const selectWrap = document.createElement('label');
  selectWrap.className = 'torrent-select-all';
  const selectAll = document.createElement('input');
  selectAll.type = 'checkbox';
  const visibleItems = getFilteredItems();
  const visibleIds = visibleItems.map((entry) => entry.id);
  const selectedVisible = visibleIds.filter((id) => torrentUi.selectedIds.has(id)).length;
  selectAll.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length;
  selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
  selectAll.addEventListener('click', (event) => event.stopPropagation());
  selectAll.addEventListener('change', () => {
    if (selectAll.checked) {
      visibleIds.forEach((id) => torrentUi.selectedIds.add(id));
    } else {
      visibleIds.forEach((id) => torrentUi.selectedIds.delete(id));
    }
    renderSummary();
    renderTorrentList();
  });
  selectWrap.appendChild(selectAll);
  header.appendChild(selectWrap);

  ['Queue', 'State', 'Progress', 'Peers', 'Trackers', 'Pieces', 'Actions'].forEach((label) => {
    const col = document.createElement('span');
    col.textContent = label;
    header.appendChild(col);
  });
  return header;
}

function renderTorrentRow(entry) {
  const row = document.createElement('div');
  row.className = 'torrent-row';
  if (entry.id === torrentUi.selectedId) {
    row.classList.add('active');
  }
  if (torrentUi.selectedIds.has(entry.id)) {
    row.classList.add('selected');
  }
  row.tabIndex = 0;
  row.addEventListener('click', () => {
    torrentUi.selectedId = entry.id;
    renderTorrentList();
    renderInspector(entry);
  });
  row.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      torrentUi.selectedId = entry.id;
      renderTorrentList();
      renderInspector(entry);
    }
  });

  const selectorCell = document.createElement('div');
  selectorCell.className = 'torrent-row-cell torrent-row-selector';
  const selector = document.createElement('input');
  selector.type = 'checkbox';
  selector.checked = torrentUi.selectedIds.has(entry.id);
  selector.setAttribute('aria-label', `Select ${entry.name || entry.id}`);
  selector.addEventListener('click', (event) => event.stopPropagation());
  selector.addEventListener('change', () => {
    if (selector.checked) {
      torrentUi.selectedIds.add(entry.id);
    } else {
      torrentUi.selectedIds.delete(entry.id);
    }
    renderSummary();
    renderTorrentList();
  });
  selectorCell.appendChild(selector);

  const queueCell = document.createElement('div');
  queueCell.className = 'torrent-row-cell torrent-row-queue';

  const title = document.createElement('strong');
  title.className = 'torrent-row-title';
  title.textContent = entry.name || entry.id;

  const source = document.createElement('span');
  source.className = 'torrent-row-subline';
  source.textContent = torrentSourceLabel(entry);

  const insight = document.createElement('span');
  insight.className = 'torrent-row-subline torrent-row-insight';
  insight.textContent = torrentInsight(entry);

  queueCell.appendChild(title);
  queueCell.appendChild(source);
  queueCell.appendChild(insight);

  const statusCell = document.createElement('div');
  statusCell.className = 'torrent-row-cell';
  const status = document.createElement('span');
  status.className = `transfer-status torrent-status ${torrentStatusClass(entry)}`;
  status.textContent = torrentStatusLabel(entry);
  statusCell.appendChild(status);

  const progressCell = document.createElement('div');
  progressCell.className = 'torrent-row-cell torrent-row-progress';

  const progressWrap = document.createElement('div');
  progressWrap.className = 'torrent-row-progress-wrap';

  const barBg = document.createElement('div');
  barBg.className = 'transfer-progress-bar-bg';
  const barFill = document.createElement('div');
  barFill.className = `transfer-progress-bar-fill ${entry.completed ? 'completed' : ''}`;
  barFill.style.width = `${clampPercent(entry.progress_pct)}%`;
  barBg.appendChild(barFill);

  const progressLabel = document.createElement('span');
  progressLabel.className = 'torrent-row-progress-label';
  progressLabel.textContent = `${clampPercent(entry.progress_pct).toFixed(1)}% · ${formatRate(entry.download_rate_bps)} · ETA ${formatEta(entry.eta_seconds)}`;

  progressWrap.appendChild(barBg);
  progressWrap.appendChild(progressLabel);
  const progressMeta = document.createElement('span');
  progressMeta.className = 'torrent-row-subline';
  progressMeta.textContent = `${formatBytes(entry.downloaded_bytes)} down · ${formatBytes(entry.uploaded_bytes)} up · ${formatBytes(entry.bytes_remaining)} left`;
  progressWrap.appendChild(progressMeta);
  progressCell.appendChild(progressWrap);

  const peersCell = document.createElement('div');
  peersCell.className = 'torrent-row-cell torrent-row-metric';
  peersCell.textContent = queueMetric(entry.peers);

  const trackersCell = document.createElement('div');
  trackersCell.className = 'torrent-row-cell torrent-row-metric';
  trackersCell.textContent = queueMetric(entry.trackers);

  const piecesCell = document.createElement('div');
  piecesCell.className = 'torrent-row-cell torrent-row-pieces';
  piecesCell.textContent = formatTorrentPieces(entry);

  const actionsCell = document.createElement('div');
  actionsCell.className = 'torrent-row-cell torrent-row-actions';

  const primary = entry.paused
    ? torrentActionButton('Resume', 'play', async (event) => {
      event.stopPropagation();
      await runTorrentAction('torrent_resume', { id: entry.id }, 'Torrent resumed.');
    })
    : torrentActionButton('Pause', 'pause', async (event) => {
      event.stopPropagation();
      await runTorrentAction('torrent_pause', { id: entry.id }, 'Torrent paused.');
    });

  const copyHash = torrentActionButton('Hash', 'copy', async (event) => {
    event.stopPropagation();
    await writeToClipboard(entry.info_hash || '', 'Info hash');
  }, 'ghost');

  const inspect = torrentActionButton('Inspect', 'info', (event) => {
    event.stopPropagation();
    torrentUi.selectedId = entry.id;
    renderTorrentList();
    renderInspector(entry);
  }, 'ghost');
  const reveal = torrentActionButton('Reveal', 'arrowUpRight', async (event) => {
    event.stopPropagation();
    await runTorrentAction('torrent_open_save_path', { id: entry.id }, '');
  }, 'ghost');
  const remove = torrentActionButton('Remove', 'trash2', async (event) => {
    event.stopPropagation();
    if (!confirmTorrentRemoval(entry, false)) return;
    await runTorrentAction('torrent_remove', { id: entry.id, deleteData: false }, 'Torrent removed from the session.');
  }, 'danger');

  actionsCell.appendChild(primary);
  actionsCell.appendChild(copyHash);
  actionsCell.appendChild(inspect);
  actionsCell.appendChild(reveal);
  actionsCell.appendChild(remove);

  row.appendChild(selectorCell);
  row.appendChild(queueCell);
  row.appendChild(statusCell);
  row.appendChild(progressCell);
  row.appendChild(peersCell);
  row.appendChild(trackersCell);
  row.appendChild(piecesCell);
  row.appendChild(actionsCell);

  return row;
}

function renderTorrentList() {
  if (!torrentUi.listEl) return;
  clearNode(torrentUi.listEl);

  const items = getFilteredItems();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'peer-item-empty';
    empty.textContent = torrentUi.items.length
      ? 'No queue entries match the current search or filter.'
      : 'No torrents loaded yet. Paste a magnet URI or local .torrent path to seed the queue.';
    torrentUi.listEl.appendChild(empty);
    renderInspector(torrentUi.items.find((entry) => entry.id === torrentUi.selectedId) || null);
    return;
  }

  if (!items.some((entry) => entry.id === torrentUi.selectedId)) {
    torrentUi.selectedId = items[0].id;
  }

  torrentUi.listEl.appendChild(renderQueueHeader());
  items.forEach((entry) => {
    torrentUi.listEl.appendChild(renderTorrentRow(entry));
  });

  renderInspector(torrentUi.items.find((entry) => entry.id === torrentUi.selectedId) || items[0]);
}

async function refreshTorrentPanel(silent = false) {
  if (torrentUi.isRefreshing) return;
  torrentUi.isRefreshing = true;
  try {
    const previousItems = new Map(torrentUi.items.map((entry) => [entry.id, entry]));
    const status = await invoke('torrent_get_status');
    torrentUi.rootPath = status.download_root || torrentUi.rootPath;
    torrentUi.items = status.torrents || [];
    syncSelectionState();
    torrentUi.items.forEach((entry) => {
      const previous = previousItems.get(entry.id);
      if (entry.completed && !previous?.completed && !torrentUi.completionNotifiedIds.has(entry.id)) {
        torrentUi.completionNotifiedIds.add(entry.id);
        addNotification?.(
          'Torrent Complete',
          `${entry.name || entry.id} finished${entry.save_path ? ` at ${entry.save_path}` : '.'}`,
          'success',
        );
      }
    });
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
  const source = normalizeSourceValue(torrentUi.sourceInput.value);
  if (!source) {
    addNotification?.('Torrent Source Required', 'Paste a magnet URI or a local .torrent path.', 'warn');
    return;
  }
  const duplicate = findDuplicateTorrent(source);
  if (duplicate) {
    addNotification?.('Duplicate Torrent Blocked', `${duplicate.name || duplicate.id} is already queued from the same source or info hash.`, 'warn');
    torrentUi.selectedId = duplicate.id;
    renderTorrentList();
    renderInspector(duplicate);
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

function attachDropzone() {
  if (!torrentUi.dropzone || !torrentUi.sourceInput) return;

  torrentUi.dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.stopPropagation();
    torrentUi.dropzone.classList.add('dragover');
  });

  torrentUi.dropzone.addEventListener('dragleave', (event) => {
    event.preventDefault();
    event.stopPropagation();
    torrentUi.dropzone.classList.remove('dragover');
  });

  torrentUi.dropzone.addEventListener('drop', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    torrentUi.dropzone.classList.remove('dragover');

    const file = event.dataTransfer?.files?.[0];
    const magnetText = event.dataTransfer?.getData('text/plain') || '';
    const droppedSource = normalizeSourceValue(file?.path || file?.name || magnetText);
    if (!droppedSource) return;

    torrentUi.sourceInput.value = droppedSource;
    const duplicate = findDuplicateTorrent(droppedSource);
    if (duplicate) {
      addNotification?.('Duplicate Torrent Blocked', `${duplicate.name || duplicate.id} is already queued from the same source or info hash.`, 'warn');
      torrentUi.selectedId = duplicate.id;
      renderTorrentList();
      renderInspector(duplicate);
      return;
    }

    if (droppedSource.toLowerCase().startsWith('magnet:') || droppedSource.toLowerCase().endsWith('.torrent')) {
      await addTorrentFromInput();
    }
  });
}

async function openTorrentRoot() {
  try {
    await invoke('torrent_open_download_root');
  } catch (err) {
    notifyError('Open Folder Failed', err);
  }
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

async function runBatchAction(entries, action) {
  for (const entry of entries) {
    // Sequential operations keep session state predictable and error reporting attributable.
    // eslint-disable-next-line no-await-in-loop
    await invoke(action.command, action.payload(entry));
  }
}

async function runSelectedBatch(action) {
  const entries = getSelectedEntries();
  if (!entries.length) {
    addNotification?.('No Selection', 'Select one or more torrents before running a batch action.', 'warn');
    return;
  }
  if (action.confirmMessage && !window.confirm(action.confirmMessage(entries))) {
    return;
  }

  try {
    await runBatchAction(entries, action);
    torrentUi.selectedIds = new Set(
      action.keepSelection ? entries.map((entry) => entry.id).filter((id) => torrentUi.selectedIds.has(id)) : [],
    );
    addNotification?.('Torrent Client', action.successMessage(entries), 'success');
    await refreshTorrentPanel(true);
  } catch (err) {
    notifyError('Torrent Batch Action Failed', err);
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
  torrentUi.dropzone = document.getElementById('torrent-dropzone');
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
  torrentUi.batchCopyEl = document.getElementById('torrent-batch-copy');
  torrentUi.selectVisibleBtn = document.getElementById('torrent-select-visible-btn');
  torrentUi.clearSelectionBtn = document.getElementById('torrent-clear-selection-btn');
  torrentUi.pauseSelectedBtn = document.getElementById('torrent-pause-selected-btn');
  torrentUi.resumeSelectedBtn = document.getElementById('torrent-resume-selected-btn');
  torrentUi.removeSelectedBtn = document.getElementById('torrent-remove-selected-btn');

  if (!torrentUi.addBtn || !torrentUi.refreshBtn || !torrentUi.sourceInput || !torrentUi.listEl) {
    return;
  }

  torrentUi.addBtn.addEventListener('click', addTorrentFromInput);
  torrentUi.refreshBtn.addEventListener('click', () => refreshTorrentPanel());
  torrentUi.pauseAllBtn?.addEventListener('click', () => runTorrentAction('torrent_pause_all', {}, 'All torrents paused.'));
  torrentUi.resumeAllBtn?.addEventListener('click', () => runTorrentAction('torrent_resume_all', {}, 'All torrents resumed.'));
  torrentUi.openRootBtn?.addEventListener('click', openTorrentRoot);
  torrentUi.selectVisibleBtn?.addEventListener('click', () => {
    getFilteredItems().forEach((entry) => torrentUi.selectedIds.add(entry.id));
    renderSummary();
    renderTorrentList();
  });
  torrentUi.clearSelectionBtn?.addEventListener('click', () => {
    torrentUi.selectedIds.clear();
    renderSummary();
    renderTorrentList();
  });
  torrentUi.pauseSelectedBtn?.addEventListener('click', () =>
    runSelectedBatch({
      command: 'torrent_pause',
      payload: (entry) => ({ id: entry.id }),
      successMessage: (entries) => `${entries.length} torrent${entries.length === 1 ? '' : 's'} paused.`,
      keepSelection: true,
    })
  );
  torrentUi.resumeSelectedBtn?.addEventListener('click', () =>
    runSelectedBatch({
      command: 'torrent_resume',
      payload: (entry) => ({ id: entry.id }),
      successMessage: (entries) => `${entries.length} torrent${entries.length === 1 ? '' : 's'} resumed.`,
      keepSelection: true,
    })
  );
  torrentUi.removeSelectedBtn?.addEventListener('click', () =>
    runSelectedBatch({
      command: 'torrent_remove',
      payload: (entry) => ({ id: entry.id, deleteData: false }),
      confirmMessage: (entries) => `Do you want to remove ${entries.length} selected torrent${entries.length === 1 ? '' : 's'} from the session?`,
      successMessage: (entries) => `${entries.length} torrent${entries.length === 1 ? '' : 's'} removed from the session.`,
      keepSelection: false,
    })
  );
  torrentUi.sourceInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTorrentFromInput();
    }
  });
  torrentUi.sourceInput.addEventListener('paste', () => {
    window.setTimeout(() => {
      if (!torrentUi.sourceInput) return;
      const source = normalizeSourceValue(torrentUi.sourceInput.value);
      if (!source.toLowerCase().startsWith('magnet:')) return;
      torrentUi.sourceInput.value = source;
      const duplicate = findDuplicateTorrent(source);
      if (duplicate) {
        addNotification?.('Duplicate Torrent Detected', `${duplicate.name || duplicate.id} already carries that magnet or info hash.`, 'warn');
      }
    }, 0);
  });
  attachDropzone();

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
