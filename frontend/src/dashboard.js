import { invoke } from './neurobridge.js';

async function _dashLoad() {
    const container = document.getElementById('view-dashboard');
    if (!container) return;

    const sessionsEl = document.getElementById('dash-sessions');
    const messagesEl = document.getElementById('dash-messages');
    const memoryEl = document.getElementById('dash-memory');
    const pinnedEl = document.getElementById('dash-pinned');
    const projectsEl = document.getElementById('dash-projects');
    const packsEl = document.getElementById('dash-packs');
    const providerEl = document.getElementById('dash-provider');
    const modelEl = document.getElementById('dash-model');
    const dbSizeEl = document.getElementById('dash-db-size');
    const recentListEl = document.getElementById('dash-recent-sessions');

    if (sessionsEl) sessionsEl.textContent = '…';
    if (messagesEl) messagesEl.textContent = '…';
    if (memoryEl) memoryEl.textContent = '…';

    try {
        const stats = await invoke('get_dashboard_stats');
        if (sessionsEl) sessionsEl.textContent = String(stats.sessions_total ?? 0);
        if (messagesEl) messagesEl.textContent = String(stats.messages_total ?? 0);
        if (memoryEl) memoryEl.textContent = String(stats.memory_total ?? 0);
        if (pinnedEl) pinnedEl.textContent = String(stats.memory_pinned ?? 0);
        if (projectsEl) projectsEl.textContent = String(stats.projects_total ?? 0);
        if (packsEl) packsEl.textContent = String(stats.packs_total ?? 0);
        if (providerEl) providerEl.textContent = stats.provider || '—';
        if (modelEl) modelEl.textContent = stats.model || '—';
        if (dbSizeEl) {
            const bytes = stats.db_size_bytes ?? 0;
            dbSizeEl.textContent = bytes > 1024 * 1024
                ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                : `${(bytes / 1024).toFixed(1)} KB`;
        }

        const pb = stats.privacy_breakdown || {};
        const pStd = document.getElementById('dash-privacy-standard');
        const pPriv = document.getElementById('dash-privacy-private');
        const pSens = document.getElementById('dash-privacy-sensitive');
        const pSeal = document.getElementById('dash-privacy-sealed');
        if (pStd) pStd.textContent = String(pb.standard ?? 0);
        if (pPriv) pPriv.textContent = String(pb.private ?? 0);
        if (pSens) pSens.textContent = String(pb.sensitive ?? 0);
        if (pSeal) pSeal.textContent = String(pb.sealed ?? 0);

        if (recentListEl) {
            const sessions = stats.recent_sessions || [];
            if (sessions.length === 0) {
                recentListEl.innerHTML = '<div class="dashboard-recent-item"><span class="dashboard-recent-name">No sessions yet</span></div>';
            } else {
                recentListEl.innerHTML = sessions.map(s => `
                    <div class="dashboard-recent-item">
                        <span class="dashboard-recent-name">${_dashEscHtml(s.name || s.id)}</span>
                        <span class="dashboard-recent-meta">${s.message_count} msgs · ${s.created_at?.slice(0,10) || ''}</span>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.error('get_dashboard_stats error', e);
        if (recentListEl) recentListEl.innerHTML = `
            <div class="view-empty" style="padding:12px 0">
                <div class="view-empty-icon">⚠</div>
                <div class="view-empty-sub">Stats unavailable — is the bridge running?</div>
            </div>`;
        ['dash-sessions','dash-messages','dash-memory','dash-pinned','dash-projects','dash-packs']
            .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
    }
}

function _dashEscHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function initDashboardView() {
    const refreshBtn = document.getElementById('dashboard-refresh-btn');
    if (refreshBtn) refreshBtn.onclick = () => _dashLoad();

    document.querySelector('[data-view="dashboard"]')?.addEventListener('click', () => {
        setTimeout(() => _dashLoad(), 50);
    });
}
