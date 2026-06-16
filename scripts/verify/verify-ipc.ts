import * as path from 'path';

console.log('--- STARTING IPC GUARD AND REGISTRY TEST ---');

let failure = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] Assertion failed: ${message}`);
    failure = true;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

async function run() {
  try {
    const { ipcGuard, createError } = require(path.resolve(__dirname, '../electron/ipc-guards.js'));
    const registry = require(path.resolve(__dirname, '../electron/ipc-registry.js'));

    // 1. Setup Mock Event and Request
    const mockEvent = {
      senderFrame: {
        url: 'neurodeck://index.html'
      }
    };

    const mockMaliciousEvent = {
      senderFrame: {
        url: 'http://malicious-origin.com/index.html'
      }
    };

    const schema = {
      language: { type: 'string', required: true },
      command: { type: 'string', required: true },
      args: { type: 'array', required: false }
    };

    const mockHandler = async (payload: any) => {
      return { status: 'mock-started', lang: payload.language };
    };

    // Guard the handler
    const guardedHandler = ipcGuard('lsp:start-server', schema, mockHandler, true);

    // 2. Test Success Path
    const successRequest = {
      requestId: 'req-success-123',
      timestamp: new Date().toISOString(),
      source: 'renderer',
      schemaVersion: '1.0.0',
      payload: {
        language: 'typescript',
        command: 'typescript-language-server',
        args: ['--stdio']
      }
    };

    const result = await guardedHandler(mockEvent, successRequest);
    
    assert(result.ok === true, 'Success path returns ok: true');
    assert(result.requestId === 'req-success-123', 'Response carries input requestId');
    assert(result.data.status === 'mock-started', 'Returned data matches handler output');
    assert(result.data.lang === 'typescript', 'Handler receives correct payload arguments');
    assert(typeof result.durationMs === 'number', 'Response contains duration metrics');

    // 3. Test Invalid Channel Rule (Security Exception)
    const badChannelHandler = ipcGuard('invalid:channel-name', {}, mockHandler, true);
    const badChannelResult = await badChannelHandler(mockEvent, successRequest);
    assert(badChannelResult.ok === false, 'Blocked channel returns ok: false');
    assert(badChannelResult.error.code === 'BLOCKED_CHANNEL', 'Blocked channel reports BLOCKED_CHANNEL code');

    // 4. Test Origin Guard (Security Exception)
    const originResult = await guardedHandler(mockMaliciousEvent, successRequest);
    assert(originResult.ok === false, 'Blocked origin returns ok: false');
    assert(originResult.error.message.includes('Security Exception'), 'Origin violation logs Security Exception');

    // 5. Test Schema Missing Field Rule
    const missingFieldRequest = {
      requestId: 'req-missing-456',
      payload: {
        command: 'typescript-language-server'
        // missing 'language'
      }
    };
    const schemaResult = await guardedHandler(mockEvent, missingFieldRequest);
    assert(schemaResult.ok === false, 'Missing required field returns ok: false');
    assert(schemaResult.error.code === 'MISSING_FIELD', 'Missing field error reports MISSING_FIELD');
    assert(schemaResult.error.message.includes('language'), 'Missing field message identifies missing field');

    // 6. Test Schema Type Mismatch Rule
    const badTypeRequest = {
      requestId: 'req-badtype-789',
      payload: {
        language: 123, // should be string
        command: 'typescript-language-server'
      }
    };
    const typeResult = await guardedHandler(mockEvent, badTypeRequest);
    assert(typeResult.ok === false, 'Invalid field type returns ok: false');
    assert(typeResult.error.code === 'INVALID_TYPE', 'Type error reports INVALID_TYPE');

    // 7. Test Payload Size Limit
    const hugePayload = 'A'.repeat(5 * 1024 * 1024 + 100); // Exceeds 5MB
    const hugeRequest = {
      requestId: 'req-huge-000',
      payload: {
        language: 'typescript',
        command: hugePayload
      }
    };
    const hugeResult = await guardedHandler(mockEvent, hugeRequest);
    assert(hugeResult.ok === false, 'Oversized payload is blocked and returns ok: false');
    assert(hugeResult.error.code === 'PAYLOAD_TOO_LARGE', 'Oversized payload reports PAYLOAD_TOO_LARGE');

  } catch (err: any) {
    console.error('Exception during IPC testing:', err);
    failure = true;
  }

  if (failure) {
    console.error('--- IPC GUARD AND REGISTRY TEST FAILED ---');
    process.exit(1);
  } else {
    console.log('--- IPC GUARD AND REGISTRY TEST PASSED ---');
    process.exit(0);
  }
}

run();
