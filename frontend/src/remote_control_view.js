// remote_control_view.js — Remote Control View
// Extracted ES module.
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';


export function initRemoteControl() {
    var remoteRunning = false;

    function el(id) { return document.getElementById(id); }

    function remoteLog(msg, type) {
        type = type || 'info';
        var log = el('remote-log');
        if (!log) return;
        var entry = document.createElement('div');
        entry.className = 'remote-log-entry remote-log-' + type;
        var ts = new Date().toLocaleTimeString();
        entry.textContent = '[' + ts + '] ' + msg;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    function setServerUI(running, info) {
        remoteRunning = running;
        var startBtn = el('remote-start-btn');
        var stopBtn  = el('remote-stop-btn');
        var qrSec    = el('remote-qr-section');
        var stats    = el('remote-stats-row');
        var badge    = el('remote-status-badge');
        var dot      = el('remote-status-dot');
        var statusTx = el('remote-status-text');
        if (running && info) {
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn)  stopBtn.style.display  = '';
            if (qrSec)    qrSec.style.display    = '';
            if (stats)    stats.style.display    = '';
            if (badge)    badge.classList.add('remote-status-online');
            if (dot)      dot.classList.add('remote-dot-online');
            if (statusTx) statusTx.textContent   = 'Online';
            var urlEl = el('remote-url-text');
            var pinEl = el('remote-pin-display');
            var ipEl  = el('remote-ip-display');
            var prtEl = el('remote-port-display');
            if (urlEl) urlEl.textContent = info.url;
            if (pinEl) pinEl.textContent = info.pin;
            if (ipEl)  ipEl.textContent  = info.ip;
            if (prtEl) prtEl.textContent = info.port;
            generateQR(info.url);
        } else {
            if (startBtn) startBtn.style.display = '';
            if (stopBtn)  stopBtn.style.display  = 'none';
            if (qrSec)    qrSec.style.display    = 'none';
            if (stats)    stats.style.display    = 'none';
            if (badge)    badge.classList.remove('remote-status-online');
            if (dot)      dot.classList.remove('remote-dot-online');
            if (statusTx) statusTx.textContent   = 'Offline';
        }
    }

    function generateQR(url) {
        var wrap = el('remote-qr-canvas');
        if (!wrap) return;
        wrap.innerHTML = '';
        if (window.QRCode) {
            new window.QRCode(wrap, { text: url, width: 180, height: 180, colorDark: '#00f0ff', colorLight: '#06080e' });
            return;
        }
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.onload = function() {
            if (window.QRCode) {
                new window.QRCode(wrap, { text: url, width: 180, height: 180, colorDark: '#00f0ff', colorLight: '#06080e' });
            }
        };
        script.onerror = function() {
            wrap.innerHTML = '<div class="remote-qr-fallback">' + url + '</div>';
        };
        document.head.appendChild(script);
    }

    async function startServer() {
        var portInput = el('remote-port-input');
        var port = parseInt(portInput ? portInput.value : '9090', 10) || 9090;
        remoteLog('Starting server on port ' + port + '...');
        try {
            var info = await invoke('start_remote_server', { port: port });
            setServerUI(true, info);
            remoteLog('Server started: ' + info.url, 'success');
            remoteLog('PIN: ' + info.pin, 'success');
        } catch (err) {
            remoteLog('Failed to start: ' + err, 'error');
        }
    }

    async function stopServer() {
        remoteLog('Stopping server...');
        try {
            await invoke('stop_remote_server');
            setServerUI(false, null);
            remoteLog('Server stopped.', 'warn');
        } catch (err) {
            remoteLog('Stop error: ' + err, 'error');
        }
    }

    function wireButtons() {
        var startBtn = el('remote-start-btn');
        var stopBtn  = el('remote-stop-btn');
        var copyBtn  = el('remote-copy-url-btn');
        if (startBtn) startBtn.addEventListener('click', startServer);
        if (stopBtn)  stopBtn.addEventListener('click', stopServer);
        if (copyBtn) copyBtn.addEventListener('click', function() {
            var urlEl = el('remote-url-text');
            var url = urlEl && urlEl.textContent;
            if (url) navigator.clipboard.writeText(url).then(function() { remoteLog('URL copied.'); });
        });
    }

    listen('remote_client_connected', function(ev) {
        var count = ev.payload;
        var cel = el('remote-clients-count');
        if (cel) cel.textContent = count;
        remoteLog('Client connected (' + count + ' total)', 'success');
    });

    listen('remote_client_disconnected', function(ev) {
        var count = ev.payload;
        var cel = el('remote-clients-count');
        if (cel) cel.textContent = count;
        remoteLog('Client disconnected (' + count + ' remaining)', 'warn');
    });

    listen('remote_chat', function(ev) {
        var text = ev.payload;
        if (!text || !text.trim()) return;
        remoteLog('Remote chat: ' + text.slice(0, 60));
        var chatInput = document.getElementById('chat-input') || document.getElementById('user-input');
        if (chatInput) {
            chatInput.value = text;
            var sendBtn = document.getElementById('send-btn') || document.getElementById('chat-send-btn');
            if (sendBtn) sendBtn.click();
        }
    });

    listen('remote_pty', function(ev) {
        try {
            var msg  = JSON.parse(ev.payload);
            var id   = msg.id   || 'main_pty_session';
            var data = msg.data;
            if (data) invoke('pty_write', { id: id, data: data }).catch(function() {});
        } catch (_) {}
    });

    listen('remote_navigate', function(ev) {
        var view = ev.payload;
        if (!view) return;
        remoteLog('Remote navigate to: ' + view);
        var tab = document.querySelector('.nav-tab[data-view="' + view + '"]');
        if (tab) tab.click();
    });

    listen('remote_set_persona', function(ev) {
        var name = ev.payload;
        if (!name) return;
        invoke('set_persona', { name: name }).catch(function() {});
    });

    listen('remote_persona_cycle', function(ev) {
        var dir   = ev.payload;
        var items = document.querySelectorAll('.persona-item');
        if (!items.length) return;
        var arr     = Array.from(items);
        var current = arr.findIndex(function(i) { return i.classList.contains('active'); });
        if (current < 0) current = 0;
        var next = (current + dir + items.length) % items.length;
        items[next].click();
    });

    listen('remote_theme_cycle', function() {
        var btn = document.getElementById('theme-cycle-btn') ||
                  document.querySelector('[data-action="cycle-theme"]');
        if (btn) btn.click();
    });

    listen('remote_open_settings', function() {
        var btn = document.getElementById('settings-btn') ||
                  document.querySelector('.settings-toggle-btn');
        if (btn) btn.click();
    });

    listen('remote_new_session', function() {
        invoke('new_session').catch(function() {});
    });

    listen('remote_cancel_generation', function() {
        invoke('cancel_generation').catch(function() {});
    });

    listen('remote_mute_toggle', function() {
        var muteBtn = document.getElementById('mute-btn');
        if (muteBtn) muteBtn.click();
    });

    listen('remote_switch_agent', function(ev) {
        var id = ev.payload;
        if (!id) return;
        invoke('switch_agent', { id: id }).catch(function() {});
    });

    document.addEventListener('click', async function(e) {
        var tab = e.target.closest('.nav-tab[data-view="remote"]');
        if (!tab) return;
        try {
            var info = await invoke('get_remote_server_info');
            setServerUI(info.running, info.running ? info : null);
        } catch (_) {}
    });

    setTimeout(wireButtons, 500);
}
