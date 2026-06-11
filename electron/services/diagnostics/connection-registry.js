/**
 * Connection Registry
 * Manages the connection health matrix state, tracking traffic metrics and evidence logs.
 */
'use strict';

class ConnectionRegistry {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.matrix = new Map();
    this._initializeMatrix();
  }

  _initializeMatrix() {
    const defaultConnections = [
      { id: 'ipc_roundtrip', label: 'Electron IPC Roundtrip', category: 'ipc' },
      { id: 'sidecar_api', label: 'Rust Sidecar HTTP API', category: 'api' },
      { id: 'ollama_api', label: 'Ollama Model Provider', category: 'api' },
      { id: 'gemini_api', label: 'Gemini LLM Provider', category: 'api' },
      { id: 'lsp_typescript', label: 'TypeScript Intellisense (LSP)', category: 'lsp' },
      { id: 'lsp_python', label: 'Python Intellisense (LSP)', category: 'lsp' },
      { id: 'sqlite_storage', label: 'SQLite Chat Database', category: 'storage' },
      { id: 'plugin_lua', label: 'Hermes Lua Plugin Sandbox', category: 'plugin' },
      { id: 'steamdeck_system', label: 'Steam Deck System Telemetry', category: 'system' }
    ];

    for (const conn of defaultConnections) {
      this.matrix.set(conn.id, {
        id: conn.id,
        label: conn.label,
        category: conn.category,
        state: 'unknown',
        lastProbeAt: null,
        lastSuccessAt: null,
        lastFailureAt: null,
        latencyMs: null,
        bytesSent: 0,
        bytesReceived: 0,
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        activeSubscriptions: 0,
        evidence: []
      });
    }
  }

  /**
   * Returns the current Connection Matrix array.
   */
  getConnectionMatrix() {
    return Array.from(this.matrix.values());
  }

  /**
   * Updates health status, metrics, and appends an evidence log entry.
   */
  updateHealth(id, state, metrics = {}, evidenceEntry = null) {
    const conn = this.matrix.get(id);
    if (!conn) return;

    conn.state = state;
    conn.lastProbeAt = new Date().toISOString();
    
    if (state === 'connected' || state === 'passed') {
      conn.lastSuccessAt = conn.lastProbeAt;
      conn.successCount++;
    } else if (state === 'error' || state === 'offline') {
      conn.lastFailureAt = conn.lastProbeAt;
      conn.failureCount++;
    }

    conn.requestCount++;

    if (metrics.latencyMs !== undefined) conn.latencyMs = metrics.latencyMs;
    if (metrics.bytesSent !== undefined) conn.bytesSent += metrics.bytesSent;
    if (metrics.bytesReceived !== undefined) conn.bytesReceived += metrics.bytesReceived;
    if (metrics.lastError) conn.lastError = metrics.lastError;

    if (evidenceEntry) {
      const fullEvidence = {
        timestamp: new Date().toISOString(),
        requestId: evidenceEntry.requestId || `req-${Date.now()}`,
        probeType: evidenceEntry.probeType || 'health',
        realTransportUsed: evidenceEntry.realTransportUsed !== false,
        source: evidenceEntry.source || 'main',
        target: evidenceEntry.target || id,
        durationMs: metrics.latencyMs || 0,
        bytesSent: metrics.bytesSent || 0,
        bytesReceived: metrics.bytesReceived || 0,
        status: (state === 'connected' || state === 'passed') ? 'passed' : 'failed',
        summary: evidenceEntry.summary || ''
      };

      conn.evidence.unshift(fullEvidence);
      
      // Cap evidence log at 20 entries to prevent memory leak
      if (conn.evidence.length > 20) {
        conn.evidence.pop();
      }
    }

    this._broadcastChange(id, conn);
  }

  _broadcastChange(id, conn) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('diagnostics-connection-changed', { id, connection: conn });
    }
  }
}

module.exports = ConnectionRegistry;
