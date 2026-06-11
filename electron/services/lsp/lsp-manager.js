/**
 * LSP Manager
 * Orchestrates the spawning, initialization, document syncing, and querying of language servers.
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const LspTransport = require('./lsp-transport');

class LspManager {
  constructor(mainWindow, isDev = false) {
    this.mainWindow = mainWindow;
    this.isDev = isDev;
    this.servers = new Map(); // language -> { process, transport, status, capabilities, diagnostics: Map(uri -> diagnostics) }
    this.nextRequestId = 1;
    this.workspaceRoot = null;
  }

  /**
   * Set workspace root folder for language servers.
   */
  setWorkspaceRoot(dirPath) {
    if (dirPath && fs.existsSync(dirPath)) {
      this.workspaceRoot = path.resolve(dirPath);
      console.log(`[LSP Manager] Workspace root set to: ${this.workspaceRoot}`);
    }
  }

  /**
   * Spawns and initializes a language server.
   */
  async startServer(language, command, args = []) {
    if (this.servers.has(language)) {
      await this.stopServer(language);
    }

    console.log(`[LSP Manager] Starting server for '${language}' using command '${command}' with args:`, args);

    // Resolve workspace root
    const rootPath = this.workspaceRoot || process.cwd();
    const rootUri = `file:///${rootPath.replace(/\\/g, '/')}`;

    try {
      const proc = spawn(command, args, {
        cwd: rootPath,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      proc.on('error', (err) => {
        console.error(`[LSP Server Error] Failed to start '${command}':`, err);
        this._updateStatus(language, 'error');
      });

      proc.stderr.on('data', (data) => {
        console.error(`[LSP Server stderr] [${language}]:`, data.toString('utf8').trim());
      });

      const transport = new LspTransport(proc.stdout, proc.stdin, this.isDev);
      
      const serverState = {
        process: proc,
        transport,
        status: 'starting',
        capabilities: null,
        diagnostics: new Map(),
        bytesSent: 0,
        bytesReceived: 0
      };
      
      this.servers.set(language, serverState);

      // Register notifications
      transport.on('notification', (method, params) => {
        this._handleNotification(language, method, params);
      });

      transport.on('close', () => {
        console.log(`[LSP Manager] Server for '${language}' closed stdio streams`);
        this._handleExit(language);
      });

      // Handshake
      const initId = this.nextRequestId++;
      const initParams = {
        processId: process.pid,
        rootUri,
        capabilities: {
          textDocument: {
            synchronization: {
              dynamicRegistration: false,
              willSave: false,
              willSaveWaitUntil: false,
              didSave: true
            },
            completion: {
              completionItem: { snippetSupport: true }
            },
            hover: {
              contentFormat: ['markdown', 'plaintext']
            },
            definition: {
              dynamicRegistration: false,
              linkSupport: false
            },
            formatting: {
              dynamicRegistration: false
            }
          }
        }
      };

      const initResult = await transport.sendRequest(initId, 'initialize', initParams);
      serverState.capabilities = initResult.capabilities;
      
      // Send initialized notification
      transport.sendNotification('initialized', {});
      this._updateStatus(language, 'connected');
      
      console.log(`[LSP Manager] Server for '${language}' successfully initialized.`);
      
      return { language, status: 'connected', capabilities: serverState.capabilities };
      
    } catch (err) {
      this._updateStatus(language, 'error');
      throw new Error(`Failed to initialize LSP server for ${language}: ${err.message}`);
    }
  }

  /**
   * Shutdown and exit language server gracefully.
   */
  async stopServer(language) {
    const server = this.servers.get(language);
    if (!server) return { status: 'stopped' };

    console.log(`[LSP Manager] Stopping server for '${language}'...`);
    this._updateStatus(language, 'stopping');
    server.transport.destroy();

    try {
      const shutdownId = this.nextRequestId++;
      await server.transport.sendRequest(shutdownId, 'shutdown', {}, 3000);
      server.transport.sendNotification('exit', {});
    } catch (err) {
      console.warn(`[LSP Manager] Shutdown request failed for '${language}', force killing process...`);
      server.process.kill('SIGKILL');
    }

    this.servers.delete(language);
    console.log(`[LSP Manager] Server for '${language}' stopped.`);
    return { status: 'stopped' };
  }

  /**
   * Sync actions: textDocument/didOpen
   */
  openDocument(language, uri, content) {
    const server = this._getConnectedServer(language);
    server.transport.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId: language,
        version: 1,
        text: content
      }
    });
  }

  /**
   * Sync actions: textDocument/didChange
   */
  changeDocument(language, uri, content, version) {
    const server = this._getConnectedServer(language);
    server.transport.sendNotification('textDocument/didChange', {
      textDocument: {
        uri,
        version
      },
      contentChanges: [
        { text: content }
      ]
    });
  }

  /**
   * Sync actions: textDocument/didClose
   */
  closeDocument(language, uri) {
    const server = this._getConnectedServer(language);
    server.transport.sendNotification('textDocument/didClose', {
      textDocument: {
        uri
      }
    });
  }

  /**
   * Query: textDocument/completion
   */
  async completion(language, uri, line, character) {
    const server = this._getConnectedServer(language);
    const id = this.nextRequestId++;
    const result = await server.transport.sendRequest(id, 'textDocument/completion', {
      textDocument: { uri },
      position: { line, character }
    });
    
    // Normalize format
    if (!result) return [];
    const items = Array.isArray(result) ? result : (result.items || []);
    return items.map(item => ({
      label: item.label,
      kind: item.kind,
      detail: item.detail || '',
      insertText: item.insertText || item.label
    }));
  }

  /**
   * Query: textDocument/hover
   */
  async hover(language, uri, line, character) {
    const server = this._getConnectedServer(language);
    const id = this.nextRequestId++;
    const result = await server.transport.sendRequest(id, 'textDocument/hover', {
      textDocument: { uri },
      position: { line, character }
    });

    if (!result || !result.contents) return { contents: '' };

    // Hover response content formatting
    let contents = '';
    if (typeof result.contents === 'string') {
      contents = result.contents;
    } else if (Array.isArray(result.contents)) {
      contents = result.contents.map(c => typeof c === 'string' ? c : (c.value || '')).join('\n\n');
    } else if (result.contents.value) {
      contents = result.contents.value;
    }

    return {
      contents,
      range: result.range
    };
  }

  /**
   * Query: textDocument/definition
   */
  async definition(language, uri, line, character) {
    const server = this._getConnectedServer(language);
    const id = this.nextRequestId++;
    const result = await server.transport.sendRequest(id, 'textDocument/definition', {
      textDocument: { uri },
      position: { line, character }
    });
    
    if (!result) return [];
    return Array.isArray(result) ? result : [result];
  }

  /**
   * Query: textDocument/formatting
   */
  async format(language, uri) {
    const server = this._getConnectedServer(language);
    const id = this.nextRequestId++;
    const result = await server.transport.sendRequest(id, 'textDocument/formatting', {
      textDocument: { uri },
      options: {
        tabSize: 2,
        insertSpaces: true
      }
    });
    return result || [];
  }

  /**
   * Get server information.
   */
  getServerList() {
    const list = [];
    for (const [lang, s] of this.servers.entries()) {
      list.push({
        language: lang,
        status: s.status,
        bytesSent: s.transport.bytesSent,
        bytesReceived: s.transport.bytesReceived
      });
    }
    return list;
  }

  /**
   * Return cached diagnostics.
   */
  getCachedDiagnostics(language, uri) {
    const server = this.servers.get(language);
    if (!server) return [];
    return server.diagnostics.get(uri) || [];
  }

  /**
   * Internal helpers.
   */
  _getConnectedServer(language) {
    const server = this.servers.get(language);
    if (!server) {
      throw new Error(`Language server for '${language}' is not started.`);
    }
    if (server.status !== 'connected') {
      throw new Error(`Language server for '${language}' is not fully initialized.`);
    }
    return server;
  }

  _updateStatus(language, status) {
    const server = this.servers.get(language);
    if (server) {
      server.status = status;
    }
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('lsp-status-changed', { language, status });
    }
  }

  _handleNotification(language, method, params) {
    if (method === 'textDocument/publishDiagnostics') {
      const { uri, diagnostics } = params;
      const server = this.servers.get(language);
      if (server) {
        server.diagnostics.set(uri, diagnostics);
      }
      
      // Broadcast event to renderer
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('lsp-diagnostics', { language, uri, diagnostics });
      }
    }
  }

  _handleExit(language) {
    const server = this.servers.get(language);
    if (server) {
      this._updateStatus(language, 'offline');
      this.servers.delete(language);
    }
  }

  /**
   * Clear all servers on app exit.
   */
  async destroyAll() {
    const languages = Array.from(this.servers.keys());
    for (const lang of languages) {
      await this.stopServer(lang);
    }
  }
}

module.exports = LspManager;
