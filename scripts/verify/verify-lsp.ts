import { Readable, Writable } from 'stream';
import * as path from 'path';

console.log('--- STARTING LSP TRANSPORT AND PARSER TEST ---');

let failure = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error([`[FAIL] Assertion failed: ${message}`]);
    failure = true;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

async function run() {
  try {
    const LspTransport = require(path.resolve(__dirname, '../../electron/services/lsp/lsp-transport.js'));

    // 1. Create mock stdio streams
    const mockStdout = new Readable({
      read() {} // No-op, we will push data manually
    });

    let stdinData = Buffer.alloc(0);
    const mockStdin = new Writable({
      write(chunk, encoding, callback) {
        stdinData = Buffer.concat([stdinData, chunk]);
        callback();
      }
    });

    // 2. Initialize LspTransport
    const transport = new LspTransport(mockStdout, mockStdin, false);

    // 3. Test sendRequest framing (outbound to stdin)
    const reqPromise = transport.sendRequest(1, 'initialize', { rootUri: 'file:///workspace' });
    
    // Verify that stdin received a properly framed message
    const expectedBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { rootUri: 'file:///workspace' }
    });

    const writtenString = stdinData.toString('utf8');
    assert(writtenString.startsWith('Content-Length:'), 'Outbound message starts with Content-Length header');
    assert(writtenString.includes('\r\n\r\n'), 'Outbound message contains double CRLF header boundary');
    assert(writtenString.includes(expectedBody), 'Outbound message body matches JSON-RPC 2.0 specs');

    // 4. Test response parsing and promise resolution (inbound from stdout)
    // Simulate receiving a response packet in chunks
    const responseBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { capabilities: { hoverProvider: true } }
    });
    const responseBodyBuf = Buffer.from(responseBody, 'utf8');
    const headerStr = `Content-Length: ${responseBodyBuf.length}\r\n\r\n`;

    // Push header first
    mockStdout.push(Buffer.from(headerStr, 'utf8'));
    // Push body in two separate parts to verify buffer concatenation handles chunking
    const halfLen = Math.floor(responseBodyBuf.length / 2);
    mockStdout.push(responseBodyBuf.subarray(0, halfLen));
    mockStdout.push(responseBodyBuf.subarray(halfLen));

    const response = await reqPromise;
    assert(response.capabilities.hoverProvider === true, 'Response is parsed and promise resolves with correct result');

    // 5. Test incoming notification parsing
    let notificationMethod = '';
    let notificationParams: any = null;

    transport.on('notification', (method: string, params: any) => {
      notificationMethod = method;
      notificationParams = params;
    });

    const notificationBody = JSON.stringify({
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: { uri: 'file:///test.ts', diagnostics: [] }
    });
    const notifBodyBuf = Buffer.from(notificationBody, 'utf8');
    const notifMsg = Buffer.concat([
      Buffer.from(`Content-Length: ${notifBodyBuf.length}\r\n\r\n`, 'utf8'),
      notifBodyBuf
    ]);

    mockStdout.push(notifMsg);

    // Give Event Loop a tick to process event emitter
    await new Promise(resolve => setTimeout(resolve, 50));

    assert(notificationMethod === 'textDocument/publishDiagnostics', 'Incoming notification method parsed correctly');
    assert(notificationParams.uri === 'file:///test.ts', 'Incoming notification params parsed correctly');

    // 6. Test timeout
    let timeoutError: Error | null = null;
    try {
      await transport.sendRequest(2, 'textDocument/hover', {}, 100); // 100ms timeout
    } catch (err: any) {
      timeoutError = err;
    }
    assert(timeoutError !== null, 'Timeout triggers promise rejection');
    assert(timeoutError!.message.includes('timed out'), 'Timeout error message indicates request timeout');

    transport.destroy();

  } catch (err: any) {
    console.error('Exception during LSP transport E2E validation:', err);
    failure = true;
  }

  if (failure) {
    console.error('--- LSP TRANSPORT AND PARSER TEST FAILED ---');
    process.exit(1);
  } else {
    console.log('--- LSP TRANSPORT AND PARSER TEST PASSED ---');
    process.exit(0);
  }
}

run();
