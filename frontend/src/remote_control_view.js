// remote_control_view.js – Remote Control View
// Extracted ES module.
import { invoke } from './neurobridge.js';
import { listen } from './neurobridge.js';
import QRCode from 'qrcode';
import { state } from './state.js';

// ── Utilities ─────────────────────────────────────────────────────────────────

function _rcEl(id) { return document.getElementById(id); }

function _rcLog(msg, type, rc) {
    const t = type || 'info';
    const log = _rcEl('remote-log');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className = 'remote-log-entry remote-log-' + t;
    const ts = new Date().toLocaleTimeString();
    entry.textContent = '[' + ts + '] ' + msg;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function _rcUpdateTtlDisplay(rc) {
    const val = _rcEl('remote-ttl-value');
    if (!val) return;
    const mins = Math.floor(rc.ttlSecondsLeft / 60);
    const secs = rc.ttlSecondsLeft % 60;
    val.textContent = mins + ':' + String(secs).padStart(2, '0');
    val.style.color = rc.ttlSecondsLeft < 60 ? 'var(--error-color, #ff5f5f)' : '';
}

// ── Server UI states ───────────────────────────────────────────────────────────

function _rcApplyOnlineState(info, rc) {
    const startBtn = _rcEl('remote-start-btn');
    const stopBtn  = _rcEl('remote-stop-btn');
    const qrSec    = _rcEl('remote-qr-section');
    const stats    = _rcEl('remote-stats-row');
    const badge    = _rcEl('remote-status-badge');
    const dot      = _rcEl('remote-status-dot');
    const statusTx = _rcEl('remote-status-text');
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn)  stopBtn.style.display  = '';
    if (qrSec)    qrSec.style.display    = '';
    if (stats)    stats.style.display    = '';
    if (badge)    badge.classList.add('remote-status-online');
    if (dot)      dot.classList.add('remote-dot-online');
    if (statusTx) statusTx.textContent   = 'Online';
    const urlEl = _rcEl('remote-url-text');
    const pinEl = _rcEl('remote-pin-display');
    const ipEl  = _rcEl('remote-ip-display');
    const prtEl = _rcEl('remote-port-display');
    if (urlEl) urlEl.textContent = info.url;
    if (pinEl) pinEl.textContent = info.pin;
    if (ipEl)  ipEl.textContent  = info.ip;
    if (prtEl) prtEl.textContent = info.port;
    _rcGenerateQR(info.url);
    clearInterval(rc.ttlTimer);
    rc.ttlSecondsLeft = info.ttl_seconds_remaining != null ? info.ttl_seconds_remaining : 900;
    const ttlRow = _rcEl('remote-ttl-row');
    if (ttlRow) ttlRow.style.display = '';
    _rcUpdateTtlDisplay(rc);
    rc.ttlTimer = setInterval(function() {
        rc.ttlSecondsLeft = Math.max(0, rc.ttlSecondsLeft - 1);
        _rcUpdateTtlDisplay(rc);
        if (rc.ttlSecondsLeft === 0) {
            clearInterval(rc.ttlTimer);
            _rcLog('Session token expired. Restart the server to refresh.', 'warn', rc);
        }
    }, 1000);
}

function _rcApplyOfflineState(rc) {
    const startBtn = _rcEl('remote-start-btn');
    const stopBtn  = _rcEl('remote-stop-btn');
    const qrSec    = _rcEl('remote-qr-section');
    const stats    = _rcEl('remote-stats-row');
    const badge    = _rcEl('remote-status-badge');
    const dot      = _rcEl('remote-status-dot');
    const statusTx = _rcEl('remote-status-text');
    if (startBtn) startBtn.style.display = '';
    if (stopBtn)  stopBtn.style.display  = 'none';
    if (qrSec)    qrSec.style.display    = 'none';
    if (stats)    stats.style.display    = 'none';
    const ttlRowOff = _rcEl('remote-ttl-row');
    if (ttlRowOff) ttlRowOff.style.display = 'none';
    if (badge)    badge.classList.remove('remote-status-online');
    if (dot)      dot.classList.remove('remote-dot-online');
    if (statusTx) statusTx.textContent   = 'Offline';
    clearInterval(rc.ttlTimer);
}

function _rcSetServerUI(running, info, rc) {
    rc.remoteRunning = running;
    if (running && info) _rcApplyOnlineState(info, rc);
    else _rcApplyOfflineState(rc);
}

// ── QR code ───────────────────────────────────────────────────────────────────

async function _rcGenerateQR(url) {
    const wrap = _rcEl('remote-qr-canvas');
    if (!wrap) return;
    wrap.innerHTML = '';
    try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, url, {
            width: 180, margin: 1,
            color: { dark: '#00f0ff', light: '#06080e' }
        });
        wrap.appendChild(canvas);
    } catch (_) {
        wrap.innerHTML = '<div class="remote-qr-fallback">' + url + '</div>';
    }
}

// ── Server start / stop ───────────────────────────────────────────────────────

async function _rcStartServer(rc) {
    const portInput = _rcEl('remote-port-input');
    const port = parseInt(portInput ? portInput.value : '9090', 10) || 9090;
    _rcLog('Starting server on port ' + port + '...', 'info', rc);
    try {
        const info = await invoke('start_remote_server', { port: port, execToken: state.execToken });
        _rcSetServerUI(true, info, rc);
        _rcLog('Server started: ' + info.url, 'success', rc);
        _rcLog('PIN: ' + info.pin, 'success', rc);
    } catch (err) {
        _rcLog('Failed to start: ' + err, 'error', rc);
    }
}

async function _rcStopServer(rc) {
    _rcLog('Stopping server...', 'info', rc);
    try {
        await invoke('stop_remote_server', { execToken: state.execToken });
        _rcSetServerUI(false, null, rc);
        _rcLog('Server stopped.', 'warn', rc);
    } catch (err) {
        _rcLog('Stop error: ' + err, 'error', rc);
    }
}

// ── Button wiring ─────────────────────────────────────────────────────────────

function _rcWireButtons(rc) {
    const startBtn = _rcEl('remote-start-btn');
    const stopBtn  = _rcEl('remote-stop-btn');
    const copyBtn  = _rcEl('remote-copy-url-btn');
    if (startBtn) startBtn.addEventListener('click', () => _rcStartServer(rc));
    if (stopBtn)  stopBtn.addEventListener('click',  () => _rcStopServer(rc));
    if (copyBtn) copyBtn.addEventListener('click', function() {
        const urlEl = _rcEl('remote-url-text');
        const url = urlEl && urlEl.textContent;
        if (url) navigator.clipboard.writeText(url).then(function() { _rcLog('URL copied.', 'info', rc); });
    });
}

// ── Remote event listeners ────────────────────────────────────────────────────

function _rcWireClientEvents(rc) {
    listen('remote_client_connected', function(ev) {
        const count = ev.payload;
        const cel = _rcEl('remote-clients-count');
        if (cel) cel.textContent = count;
        _rcLog('Client connected (' + count + ' total)', 'success', rc);
    });
    listen('remote_client_disconnected', function(ev) {
        const count = ev.payload;
        const cel = _rcEl('remote-clients-count');
        if (cel) cel.textContent = count;
        _rcLog('Client disconnected (' + count + ' remaining)', 'warn', rc);
    });
    listen('remote_chat', function(ev) {
        const text = ev.payload;
        if (!text || !text.trim()) return;
        _rcLog('Remote chat: ' + text.slice(0, 60), 'info', rc);
        const chatInput = document.getElementById('chat-input') || document.getElementById('user-input');
        if (chatInput) {
            chatInput.value = text;
            const sendBtn = document.getElementById('send-btn') || document.getElementById('chat-send-btn');
            if (sendBtn) sendBtn.click();
        }
    });
    listen('remote_pty', function(ev) {
        try {
            const msg  = JSON.parse(ev.payload);
            const id   = msg.id   || 'main_pty_session';
            const data = msg.data;
            if (data) invoke('pty_write', { id: id, data: data }).catch(function() {});
        } catch (_) {}
    });
    listen('remote_navigate', function(ev) {
        const view = ev.payload;
        if (!view) return;
        _rcLog('Remote navigate to: ' + view, 'info', rc);
        const tab = document.querySelector('.nav-tab[data-view="' + view + '"]');
        if (tab) tab.click();
    });
}

function _rcWireControlEvents(rc) {
    listen('remote_set_persona', function(ev) {
        const name = ev.payload;
        if (!name) return;
        invoke('set_persona', { name: name }).catch(function() {});
    });
    listen('remote_persona_cycle', function(ev) {
        const dir   = ev.payload;
        const items = document.querySelectorAll('.persona-item');
        if (!items.length) return;
        const arr     = Array.from(items);
        const current = arr.findIndex(function(i) { return i.classList.contains('active'); });
        const next = ((current < 0 ? 0 : current) + dir + items.length) % items.length;
        items[next].click();
    });
    listen('remote_theme_cycle', function() {
        const btn = document.getElementById('theme-cycle-btn') ||
                    document.querySelector('[data-action="cycle-theme"]');
        if (btn) btn.click();
    });
    listen('remote_open_settings', function() {
        const btn = document.getElementById('settings-btn') ||
                    document.querySelector('.settings-toggle-btn');
        if (btn) btn.click();
    });
    listen('remote_new_session',        function() { invoke('new_session').catch(function() {}); });
    listen('remote_cancel_generation',  function() { invoke('cancel_generation').catch(function() {}); });
    listen('remote_mute_toggle', function() {
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) muteBtn.click();
    });
    listen('remote_switch_agent', function(ev) {
        const id = ev.payload;
        if (!id) return;
        invoke('switch_agent', { id: id }).catch(function() {});
    });
    listen('remote_approval_response', function(ev) {
        try {
            const msg = typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload;
            const reqId = msg.request_id;
            const approved = msg.approved;
            _rcLog('Approval ' + (approved ? 'GRANTED' : 'DENIED') + ' for request ' + reqId, approved ? 'success' : 'warn', rc);
            invoke('resolve_agent_approval', { request_id: reqId }).catch(function() {});
            if (rc.pendingApprovalCallbacks[reqId]) {
                rc.pendingApprovalCallbacks[reqId](approved);
                delete rc.pendingApprovalCallbacks[reqId];
            }
        } catch (_) {}
    });
}

// ── Mobile approval queue ─────────────────────────────────────────────────────

function _rcQueueApproval(reqId, description, rc) {
    return new Promise(function(resolve) {
        rc.pendingApprovalCallbacks[reqId] = resolve;
        setTimeout(function() {
            if (rc.pendingApprovalCallbacks[reqId]) {
                delete rc.pendingApprovalCallbacks[reqId];
                invoke('resolve_agent_approval', { request_id: reqId }).catch(function() {});
                _rcLog('Approval request timed out: ' + reqId, 'error', rc);
                resolve(false);
            }
        }, 300000);
    });
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function initRemoteControl() {
    const rc = {
        remoteRunning: false,
        ttlTimer: null,
        ttlSecondsLeft: 0,
        pendingApprovalCallbacks: {},
    };

    _rcWireClientEvents(rc);
    _rcWireControlEvents(rc);

    window.requestMobileApproval = function(actionType, description) {
        return invoke('queue_agent_approval_request', {
            action_type: actionType,
            description: description,
        }).then(function(res) {
            const reqId = res && res.request_id;
            if (!reqId) return Promise.resolve(false);
            _rcLog('Awaiting mobile approval for: ' + description, 'warn', rc);
            return _rcQueueApproval(reqId, description, rc);
        });
    };

    document.addEventListener('click', async function(e) {
        const tab = e.target.closest('.nav-tab[data-view="remote"]');
        if (!tab) return;
        try {
            const info = await invoke('get_remote_server_info', { execToken: state.execToken });
            _rcSetServerUI(info.running, info.running ? info : null, rc);
        } catch (_) {}
    });

    setTimeout(() => _rcWireButtons(rc), 500);
}
