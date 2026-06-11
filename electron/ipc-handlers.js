/**
 * IPC Handlers Registration
 * Maps all allowed IPC channels to their respective service layer and sidecar actions.
 */
'use strict';

const { ipcMain } = require('electron');
const { IPC } = require('./ipc-registry');
const { ipcGuard, createError } = require('./ipc-guards');

// Helper to make fetch calls to the local Rust sidecar server
async function callSidecar(bridgePort, command, args = {}) {
  const url = `http://127.0.0.1:${bridgePort}/api/${command}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown bridge error');
      throw createError('SIDECAR_ERROR', `Bridge Server Error: ${errorText}`, 'api');
    }
    
    return await res.json();
  } catch (err) {
    if (err.code === 'SIDECAR_ERROR') throw err;
    throw createError('SIDECAR_OFFLINE', `Cannot connect to Bridge Server: ${err.message}`, 'network');
  }
}

function registerIpcHandlers(mainWindow, lspManager, connectionRegistry, healthProbeRunner, bridgePort, isDev) {
  const guard = (channel, schema, handler) => {
    ipcMain.handle(channel, ipcGuard(channel, schema, handler, isDev));
  };

  // ── LSP Handlers ───────────────────────────────────────────────────

  guard(IPC.LSP_START_SERVER, {
    language: { type: 'string', required: true },
    command: { type: 'string', required: true },
    args: { type: 'array', required: false }
  }, async (payload) => {
    return lspManager.startServer(payload.language, payload.command, payload.args || []);
  });

  guard(IPC.LSP_STOP_SERVER, {
    language: { type: 'string', required: true }
  }, async (payload) => {
    return lspManager.stopServer(payload.language);
  });

  guard(IPC.LSP_OPEN_DOCUMENT, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true },
    content: { type: 'string', required: true }
  }, async (payload) => {
    lspManager.openDocument(payload.language, payload.uri, payload.content);
    return { success: true };
  });

  guard(IPC.LSP_CHANGE_DOCUMENT, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true },
    content: { type: 'string', required: true },
    version: { type: 'number', required: true }
  }, async (payload) => {
    lspManager.changeDocument(payload.language, payload.uri, payload.content, payload.version);
    return { success: true };
  });

  guard(IPC.LSP_CLOSE_DOCUMENT, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true }
  }, async (payload) => {
    lspManager.closeDocument(payload.language, payload.uri);
    return { success: true };
  });

  guard(IPC.LSP_COMPLETION, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true },
    line: { type: 'number', required: true },
    character: { type: 'number', required: true }
  }, async (payload) => {
    return lspManager.completion(payload.language, payload.uri, payload.line, payload.character);
  });

  guard(IPC.LSP_HOVER, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true },
    line: { type: 'number', required: true },
    character: { type: 'number', required: true }
  }, async (payload) => {
    return lspManager.hover(payload.language, payload.uri, payload.line, payload.character);
  });

  guard(IPC.LSP_DEFINITION, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true },
    line: { type: 'number', required: true },
    character: { type: 'number', required: true }
  }, async (payload) => {
    return lspManager.definition(payload.language, payload.uri, payload.line, payload.character);
  });

  guard(IPC.LSP_FORMAT, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true }
  }, async (payload) => {
    return lspManager.format(payload.language, payload.uri);
  });

  // ── Models Handlers ────────────────────────────────────────────────

  guard(IPC.MODELS_LIST, {}, async () => {
    const list = await callSidecar(bridgePort, 'ollama_list_models');
    return list;
  });

  guard(IPC.MODELS_STATUS, {}, async () => {
    const health = await callSidecar(bridgePort, 'get_system_health');
    return health;
  });

  guard(IPC.MODELS_RUN_PROMPT, {
    prompt: { type: 'string', required: true },
    provider: { type: 'string', required: false },
    model: { type: 'string', required: false }
  }, async (payload) => {
    return callSidecar(bridgePort, 'send_command', {
      message: payload.prompt,
      provider: payload.provider,
      model: payload.model
    });
  });

  // ── Sessions Handlers ──────────────────────────────────────────────

  guard(IPC.SESSIONS_CREATE, {}, async () => {
    return callSidecar(bridgePort, 'load_latest_session');
  });

  guard(IPC.SESSIONS_LIST, {}, async () => {
    return callSidecar(bridgePort, 'list_sessions');
  });

  guard(IPC.SESSIONS_SAVE, {
    payload: { type: 'object', required: true }
  }, async (payload) => {
    return callSidecar(bridgePort, 'save_session', payload);
  });

  // ── Memory Handlers ────────────────────────────────────────────────

  guard(IPC.MEMORY_SEARCH, {
    query: { type: 'string', required: true }
  }, async (payload) => {
    return callSidecar(bridgePort, 'memory_list', { limit: 10, offset: 0 });
  });

  guard(IPC.MEMORY_WRITE, {
    content: { type: 'string', required: true }
  }, async (payload) => {
    return callSidecar(bridgePort, 'memory_add_fact', { content: payload.content });
  });

  // ── Diagnostics Handlers ───────────────────────────────────────────

  guard(IPC.DIAGNOSTICS_CONNECTION_MATRIX, {}, async () => {
    return connectionRegistry.getConnectionMatrix();
  });

  guard(IPC.DIAGNOSTICS_RUN_PROBE, {
    id: { type: 'string', required: false }
  }, async (payload) => {
    if (payload.id) {
      await healthProbeRunner.runProbe(payload.id);
    } else {
      await healthProbeRunner.runAllProbes();
    }
    return connectionRegistry.getConnectionMatrix();
  });

  // ── Settings Handlers ──────────────────────────────────────────────

  guard(IPC.SETTINGS_GET, {
    key: { type: 'string', required: true }
  }, async (payload) => {
    const config = await callSidecar(bridgePort, 'get_config');
    // Extract property recursively
    const parts = payload.key.split('.');
    let val = config;
    for (const part of parts) {
      if (val && typeof val === 'object') {
        val = val[part];
      } else {
        return null;
      }
    }
    return val;
  });

  guard(IPC.SETTINGS_SET, {
    key: { type: 'string', required: true },
    value: { required: true }
  }, async (payload) => {
    if (payload.key === 'llm.provider') {
      await callSidecar(bridgePort, 'set_provider', { provider: payload.value });
      return { success: true };
    }
    if (payload.key === 'llm.model') {
      await callSidecar(bridgePort, 'set_model', { model: payload.value });
      return { success: true };
    }
    if (payload.key === 'llm.gemini_key') {
      await callSidecar(bridgePort, 'set_gemini_api_key', { key: payload.value });
      return { success: true };
    }
    return { success: false, error: `Key "${payload.key}" is not configurable via this channel.` };
  });
}

module.exports = {
  registerIpcHandlers
};
