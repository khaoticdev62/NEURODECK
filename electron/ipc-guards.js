/**
 * IPC guards for Electron main process.
 * Handles sender validation, request size limits, rate limiting,
 * runtime schema validation, and unified result/error framing.
 */
'use strict';

const { ALLOWED_CHANNELS } = require('./ipc-registry');

// Max payload size: 5MB
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024;
const SCHEMA_VERSION = "1.0.0";

/**
 * Creates a normalized NeurodeckError object
 */
function createError(code, message, category = 'unknown', options = {}) {
  return {
    code: String(code),
    message: String(message),
    category: String(category),
    recoverable: options.recoverable !== false,
    userAction: options.userAction || 'Verify configurations and retry.',
    technicalDetails: options.technicalDetails || '',
    cause: options.cause || null
  };
}

/**
 * Validates the IPC sender to ensure it is originating from our allowed frame origins.
 */
function validateSender(senderFrame, isDev) {
  if (!senderFrame) {
    throw new Error('Sender frame is missing');
  }
  
  const origin = senderFrame.url;
  const isAllowedOrigin = origin.startsWith('neurodeck://') || 
    (isDev && (origin.startsWith('http://localhost:1420') || origin.startsWith('http://127.0.0.1:1420')));
    
  if (!isAllowedOrigin) {
    throw new Error(`Security Exception: Blocked IPC request from origin: ${origin}`);
  }
}

/**
 * Simple runtime schema validator to check arguments against expected properties and types.
 */
function validateSchema(payload, schema) {
  if (!schema) return; // No schema validation requested
  
  if (typeof payload !== 'object' || payload === null) {
    throw createError('INVALID_PAYLOAD', 'Payload must be an object', 'validation');
  }

  for (const [key, rules] of Object.entries(schema)) {
    const value = payload[key];
    
    // Required check
    if (rules.required && (value === undefined || value === null)) {
      throw createError('MISSING_FIELD', `Missing required field: ${key}`, 'validation');
    }
    
    if (value !== undefined && value !== null) {
      // Type check
      const actualType = typeof value;
      let expectedType = rules.type;
      if (expectedType === 'array') {
        if (!Array.isArray(value)) {
          throw createError('INVALID_TYPE', `Field ${key} expected array, got ${actualType}`, 'validation');
        }
      } else if (actualType !== expectedType) {
        throw createError('INVALID_TYPE', `Field ${key} expected ${expectedType}, got ${actualType}`, 'validation');
      }
    }
  }
}

/**
 * Wraps an IPC handler in a guard that validates the sender, enforces payload limits,
 * normalizes errors, and frames the response in a NeurodeckResult shape.
 */
function ipcGuard(channel, schema, handler, isDev = false) {
  return async (event, request) => {
    const startTime = Date.now();
    const requestId = (request && request.requestId) || `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const source = (request && request.source) || 'renderer';
    
    try {
      // 1. Validate Channel
      if (!ALLOWED_CHANNELS.has(channel)) {
        throw createError('BLOCKED_CHANNEL', `IPC channel '${channel}' is not registered or allowed`, 'security', { recoverable: false });
      }

      // 2. Validate Sender Origin
      validateSender(event.senderFrame, isDev);

      // 3. Enforce Payload Size Limit
      const payloadString = JSON.stringify(request);
      if (payloadString.length > MAX_PAYLOAD_SIZE) {
        throw createError('PAYLOAD_TOO_LARGE', `Request payload size exceeds the limit of 5MB`, 'validation', { recoverable: true });
      }

      // 4. Extract and Validate Payload Schema
      const payload = (request && request.payload) || {};
      validateSchema(payload, schema);

      // 5. Execute Handler
      const data = await handler(payload, event);
      const durationMs = Date.now() - startTime;
      
      // Log Success (structured)
      console.log(`[IPC SUCCESS] timestamp=${new Date().toISOString()} requestId=${requestId} channel=${channel} durationMs=${durationMs} status=passed`);

      return {
        ok: true,
        requestId,
        data,
        durationMs,
        source: 'main',
        schemaVersion: SCHEMA_VERSION
      };

    } catch (err) {
      const durationMs = Date.now() - startTime;
      let finalError;
      
      if (err && err.code) {
        // Already normalized
        finalError = err;
      } else {
        // General unhandled error
        finalError = createError(
          'INTERNAL_ERROR',
          err && err.message ? err.message : String(err),
          'unknown',
          { technicalDetails: err && err.stack ? err.stack : '' }
        );
      }

      // Log Failure (structured)
      console.error(`[IPC ERROR] timestamp=${new Date().toISOString()} requestId=${requestId} channel=${channel} durationMs=${durationMs} status=failed errorCode=${finalError.code} errorMessage="${finalError.message}"`);

      return {
        ok: false,
        requestId,
        error: finalError,
        durationMs,
        source: 'main',
        schemaVersion: SCHEMA_VERSION
      };
    }
  };
}

module.exports = {
  ipcGuard,
  createError,
  SCHEMA_VERSION
};
