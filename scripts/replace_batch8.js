const fs = require('fs');

// ──────────────────────────────────────────────────────────────────────────────
// main.js — split triggerOAuthLogin
// ──────────────────────────────────────────────────────────────────────────────
{
  let src = fs.readFileSync('frontend/src/main.js', 'utf8');

  function replaceFunction(src, fnName, newCode) {
    const lines = src.split('\n');
    const startIdx = lines.findIndex(l => l.startsWith('function ' + fnName + '(') || l.startsWith('async function ' + fnName + '('));
    if (startIdx < 0) { console.error('NOT FOUND: ' + fnName); return src; }
    let depth = 0, endIdx = -1;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) { if (ch === '{') depth++; if (ch === '}') depth--; }
      if (depth === 0 && i > startIdx) { endIdx = i; break; }
    }
    console.log(fnName + ': lines ' + (startIdx+1) + '-' + (endIdx+1));
    return [...lines.slice(0, startIdx), newCode, ...lines.slice(endIdx + 1)].join('\n');
  }

  src = replaceFunction(src, 'triggerOAuthLogin', `function _oauthCreateCard(chatViewport) {
  const msg = document.createElement("div");
  msg.className = "message ai";
  msg.id = "oauth-message-card";
  msg.tabIndex = -1;
  msg.innerHTML = \`
        <div class="message-card">
            <h3>Login with Provider (OAuth 2.0 Device Flow)</h3>
            <div id="oauth-status" style="color: #00ff41; margin-bottom: 10px;">Requesting authentication...</div>
            <div id="oauth-qr-container" style="background: white; padding: 10px; display: inline-block; border-radius: 8px; display: none;">
                <canvas id="oauth-qr"></canvas>
            </div>
            <p id="oauth-url-text" style="display: none;">Or visit: <a href="#" id="oauth-url" target="_blank" style="color: #00ff41;"></a></p>
            <p id="oauth-code-text" style="display: none;">Enter the following code:</p>
            <div id="oauth-code" class="oauth-code-display" style="letter-spacing: 4px; background: rgba(0,255,65,0.1); display: inline-block; padding: 10px; display: none;"></div>
        </div>
    \`;
  chatViewport.appendChild(msg);
  chatViewport.scrollTop = chatViewport.scrollHeight;
  msg.focus({ preventScroll: true });
  return msg;
}

async function _oauthShowDeviceInfo(data, chatViewport) {
  document.getElementById("oauth-status").innerText = "Waiting for mobile approval...";
  document.getElementById("oauth-qr-container").style.display = "inline-block";
  document.getElementById("oauth-url-text").style.display = "block";
  document.getElementById("oauth-code-text").style.display = "block";
  document.getElementById("oauth-code").style.display = "inline-block";
  document.getElementById("oauth-url").href = data.verification_uri;
  document.getElementById("oauth-url").innerText = data.verification_uri;
  document.getElementById("oauth-code").innerText = data.user_code;
  await QRCode.toCanvas(document.getElementById("oauth-qr"), data.verification_uri_complete || data.verification_uri, { width: 200, margin: 1 });
  chatViewport.scrollTop = chatViewport.scrollHeight;
}

async function triggerOAuthLogin() {
  const chatViewport = document.getElementById("chat-viewport");
  const msg = _oauthCreateCard(chatViewport);
  if (oauthFocusTrap) oauthFocusTrap.deactivate(false);
  oauthFocusTrap = new FocusTrap(msg);
  oauthFocusTrap.activate();
  try {
    const data = await invoke("start_oauth_flow");
    await _oauthShowDeviceInfo(data, chatViewport);
    await invoke("poll_oauth_token", { deviceCode: data.device_code, interval: data.interval });
    document.getElementById("oauth-status").innerText = "Authentication successful! Token saved to OS Keychain.";
    document.getElementById("oauth-status").style.color = "#00ff41";
  } catch (err) {
    console.error(err);
    const statusEl = document.getElementById("oauth-status");
    if (statusEl) { statusEl.innerText = "Authentication failed: " + String(err); statusEl.style.color = "red"; }
  } finally {
    if (oauthFocusTrap) { oauthFocusTrap.deactivate(false); oauthFocusTrap = null; }
  }
}`);

  fs.writeFileSync('frontend/src/main.js', src);
  console.log('main.js done. Lines:', src.split('\n').length);
}

// ──────────────────────────────────────────────────────────────────────────────
// chat.js — extract code header builder from forEach arrow
// ──────────────────────────────────────────────────────────────────────────────
{
  let src = fs.readFileSync('frontend/src/chat.js', 'utf8');
  const lines = src.split('\n');

  // Find the pres.forEach arrow at line 1484 (0-indexed: 1483)
  // It's inside some outer function — find it by context
  const forEachIdx = lines.findIndex(l => l.trim() === 'pres.forEach(pre => {');
  if (forEachIdx < 0) { console.error('pres.forEach not found'); process.exit(1); }

  // Find end of the forEach
  let depth = 0, forEachEnd = -1, started = false;
  for (let i = forEachIdx; i < lines.length; i++) {
    for (const ch of lines[i]) { if (ch === '{') { depth++; started = true; } if (ch === '}') depth--; }
    if (started && depth === 0) { forEachEnd = i; break; }
  }
  console.log('pres.forEach: lines', forEachIdx+1, '-', forEachEnd+1);

  // Extract the body (everything between the opening { and the closing })
  const bodyLines = lines.slice(forEachIdx + 1, forEachEnd);

  // The new named function
  const namedFn = `function _chatBuildCodeHeaderBar(pre) {
${bodyLines.join('\n')}
}`;

  const newForEach = `    pres.forEach(pre => _chatBuildCodeHeaderBar(pre));`;

  const result = [...lines.slice(0, forEachIdx), namedFn, '', newForEach, ...lines.slice(forEachEnd + 1)].join('\n');
  fs.writeFileSync('frontend/src/chat.js', result);
  console.log('chat.js done. Lines:', result.split('\n').length);
}

console.log('All done.');
