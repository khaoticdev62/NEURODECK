/**
 * Chat Virtualization & Slash Commands Test Script
 * 
 * Run this in the browser DevTools console while NEURODECK is open
 * on the Chat tab to verify Phase 1 features.
 */

// ── Test 1: Inject 200 synthetic messages ───────────────────────────────────
async function injectMessages(count = 200) {
    const chatViewport = document.getElementById('chat-viewport');
    const workspace = document.getElementById('chat-workspace');
    if (!chatViewport) {
        console.error('Chat viewport not found. Make sure Chat tab is active.');
        return;
    }

    console.log(`Injecting ${count} synthetic messages...`);
    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
        const kind = i % 3 === 0 ? 'user' : (i % 3 === 1 ? 'ai' : 'system');
        const text = kind === 'ai'
            ? `AI response #${i}: Here is some **markdown** with \`code\` and a long paragraph to simulate real message content. `.repeat(5)
            : kind === 'user'
                ? `User message #${i}: How do I implement feature X in Rust?`
                : `System: Processing command ${i}...`;

        const wrapper = document.createElement('div');
        wrapper.className = `message ${kind}`;
        const card = document.createElement('div');
        card.className = 'message-card';
        card.textContent = text;
        wrapper.appendChild(card);
        chatViewport.appendChild(wrapper);

        // Register in state (using the module's registerMessage if available)
        if (window.__registerMessage) {
            window.__registerMessage(wrapper, kind, text);
        }

        // Batch DOM updates
        if (i % 20 === 0) {
            await new Promise(r => requestAnimationFrame(r));
        }
    }

    const elapsed = performance.now() - startTime;
    console.log(`✅ Injected ${count} messages in ${elapsed.toFixed(1)}ms`);

    // Scroll to bottom
    workspace.scrollTop = workspace.scrollHeight;

    // Report
    const messages = chatViewport.querySelectorAll('.message');
    console.log(`Total DOM message nodes: ${messages.length}`);
    console.log(`Message registry size: ${window.state?.chatMessageRegistry?.length || 'N/A (check state.js export)'}`);
}

// ── Test 2: Check content-visibility support ────────────────────────────────
function checkVirtualization() {
    const supportsCV = CSS.supports('content-visibility', 'auto');
    console.log(`Browser content-visibility support: ${supportsCV ? '✅ YES' : '❌ NO (fallback IntersectionObserver active)'}`);

    const messages = document.querySelectorAll('#chat-viewport > .message');
    const styles = getComputedStyle(messages[0]);
    console.log(`Message content-visibility: ${styles.contentVisibility}`);
    console.log(`Message contain-intrinsic-size: ${styles.containIntrinsicSize}`);
}

// ── Test 3: Check slash command palette ─────────────────────────────────────
function testSlashCommands() {
    const input = document.getElementById('user-input');
    if (!input) {
        console.error('Input not found');
        return;
    }

    console.log('Testing slash command palette...');
    input.value = '/';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
        const palette = document.getElementById('slash-palette');
        if (palette && !palette.classList.contains('hidden')) {
            const items = palette.querySelectorAll('.slash-cmd');
            console.log(`✅ Slash palette visible with ${items.length} commands`);
            items.forEach((item, i) => {
                console.log(`  ${i + 1}. ${item.querySelector('.slash-cmd-label')?.textContent}`);
            });
        } else {
            console.log('❌ Slash palette not visible');
        }
    }, 100);
}

// ── Test 4: Check gamepad focusable elements include messages ───────────────
function testGamepadMessages() {
    // This requires the gamepad module to be loaded
    console.log('To test gamepad message navigation:');
    console.log('1. Connect a gamepad (Xbox/Steam controller)');
    console.log('2. Navigate to Chat view with D-pad');
    console.log('3. Messages should be in the focus cycle');
    console.log('4. X button = copy focused message');
    console.log('5. Y button = regenerate last user message');
    console.log('6. LB/RB = page scroll in chat');
}

// ── Run all tests ───────────────────────────────────────────────────────────
console.log('%c🧪 NEURODECK Chat Phase 1 Test Suite', 'font-size:16px;font-weight:bold;color:#5eebff');
console.log('Available test functions:');
console.log('  injectMessages(n)  — Inject N synthetic messages');
console.log('  checkVirtualization() — Check CSS virtualization');
console.log('  testSlashCommands() — Test / command palette');
console.log('  testGamepadMessages() — Gamepad nav instructions');

// Auto-run basic checks
setTimeout(() => {
    checkVirtualization();
    testSlashCommands();
}, 500);
