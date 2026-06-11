/**
 * LSP Transport Layer
 * Implements Content-Length framing and JSON-RPC 2.0 request/response/notification routing.
 */
'use strict';

const EventEmitter = require('events');

class LspTransport extends EventEmitter {
  constructor(stdout, stdin, debugMode = false) {
    super();
    this.stdout = stdout;
    this.stdin = stdin;
    this.debugMode = debugMode;
    
    this.buffer = Buffer.alloc(0);
    this.pendingRequests = new Map();
    this.bytesSent = 0;
    this.bytesReceived = 0;
    
    this.stdout.on('data', (chunk) => this._handleData(chunk));
    this.stdout.on('error', (err) => this.emit('error', err));
    this.stdout.on('close', () => this.emit('close'));
  }

  /**
   * Send a JSON-RPC request and return a promise that resolves with the response.
   */
  sendRequest(id, method, params, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const message = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`LSP Request '${method}' with ID ${id} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer, method });
      this._write(message);
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected).
   */
  sendNotification(method, params) {
    const message = {
      jsonrpc: '2.0',
      method,
      params
    };
    this._write(message);
  }

  /**
   * Send a JSON-RPC response to a server request.
   */
  sendResponse(id, result, error = null) {
    const message = {
      jsonrpc: '2.0',
      id
    };
    if (error) {
      message.error = error;
    } else {
      message.result = result;
    }
    this._write(message);
  }

  /**
   * Internal data handler: parses Content-Length framed packets.
   */
  _handleData(chunk) {
    this.bytesReceived += chunk.length;
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const bufferStr = this.buffer.toString('utf8');
      
      // Look for the Content-Length header
      const contentLengthMatch = bufferStr.match(/Content-Length:\s*(\d+)/i);
      if (!contentLengthMatch) {
        // If there's no header yet, wait for more data. But prevent memory leaks if buffer grows too large without matches.
        if (this.buffer.length > 8192) {
          this.buffer = Buffer.alloc(0); // Clear invalid buffer
        }
        break;
      }

      const headerEndIndex = bufferStr.indexOf('\r\n\r\n');
      if (headerEndIndex === -1) {
        break; // Headers are not fully received yet
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const bodyStartIndex = headerEndIndex + 4;
      const totalMessageLength = bodyStartIndex + contentLength;

      if (this.buffer.length < totalMessageLength) {
        break; // Wait for the rest of the body to arrive
      }

      // We have a complete message! Extract it.
      const bodyBuffer = this.buffer.subarray(bodyStartIndex, totalMessageLength);
      
      // Advance the buffer
      this.buffer = this.buffer.subarray(totalMessageLength);

      try {
        const message = JSON.parse(bodyBuffer.toString('utf8'));
        if (this.debugMode) {
          console.log(`[LSP IN] msg=`, JSON.stringify(message));
        }
        this._routeMessage(message);
      } catch (err) {
        console.error('[LSP Parser Error]: failed to parse message body:', err);
      }
    }
  }

  /**
   * Routes message to request callbacks, events, or notifications.
   */
  _routeMessage(message) {
    const isResponse = message.id !== undefined && (message.result !== undefined || message.error !== undefined);
    
    if (isResponse) {
      const id = message.id;
      const waiter = this.pendingRequests.get(id);
      if (waiter) {
        clearTimeout(waiter.timer);
        this.pendingRequests.delete(id);
        
        if (message.error) {
          waiter.reject(new Error(message.error.message || `LSP Error code ${message.error.code}`));
        } else {
          waiter.resolve(message.result);
        }
      } else {
        if (this.debugMode) {
          console.warn(`[LSP Warning] Received response with unknown request ID: ${id}`);
        }
      }
    } else if (message.method) {
      // It's a server request or notification
      this.emit('notification', message.method, message.params, message.id);
    }
  }

  /**
   * Stringify and write JSON message to stdin stream using Content-Length framing.
   */
  _write(message) {
    try {
      const body = JSON.stringify(message);
      const bodyBuf = Buffer.from(body, 'utf8');
      const header = `Content-Length: ${bodyBuf.length}\r\n\r\n`;
      const headerBuf = Buffer.from(header, 'utf8');
      
      const payload = Buffer.concat([headerBuf, bodyBuf]);
      this.stdin.write(payload);
      this.bytesSent += payload.length;

      if (this.debugMode) {
        console.log(`[LSP OUT] msg=`, body);
      }
    } catch (err) {
      console.error('[LSP Transport Write Error]:', err);
      this.emit('error', err);
    }
  }

  /**
   * Clears all pending requests on transport destruction.
   */
  destroy() {
    for (const [id, waiter] of this.pendingRequests.entries()) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error(`LSP Transport was destroyed before request ${id} (${waiter.method}) completed.`));
    }
    this.pendingRequests.clear();
  }
}

module.exports = LspTransport;
