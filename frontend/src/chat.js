import { state } from './state.js';
import { invoke } from './neurobridge.js';
import { listen } from './neurobridge.js';
import { marked } from 'marked';
import { applyButtonIcon, createIcon } from './icons.js';
import { addNotification } from './notifications.js';
import { initSlashCommands, setSlashClearHandler } from './slash-commands.js';
import { triggerHaptic } from './haptics.js';
import { FocusTrap } from './focus-trap.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE REGISTRY & VIRTUALIZATION
// ═══════════════════════════════════════════════════════════════════════════════
let _msgIdSeq = 0;
function nextMsgId() { return 'msg-' + (++_msgIdSeq) + '-' + Date.now().toString(36); }

function clearMessageRegistry() {
    state.chatMessageRegistry = [];
    if (state.chatMessageObserver) {
        state.chatMessageObserver.disconnect();
        state.chatMessageObserver = null;
    }
}

function registerMessage(el, kind, text, options = {}, attachment = null) {
    if (!el) return;
    const id = nextMsgId();
    el.dataset.msgId = id;
    const entry = {
        id,
        kind,
        text: String(text ?? ''),
        options: { ...options },
        attachment,
        el,
        isCulled: false,
        height: 0,
        storedChildren: null,
        timestamp: Date.now(),
    };
    state.chatMessageRegistry.push(entry);
    observeMessage(el);
    return entry;
}

function observeMessage(el) {
    if (!el || !state.chatMessageObserver) return;
    state.chatMessageObserver.observe(el);
}

function initMessageObserver() {
    if (state.chatMessageObserver) return;
    const root = document.getElementById('chat-workspace');
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
        // If browser supports content-visibility, skip JS culling
        if (CSS.supports('content-visibility', 'auto')) return;
        entries.forEach(entry => {
            const msgId = entry.target.dataset.msgId;
            if (!msgId) return;
            const reg = state.chatMessageRegistry.find(r => r.id === msgId);
            if (!reg) return;
            // Never cull the active streaming message
            if (entry.target === state.currentAIMessage) return;
            const rect = entry.boundingClientRect;
            const rootH = root.clientHeight;
            const farAbove = rect.bottom < -2000;
            const farBelow = rect.top > rootH + 2000;
            if (!entry.isIntersecting && (farAbove || farBelow)) {
                cullMessage(reg);
            } else if (entry.isIntersecting && reg.isCulled) {
                restoreMessage(reg);
            }
        });
    }, { root, rootMargin: '2000px 0px', threshold: 0 });
    state.chatMessageObserver = observer;
}

function cullMessage(reg) {
    if (reg.isCulled || !reg.el) return;
    const wrapper = reg.el;
    const h = wrapper.offsetHeight;
    if (h <= 0) return;
    reg.height = h;
    wrapper.style.height = h + 'px';
    wrapper.dataset.culled = 'true';
    // Store children in a document fragment
    const frag = document.createDocumentFragment();
    while (wrapper.firstChild) {
        frag.appendChild(wrapper.firstChild);
    }
    reg.storedChildren = frag;
    const ph = document.createElement('div');
    ph.className = 'message-placeholder';
    ph.innerHTML = `<span class="msg-placeholder-label">${reg.kind} message</span>`;
    wrapper.appendChild(ph);
    reg.isCulled = true;
}

function restoreMessage(reg) {
    if (!reg.isCulled || !reg.el) return;
    const wrapper = reg.el;
    const ph = wrapper.querySelector('.message-placeholder');
    if (ph) ph.remove();
    if (reg.storedChildren) {
        wrapper.appendChild(reg.storedChildren);
        reg.storedChildren = null;
    }
    wrapper.style.height = '';
    wrapper.dataset.culled = 'false';
    reg.isCulled = false;
    // Re-apply code formatting in case it was lost
    if (reg.kind === 'ai') {
        formatCodeBlocks(wrapper);
    }
}

// Helper: get plain text of a message for copy / gamepad actions
export function getMessageText(el) {
    if (!el) return '';
    const card = el.querySelector('.message-card');
    if (!card) return '';
    // Prefer data attribute if set
    const msgId = el.dataset.msgId;
    if (msgId) {
        const reg = state.chatMessageRegistry.find(r => r.id === msgId);
        if (reg && reg.text) return reg.text;
    }
    return card.textContent || '';
}

// Helper: get all message elements in order
export function getMessageElements() {
    return Array.from(document.querySelectorAll('#chat-viewport > .message'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT HISTORY SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

function initChatSearch() {
    const workspace = document.getElementById('chat-workspace');
    if (!workspace) return;
    if (document.getElementById('chat-search-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'chat-search-overlay';
    overlay.className = 'chat-search-overlay hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Chat search');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
        <div class="chat-search-bar">
            <span class="chat-search-icon">${createIcon('search', { size: 14 })}</span>
            <input type="text" id="chat-search-input" placeholder="Search messages..." autocomplete="off" />
            <span class="chat-search-counter" id="chat-search-counter"></span>
            <select id="chat-search-filter" class="chat-search-filter" title="Filter by kind">
                <option value="all">All</option>
                <option value="user">User</option>
                <option value="ai">AI</option>
                <option value="system">System</option>
            </select>
            <button id="chat-search-prev" class="chat-search-nav" title="Previous match">↑</button>
            <button id="chat-search-next" class="chat-search-nav" title="Next match">↓</button>
            <button id="chat-search-close" class="chat-search-close" title="Close search (Esc)">${createIcon('x', { size: 14 })}</button>
        </div>
    `;
    workspace.insertBefore(overlay, workspace.firstChild);

    const input = document.getElementById('chat-search-input');
    const filter = document.getElementById('chat-search-filter');
    const prevBtn = document.getElementById('chat-search-prev');
    const nextBtn = document.getElementById('chat-search-next');
    const closeBtn = document.getElementById('chat-search-close');

    let debounceTimer = null;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(input.value), 150);
    });

    filter.addEventListener('change', () => {
        state.chatSearch.filter = filter.value;
        performSearch(input.value);
    });

    prevBtn.addEventListener('click', () => navigateSearch(-1));
    nextBtn.addEventListener('click', () => navigateSearch(1));
    closeBtn.addEventListener('click', closeChatSearch);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            navigateSearch(e.shiftKey ? -1 : 1);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeChatSearch();
        }
    });
}

let chatSearchFocusTrap = null;

function openChatSearch() {
    initChatSearch();
    const overlay = document.getElementById('chat-search-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
    }
    if (!chatSearchFocusTrap) chatSearchFocusTrap = new FocusTrap(overlay);
    chatSearchFocusTrap.activate();
    const input = document.getElementById('chat-search-input');
    if (input) {
        input.focus();
        input.select();
    }
    state.chatSearch.open = true;
}

export function closeChatSearch() {
    const overlay = document.getElementById('chat-search-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
    }
    if (chatSearchFocusTrap) chatSearchFocusTrap.deactivate();
    clearSearchHighlights();
    state.chatSearch.open = false;
    state.chatSearch.query = '';
    state.chatSearch.matches = [];
    state.chatSearch.activeIndex = -1;
}

function clearSearchHighlights() {
    document.querySelectorAll('.search-highlight').forEach(mark => {
        const parent = mark.parentNode;
        if (parent) {
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        }
    });
}

function _highlightTextNode(textNode, re, query, entry) {
    const text = textNode.textContent;
    let match;
    while ((match = re.exec(text)) !== null) {
        const before = text.substring(0, match.index);
        const matched = text.substring(match.index, match.index + query.length);
        const after = text.substring(match.index + query.length);
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = matched;
        const span = document.createElement('span');
        if (before) span.appendChild(document.createTextNode(before));
        span.appendChild(mark);
        if (after) span.appendChild(document.createTextNode(after));
        textNode.parentNode.replaceChild(span, textNode);
        state.chatSearch.matches.push({ el: mark, msgId: entry.id });
        re.lastIndex = 0;
        break;
    }
}

function performSearch(query) {
    clearSearchHighlights();
    state.chatSearch.query = query;
    state.chatSearch.matches = [];
    state.chatSearch.activeIndex = -1;

    const counter = document.getElementById('chat-search-counter');
    if (counter) counter.textContent = '';

    if (!query || query.length < 2) return;

    const filter = state.chatSearch.filter;
    const re = new RegExp('(' + escapeRegExp(query) + ')', 'gi');

    state.chatMessageRegistry.forEach(entry => {
        if (!entry.el) return;
        if (filter !== 'all' && entry.kind !== filter) return;

        const card = entry.el.querySelector('.message-card');
        if (!card) return;

        // Walk text nodes in card (excluding buttons, metadata, etc.)
        const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
            if (node.parentElement.closest('button, .msg-meta, .msg-copy-btn, .msg-actions-menu')) continue;
            textNodes.push(node);
        }

        textNodes.forEach(textNode => _highlightTextNode(textNode, re, query, entry));
    });

    if (state.chatSearch.matches.length > 0) {
        state.chatSearch.activeIndex = 0;
        scrollToMatch(0);
    }
    updateSearchCounter();
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function navigateSearch(delta) {
    const matches = state.chatSearch.matches;
    if (matches.length === 0) return;
    triggerHaptic("light");
    matches.forEach((m, i) => {
        m.el.classList.toggle('search-highlight-active', i === state.chatSearch.activeIndex);
    });
    state.chatSearch.activeIndex += delta;
    if (state.chatSearch.activeIndex < 0) state.chatSearch.activeIndex = matches.length - 1;
    if (state.chatSearch.activeIndex >= matches.length) state.chatSearch.activeIndex = 0;
    scrollToMatch(state.chatSearch.activeIndex);
    updateSearchCounter();
}

function scrollToMatch(index) {
    const match = state.chatSearch.matches[index];
    if (!match || !match.el) return;
    match.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    match.el.classList.add('search-highlight-active');
}

function updateSearchCounter() {
    const counter = document.getElementById('chat-search-counter');
    if (!counter) return;
    const total = state.chatSearch.matches.length;
    if (total === 0) {
        counter.textContent = 'No matches';
    } else {
        counter.textContent = `${state.chatSearch.activeIndex + 1} / ${total}`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL COMPARISON (A/B)
// ═══════════════════════════════════════════════════════════════════════════════

function ensureComparisonLayout() {
    if (document.getElementById('chat-comparison-layout')) return;
    const workspace = document.getElementById('chat-workspace');
    if (!workspace) return;

    const layout = document.createElement('div');
    layout.id = 'chat-comparison-layout';
    layout.className = 'chat-comparison-layout hidden';
    layout.innerHTML = `
        <div class="compare-pane compare-pane-left">
            <div class="compare-pane-header">
                <span class="compare-pane-label">Model A</span>
                <span class="compare-pane-provider" id="compare-provider-left">GEMINI</span>
                <span class="compare-pane-metrics" id="compare-metrics-left"></span>
            </div>
            <div class="compare-pane-viewport" id="compare-viewport-left"></div>
        </div>
        <div class="compare-pane-divider"></div>
        <div class="compare-pane compare-pane-right">
            <div class="compare-pane-header">
                <span class="compare-pane-label">Model B</span>
                <span class="compare-pane-provider" id="compare-provider-right">OLLAMA</span>
                <span class="compare-pane-metrics" id="compare-metrics-right"></span>
            </div>
            <div class="compare-pane-viewport" id="compare-viewport-right"></div>
        </div>
    `;
    workspace.appendChild(layout);
}

export function toggleComparisonMode() {
    ensureComparisonLayout();
    state.comparisonMode = !state.comparisonMode;

    const layout = document.getElementById('chat-comparison-layout');
    const chatViewport = document.getElementById('chat-viewport');
    const toggleBtn = document.getElementById('compare-toggle-btn');

    if (state.comparisonMode) {
        if (layout) layout.classList.remove('hidden');
        if (chatViewport) chatViewport.classList.add('hidden');
        if (toggleBtn) toggleBtn.classList.add('active');
        // Update provider labels from state
        const leftProv = document.getElementById('compare-provider-left');
        const rightProv = document.getElementById('compare-provider-right');
        if (leftProv) leftProv.textContent = (state.compareLeft.provider || 'gemini').toUpperCase();
        if (rightProv) rightProv.textContent = (state.compareRight.provider || 'ollama').toUpperCase();
    } else {
        if (layout) layout.classList.add('hidden');
        if (chatViewport) chatViewport.classList.remove('hidden');
        if (toggleBtn) toggleBtn.classList.remove('active');
        // Cancel any active comparison streaming
        if (state.compareStreaming) {
            invoke('cancel_generation').catch(() => {});
            state.compareStreaming = false;
        }
    }
}

function createUserMessageEl(text, attachment = null) {
    const { wrapper, card } = createMessageShell("user");

    if (attachment && attachment.data && attachment.mime) {
        const imageWrap = document.createElement("div");
        imageWrap.style.marginBottom = "8px";
        const image = document.createElement("img");
        image.src = `data:${attachment.mime};base64,${attachment.data}`;
        image.style.maxWidth = "160px";
        image.style.maxHeight = "100px";
        image.style.borderRadius = "5px";
        image.style.border = "1px solid rgba(0,240,255,0.3)";
        image.style.display = "block";
        image.alt = attachment.name || "Attachment";
        imageWrap.appendChild(image);
        card.appendChild(imageWrap);
    }

    const textNode = document.createElement("div");
    textNode.textContent = String(text ?? "");
    card.appendChild(textNode);
    return { wrapper, card };
}

function createAiThinkingEl() {
    const { wrapper, card } = createMessageShell("ai", "thinking");
    const thinking = document.createElement("span");
    thinking.className = "thinking-dots";
    thinking.textContent = "AI is thinking";
    card.appendChild(thinking);
    return wrapper;
}

function appendCompareUserMessage(paneId, text, attachment = null) {
    const viewport = document.getElementById(`compare-viewport-${paneId}`);
    if (!viewport) return;
    const { wrapper } = createUserMessageEl(text, attachment);
    viewport.appendChild(wrapper);
    viewport.scrollTop = viewport.scrollHeight;
    return wrapper;
}

function appendCompareAiThinking(paneId) {
    const viewport = document.getElementById(`compare-viewport-${paneId}`);
    if (!viewport) return null;
    const wrapper = createAiThinkingEl();
    viewport.appendChild(wrapper);
    viewport.scrollTop = viewport.scrollHeight;
    return wrapper;
}

function resetComparePane(paneId, providerName) {
    const pane = paneId === 'left' ? state.compareLeft : state.compareRight;
    pane.provider = providerName;
    pane.currentAIMessage = null;
    pane.currentAIText = '';
    pane.totalTokens = 0;
    pane.firstChunkTime = 0;
    pane.streamStartTime = performance.now();

    const viewport = document.getElementById(`compare-viewport-${paneId}`);
    if (viewport) viewport.replaceChildren();

    const metrics = document.getElementById(`compare-metrics-${paneId}`);
    if (metrics) metrics.textContent = '';
}

function updateCompareMetrics(paneId) {
    const pane = paneId === 'left' ? state.compareLeft : state.compareRight;
    const metricsEl = document.getElementById(`compare-metrics-${paneId}`);
    if (!metricsEl) return;

    let text = '';
    if (pane.firstChunkTime > 0) {
        const latency = Math.round(pane.firstChunkTime - pane.streamStartTime);
        text += `${latency}ms`;
    }
    if (pane.totalTokens > 0) {
        if (text) text += ' · ';
        text += `${pane.totalTokens} tok`;
    }
    if (pane.firstChunkTime > 0) {
        const elapsed = (performance.now() - pane.firstChunkTime) / 1000;
        if (elapsed > 0.5) {
            const speed = Math.round(pane.totalTokens / elapsed);
            text += ` · ${speed} t/s`;
        }
    }
    metricsEl.textContent = text;
}

function finalizeComparePane(paneId) {
    const pane = paneId === 'left' ? state.compareLeft : state.compareRight;
    if (!pane.currentAIMessage) return;

    const msgCard = pane.currentAIMessage.querySelector('.message-card');
    if (msgCard) {
        const parsed = marked.parse(pane.currentAIText);
        const html = (parsed && typeof parsed.then === 'function') ? '' : window.sanitizeHtml(parsed);
        if (html !== '') {
            msgCard.innerHTML = html;
            formatCodeBlocks(msgCard);
        }
        const provider = (pane.provider || 'gemini').toUpperCase();
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const metaRow = document.createElement('div');
        metaRow.className = 'msg-meta';
        // Build via textContent to prevent any XSS from provider/timeStr values
        const modelSpan = document.createElement('span');
        modelSpan.className = 'msg-meta-model';
        modelSpan.textContent = provider;
        const sep1 = document.createElement('span');
        sep1.className = 'msg-meta-sep';
        sep1.textContent = '·';
        const timeSpan = document.createElement('span');
        timeSpan.textContent = timeStr;
        const sep2 = document.createElement('span');
        sep2.className = 'msg-meta-sep';
        sep2.textContent = '·';
        const tokSpan = document.createElement('span');
        tokSpan.textContent = `${pane.totalTokens} tokens`;
        metaRow.append(modelSpan, sep1, timeSpan, sep2, tokSpan);
        msgCard.appendChild(metaRow);
        msgCard.appendChild(makeCopyBtn(() => pane.currentAIText));
    }
    updateCompareMetrics(paneId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE ATTACHMENTS
// ═══════════════════════════════════════════════════════════════════════════════

window.pendingAttachments = [];

const TEXT_EXTENSIONS = new Set([
    'txt', 'md', 'rs', 'js', 'ts', 'py', 'json', 'yaml', 'yml', 'toml',
    'css', 'html', 'htm', 'sh', 'bash', 'zsh', 'lua', 'c', 'cpp', 'h', 'hpp',
    'go', 'java', 'kt', 'swift', 'rb', 'php', 'sql', 'log', 'ini', 'cfg',
    'conf', 'xml', 'svg', 'dart', 'scala', 'r', 'm', 'mm', 'cs', 'fs', 'hs',
    'ml', 'ex', 'exs', 'elm', 'clj', 'cljs', 'edn', 'vue', 'svelte',
]);

const IMAGE_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'tiff',
]);

function getFileExtension(name) {
    const idx = name.lastIndexOf('.');
    return idx === -1 ? '' : name.slice(idx + 1).toLowerCase();
}

function detectFileKind(name, mime) {
    const ext = getFileExtension(name);
    if (IMAGE_EXTENSIONS.has(ext) || mime.startsWith('image/')) return 'image';
    if (TEXT_EXTENSIONS.has(ext) || mime.startsWith('text/')) return 'text';
    if (mime === 'application/json') return 'text';
    return 'binary';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result);
            // Strip the data:...;base64, prefix
            const idx = result.indexOf(',');
            resolve(idx === -1 ? result : result.slice(idx + 1));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

async function processFile(file) {
    const id = 'att-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const name = file.name;
    const size = file.size;
    const mime = file.type || 'application/octet-stream';
    const kind = detectFileKind(name, mime);

    let data = '';
    if (kind === 'text') {
        if (size > 100 * 1024) {
            const text = await readFileAsText(file.slice(0, 100 * 1024));
            data = text + '\n\n[...truncated: file exceeds 100KB limit...]';
        } else {
            data = await readFileAsText(file);
        }
    } else if (kind === 'image') {
        if (size > 5 * 1024 * 1024) {
            throw new Error(`${name} exceeds 5MB image limit`);
        }
        data = await readFileAsBase64(file);
    } else {
        // Binary: read first 4KB as base64 for context
        data = await readFileAsBase64(file.slice(0, 4096));
    }

    return { id, name, size, mime, kind, data };
}

function getAttachmentIcon(kind) {
    if (kind === 'image') return createIcon('fileImage', { size: 14 });
    if (kind === 'text') return createIcon('fileCode', { size: 14 });
    return createIcon('fileBox', { size: 14 });
}

function renderAttachmentBar() {
    const bar = document.getElementById('chat-attachment-bar');
    if (!bar) return;

    if (window.pendingAttachments.length === 0) {
        bar.innerHTML = '';
        bar.classList.add('hidden');
        const screenshotBtn = document.getElementById('screenshot-btn');
        if (screenshotBtn) screenshotBtn.classList.remove('has-attachment');
        return;
    }

    bar.classList.remove('hidden');
    bar.innerHTML = '';

    window.pendingAttachments.forEach(att => {
        const pill = document.createElement('div');
        pill.className = 'chat-attachment-pill';
        pill.dataset.aid = att.id;

        const iconWrap = document.createElement('span');
        iconWrap.className = 'chat-attachment-pill-icon';
        iconWrap.innerHTML = getAttachmentIcon(att.kind);

        const info = document.createElement('div');
        info.className = 'chat-attachment-pill-info';

        const label = document.createElement('span');
        label.className = 'chat-attachment-pill-name';
        label.textContent = att.name;
        label.title = att.name;

        const size = document.createElement('span');
        size.className = 'chat-attachment-pill-size';
        size.textContent = formatFileSize(att.size);

        info.append(label, size);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'chat-attachment-pill-remove';
        removeBtn.innerHTML = createIcon('x', { size: 10 });
        removeBtn.title = 'Remove';
        removeBtn.setAttribute('aria-label', 'Remove attachment');
        removeBtn.onclick = () => removeAttachment(att.id);

        pill.append(iconWrap, info, removeBtn);
        bar.appendChild(pill);
    });

    const screenshotBtn = document.getElementById('screenshot-btn');
    if (screenshotBtn) screenshotBtn.classList.add('has-attachment');
}

function removeAttachment(id) {
    window.pendingAttachments = window.pendingAttachments.filter(a => a.id !== id);
    renderAttachmentBar();
}

export function clearAttachments() {
    window.pendingAttachments = [];
    renderAttachmentBar();
}

export async function addAttachments(files) {
    const results = [];
    for (const file of files) {
        try {
            const att = await processFile(file);
            window.pendingAttachments.push(att);
            results.push({ ok: true, name: file.name });
        } catch (err) {
            results.push({ ok: false, name: file.name, error: String(err) });
            if (typeof addNotification === 'function') {
                addNotification('Attachment Failed', `${file.name}: ${err}`, 'error');
            }
        }
    }
    renderAttachmentBar();
    const okCount = results.filter(r => r.ok).length;
    if (okCount > 0 && typeof addNotification === 'function') {
        addNotification('Files Attached', `${okCount} file(s) ready to send`, 'success');
    }
    return results;
}

function buildPromptWithAttachments(userPrompt) {
    const attachments = window.pendingAttachments;
    if (attachments.length === 0) return userPrompt;

    let prompt = userPrompt;
    prompt += '\n\n[Attached Files]\n';

    attachments.forEach(att => {
        prompt += `\n--- ${att.name} ---\n`;
        if (att.kind === 'text') {
            const ext = getFileExtension(att.name);
            prompt += '```' + ext + '\n' + att.data + '\n```\n';
        } else if (att.kind === 'image') {
            prompt += '[Image attached via vision]\n';
        } else {
            prompt += `[Binary file: ${att.name}, ${formatFileSize(att.size)}]\n`;
        }
    });

    return prompt;
}

function getFirstImageAttachment() {
    return window.pendingAttachments.find(a => a.kind === 'image') || null;
}

function ensureDropOverlay() {
    let overlay = document.getElementById('chat-drop-overlay');
    if (overlay) return overlay;
    const workspace = document.getElementById('chat-workspace');
    if (!workspace) return null;
    overlay = document.createElement('div');
    overlay.id = 'chat-drop-overlay';
    overlay.className = 'chat-drop-overlay';
    const text = document.createElement('span');
    text.className = 'chat-drop-overlay-text';
    text.textContent = 'Drop files to attach';
    overlay.appendChild(text);
    workspace.style.position = 'relative';
    workspace.appendChild(overlay);
    return overlay;
}

function showDropOverlay() {
    const overlay = ensureDropOverlay();
    if (overlay) overlay.classList.add('visible');
}

function hideDropOverlay() {
    const overlay = document.getElementById('chat-drop-overlay');
    if (overlay) overlay.classList.remove('visible');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE ACTION MENU (Fork / Edit)
// ═══════════════════════════════════════════════════════════════════════════════

function makeActionMenuBtn(msgEntry) {
    const btn = document.createElement('button');
    btn.className = 'msg-actions-btn';
    btn.title = 'Message actions';
    btn.setAttribute('aria-label', 'Message actions');
    btn.innerHTML = createIcon('moreVertical', { size: 14 });

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMessageMenu(msgEntry, btn);
    });
    return btn;
}

function toggleMessageMenu(msgEntry, anchorBtn) {
    // Close any existing menu
    document.querySelectorAll('.msg-actions-dropdown').forEach(d => d.remove());

    const dropdown = document.createElement('div');
    dropdown.className = 'msg-actions-dropdown';
    dropdown.setAttribute('role', 'menu');

    const forkItem = document.createElement('button');
    forkItem.className = 'msg-action-item';
    forkItem.innerHTML = `${createIcon('gitBranch', { size: 12 })} Fork from here`;
    forkItem.addEventListener('click', () => {
        dropdown.remove();
        triggerHaptic("medium");
        forkFromMessage(msgEntry);
    });

    const editItem = document.createElement('button');
    editItem.className = 'msg-action-item';
    editItem.innerHTML = `${createIcon('pencil', { size: 12 })} Edit & regenerate`;
    editItem.addEventListener('click', () => {
        dropdown.remove();
        triggerHaptic("medium");
        editMessageInPlace(msgEntry);
    });

    dropdown.append(forkItem, editItem);

    const card = anchorBtn.closest('.message-card');
    if (card) card.appendChild(dropdown);

    // Close on outside click
    const closeMenu = (ev) => {
        if (!dropdown.contains(ev.target)) {
            dropdown.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

function registryToBackendMessages(registry) {
    return registry.map(entry => {
        if (entry.kind === 'user') return `User: ${entry.text}`;
        if (entry.kind === 'ai') return `AI: ${entry.text}`;
        return entry.text;
    });
}

function forkFromMessage(msgEntry) {
    const idx = state.chatMessageRegistry.findIndex(r => r.id === msgEntry.id);
    if (idx === -1) return;

    const baseRegistry = state.chatMessageRegistry.slice(0, idx + 1);
    const baseMessages = registryToBackendMessages(baseRegistry);

    invoke('fork_session', { baseMessages }).then((newId) => {
        loadSession(newId);
        if (typeof addNotification === 'function') {
            addNotification('Session Forked', `Created new session: ${newId}`, 'success');
        }
    }).catch(err => {
        if (typeof addNotification === 'function') {
            addNotification('Fork Failed', String(err), 'error');
        }
    });
}

function _editBuildEditor(card, msgEntry) {
    const existingBtns = card.querySelectorAll('.msg-copy-btn, .msg-actions-btn, .msg-meta');
    existingBtns.forEach(b => b.style.display = 'none');
    const textarea = document.createElement('textarea');
    textarea.className = 'msg-edit-textarea';
    textarea.value = msgEntry.text;
    textarea.rows = 2;
    textarea.style.width = '100%';
    const actionsEl = document.createElement('div');
    actionsEl.className = 'msg-edit-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'msg-edit-save';
    saveBtn.textContent = 'Save & Fork';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'msg-edit-cancel';
    cancelBtn.textContent = 'Cancel';
    actionsEl.append(saveBtn, cancelBtn);
    const originalContent = Array.from(card.childNodes);
    card.innerHTML = '';
    card.append(textarea, actionsEl);
    textarea.focus();
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    const cleanup = () => { card.innerHTML = ''; originalContent.forEach(n => card.appendChild(n)); existingBtns.forEach(b => b.style.display = ''); };
    return { textarea, saveBtn, cancelBtn, cleanup };
}

function _editDoFork(newText, msgEntry, cleanup) {
    const idx = state.chatMessageRegistry.findIndex(r => r.id === msgEntry.id);
    if (idx === -1) { cleanup(); return; }
    state.chatMessageRegistry[idx].text = newText;
    const baseMessages = registryToBackendMessages(state.chatMessageRegistry.slice(0, idx + 1));
    invoke('fork_session', { baseMessages }).then(newId => {
        cleanup();
        loadSession(newId);
        if (typeof addNotification === 'function') addNotification('Session Forked', `Created new session: ${newId}`, 'success');
        if (msgEntry.kind === 'user') {
            const input = document.getElementById('user-input');
            if (input) { input.value = newText; input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 300) + 'px'; }
            setTimeout(() => { const sendBtn = document.getElementById('send-btn'); if (sendBtn) sendBtn.click(); }, 400);
        }
    }).catch(err => { cleanup(); if (typeof addNotification === 'function') addNotification('Fork Failed', String(err), 'error'); });
}

function editMessageInPlace(msgEntry) {
    if (!msgEntry.el) return;
    const card = msgEntry.el.querySelector('.message-card');
    if (!card) return;
    const { textarea, saveBtn, cancelBtn, cleanup } = _editBuildEditor(card, msgEntry);
    const doSave = () => { const t = textarea.value.trim(); if (t) _editDoFork(t, msgEntry, cleanup); else cleanup(); };
    saveBtn.addEventListener('click', doSave);
    cancelBtn.addEventListener('click', cleanup);
    textarea.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSave(); }
        else if (e.key === 'Escape') { e.preventDefault(); cleanup(); }
    });
    textarea.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; });
}

// ── Chat Welcome State HTML ────────────────────────────────────────────────────
const CHAT_WELCOME_HTML = `
<div class="chat-welcome" id="chat-welcome">
    <div class="chat-welcome-logo">${createIcon("brain", { size: 28 })}</div>
    <div class="chat-welcome-title">NEURODECK</div>
    <div class="chat-welcome-sub">AI-native terminal OS. Ask anything.</div>
    <div class="chat-starters-grid">
        <div class="chat-starter-card" data-prompt="Explain how RAG (Retrieval-Augmented Generation) works in plain English.">
            <div class="chat-starter-icon">${createIcon("search", { size: 18 })}</div>
            <div class="chat-starter-label">Explain RAG</div>
            <div class="chat-starter-hint">How retrieval-augmented generation works</div>
        </div>
        <div class="chat-starter-card" data-prompt="Write a Rust async HTTP handler using Axum with proper error handling using map_err.">
            <div class="chat-starter-icon">${createIcon("zap", { size: 18 })}</div>
            <div class="chat-starter-label">Rust Handler</div>
            <div class="chat-starter-hint">Async Axum endpoint with error handling</div>
        </div>
        <div class="chat-starter-card" data-prompt="Design a unique roguelike game mechanic that subverts genre expectations.">
            <div class="chat-starter-icon">${createIcon("gamepad2", { size: 18 })}</div>
            <div class="chat-starter-label">Game Mechanic</div>
            <div class="chat-starter-hint">Unique roguelike system design concept</div>
        </div>
        <div class="chat-starter-card" data-prompt="Review the following code for security vulnerabilities, bugs, and performance issues:\n\n">
            <div class="chat-starter-icon">${createIcon("shieldCheck", { size: 18 })}</div>
            <div class="chat-starter-label">Code Review</div>
            <div class="chat-starter-hint">Security, bugs, and performance audit</div>
        </div>
        <div class="chat-starter-card" data-prompt="Create a RICE-prioritized product backlog for a solo developer AI terminal app.">
            <div class="chat-starter-icon">${createIcon("chartColumn", { size: 18 })}</div>
            <div class="chat-starter-label">Sprint Planning</div>
            <div class="chat-starter-hint">RICE-scored backlog for a solo dev AI app</div>
        </div>
        <div class="chat-starter-card" data-prompt="I'm getting this error and I can't figure out why. Help me debug it:\n\n">
            <div class="chat-starter-icon">${createIcon("bug", { size: 18 })}</div>
            <div class="chat-starter-label">Debug Help</div>
            <div class="chat-starter-hint">Paste your error for AI-powered diagnosis</div>
        </div>
    </div>
</div>
`;

function wireWelcomeStarters() {
    const viewport = document.getElementById("chat-viewport");
    if (!viewport) return;
    viewport.querySelectorAll(".chat-starter-card").forEach(card => {
        card.addEventListener("click", () => {
            const prompt = card.dataset.prompt;
            if (inputElement && prompt) {
                inputElement.value = prompt;
                inputElement.focus();
                inputElement.style.height = "auto";
                inputElement.style.height = Math.min(inputElement.scrollHeight, 300) + "px";
            }
        });
    });
}

function dismissWelcome() {
    const welcome = document.getElementById("chat-welcome");
    if (welcome) welcome.remove();
}

function updateContextBar() {
    const bar = document.getElementById("chat-input-context");
    if (!bar) return;
    const provider = (state.activeProvider || "gemini").toUpperCase();
    const personaChip = document.createElement("span");
    personaChip.className = "chat-input-context-persona";

    const iconWrap = document.createElement("span");
    iconWrap.innerHTML = createIcon("brain", { size: 14 });

    const personaText = document.createElement("span");
    personaText.textContent = state.activePersona || "Default";

    const sep = document.createElement("span");
    sep.className = "chat-input-context-sep";
    sep.textContent = "·";

    const model = document.createElement("span");
    model.className = "chat-input-context-model";
    model.textContent = provider;

    personaChip.append(iconWrap.firstElementChild || iconWrap, personaText);
    bar.replaceChildren(personaChip, sep, model);
}

function appendChatMessage(kind, text, options = {}) {
    const chatViewport = document.getElementById("chat-viewport");
    const viewport = document.getElementById("chat-workspace");
    if (!chatViewport || !viewport) return null;

    const wrapper = document.createElement("div");
    wrapper.className = `message ${kind}${options.error ? " error" : ""}`;

    const card = document.createElement("div");
    card.className = "message-card";
    if (options.borderColor) {
        card.style.borderColor = options.borderColor;
    }

    if (options.strongPrefix) {
        const strong = document.createElement("strong");
        strong.textContent = options.strongPrefix;
        card.appendChild(strong);
        card.append(` ${text}`);
    } else {
        card.textContent = text;
    }

    wrapper.appendChild(card);
    chatViewport.appendChild(wrapper);
    viewport.scrollTop = viewport.scrollHeight;
    registerMessage(wrapper, kind, text, options);
    return wrapper;
}

function createMessageShell(kind, extraClass = "") {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${kind}${extraClass ? ` ${extraClass}` : ""}`;
    const card = document.createElement("div");
    card.className = "message-card";
    wrapper.appendChild(card);
    return { wrapper, card };
}

function renderSanitizedHtml(target, html) {
    target.innerHTML = window.sanitizeHtml(String(html ?? ""));
}

function appendUserMessage(text, attachment = null) {
    const chatViewport = document.getElementById("chat-viewport");
    const viewport = document.getElementById("chat-workspace");
    if (!chatViewport || !viewport) return null;

    const { wrapper, card } = createUserMessageEl(text, attachment);
    const msgEntry = registerMessage(wrapper, "user", text, {}, attachment);
    card.appendChild(makeCopyBtn(() => String(text ?? "")));
    card.appendChild(makeActionMenuBtn(msgEntry));

    chatViewport.appendChild(wrapper);
    viewport.scrollTop = viewport.scrollHeight;
    return wrapper;
}

function appendAiThinkingMessage() {
    const chatViewport = document.getElementById("chat-viewport");
    const viewport = document.getElementById("chat-workspace");
    if (!chatViewport || !viewport) return null;

    const wrapper = createAiThinkingEl();
    chatViewport.appendChild(wrapper);
    viewport.scrollTop = viewport.scrollHeight;
    registerMessage(wrapper, "ai", "", { thinking: true });
    return wrapper;
}

function buildHistoryMessage(msgStr) {
    const text = String(msgStr ?? "");
    let wrapper, kind, content;
    if (text.startsWith("User: ")) {
        const { wrapper: w, card } = createMessageShell("user");
        card.textContent = text.substring(6);
        wrapper = w; kind = "user"; content = text.substring(6);
    } else if (text.startsWith("AI: ")) {
        const { wrapper: w, card } = createMessageShell("ai");
        const parsed = marked.parse(text.substring(4));
        const html = (parsed && typeof parsed.then === 'function') ? '' : parsed;
        renderSanitizedHtml(card, html);
        formatCodeBlocks(w);
        wrapper = w; kind = "ai"; content = text.substring(4);
    } else {
        const { wrapper: w, card } = createMessageShell("system");
        card.textContent = text;
        wrapper = w; kind = "system"; content = text;
    }
    const entry = registerMessage(wrapper, kind, content);
    card.appendChild(makeCopyBtn(() => content));
    card.appendChild(makeActionMenuBtn(entry));
    return wrapper;
}

function renderSessionMessages(messages) {
    const chatViewport = document.getElementById("chat-viewport");
    const viewport = document.getElementById("chat-workspace");
    if (!chatViewport || !viewport) return;
    clearMessageRegistry();
    chatViewport.replaceChildren();
    messages.forEach((msgStr) => {
        chatViewport.appendChild(buildHistoryMessage(msgStr));
    });
    viewport.scrollTop = viewport.scrollHeight;
}

function setButtonIconLabel(button, iconName, label) {
    if (!button) return;
    const iconWrap = document.createElement("span");
    iconWrap.innerHTML = createIcon(iconName, { size: 14 });
    const labelEl = document.createElement("span");
    labelEl.className = "nd-button-label";
    labelEl.textContent = label;
    button.replaceChildren(iconWrap.firstElementChild || iconWrap, labelEl);
}

function updateSessionHeader() {
    const provider = (state.activeProvider || "gemini").toUpperCase();
    const sessionId = state.currentSessionId;

    const modelEl = document.getElementById("chat-session-model");
    if (modelEl) modelEl.textContent = provider;

    const nameEl = document.getElementById("chat-session-name");
    if (nameEl) {
        nameEl.textContent = sessionId
            ? (sessionId.length > 30 ? sessionId.slice(0, 30) + "…" : sessionId)
            : "New Session";
    }
    updateContextBar();
}

function showGenBar() {
    const bar = document.getElementById("chat-gen-bar");
    if (bar) {
        bar.classList.remove("hidden");
        const modelEl = document.getElementById("chat-gen-model");
        if (modelEl) modelEl.textContent = (state.activeProvider || "gemini").toUpperCase();
        const tokensEl = document.getElementById("chat-gen-tokens");
        if (tokensEl) tokensEl.textContent = "0 tokens";
    }
    const dot = document.getElementById("chat-status-dot");
    if (dot) dot.classList.add("streaming");
}

function hideGenBar() {
    const bar = document.getElementById("chat-gen-bar");
    if (bar) bar.classList.add("hidden");
    const dot = document.getElementById("chat-status-dot");
    if (dot) dot.classList.remove("streaming");
}

function updateGenBarTokens(count) {
    const genEl = document.getElementById("chat-gen-tokens");
    if (genEl) genEl.textContent = count + " tokens";
    const headerEl = document.getElementById("chat-session-tokens");
    if (headerEl) headerEl.textContent = count + " tokens";
}

export function appendToolPill(icon, cmd, status = "done", duration = null) {
    if (!state.currentAIMessage) return;
    const msgCard = state.currentAIMessage.querySelector(".message-card");
    if (!msgCard) return;
    const pill = document.createElement("div");
    pill.className = `tool-pill ${status}`;
    const dot = document.createElement("span");
    dot.className = "tool-pill-dot";

    const iconEl = document.createElement("span");
    iconEl.className = "tool-pill-icon";
    const iconWrap = document.createElement("span");
    const iconMarkup = createIcon(icon, { size: 14 });
    if (iconMarkup) {
        iconWrap.innerHTML = iconMarkup;
        iconEl.appendChild(iconWrap.firstElementChild || iconWrap);
    } else {
        const fallback = document.createElement("span");
        fallback.className = "tool-pill-icon-fallback";
        fallback.textContent = String(icon || "");
        iconEl.appendChild(fallback);
    }

    const cmdEl = document.createElement("span");
    cmdEl.className = "tool-pill-cmd";
    cmdEl.textContent = String(cmd ?? "");

    pill.append(dot, iconEl, cmdEl);

    if (status !== "running") {
        const statusEl = document.createElement("span");
        statusEl.className = "tool-pill-status";
        const statusWrap = document.createElement("span");
        statusWrap.innerHTML = createIcon(status === "error" ? "x" : "shieldCheck", { size: 12 });
        statusEl.appendChild(statusWrap.firstElementChild || statusWrap);
        pill.appendChild(statusEl);
    }

    if (duration) {
        const durationEl = document.createElement("span");
        durationEl.className = "tool-pill-duration";
        durationEl.textContent = String(duration);
        pill.appendChild(durationEl);
    }

    msgCard.appendChild(pill);
    const viewport = document.getElementById("chat-workspace");
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
}

function makeCopyBtn(getText) {
    const btn = document.createElement("button");
    btn.className = "msg-copy-btn";
    btn.title = "Copy message";
    btn.setAttribute("aria-label", "Copy message");
    setButtonIconLabel(btn, "copy", "Copy");
    btn.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(getText());
            triggerHaptic("doubleTick");
            setButtonIconLabel(btn, "shieldCheck", "Copied");
            setTimeout(() => {
                setButtonIconLabel(btn, "copy", "Copy");
            }, 1600);
        } catch (err) {
            setButtonIconLabel(btn, "x", "Failed");
            setTimeout(() => {
                setButtonIconLabel(btn, "copy", "Copy");
            }, 1600);
            if (typeof addNotification === "function") {
                addNotification("Copy Failed", String(err), "error");
            }
        }
    });
    return btn;
}

// Auto-growing Textarea Logic
let inputElement = null;

function updateMuteButtonUI() {
    let muteBtn = document.getElementById("mute-btn");
    if (muteBtn) {
        muteBtn.title = state.isMuted ? "Unmute Speech (Ctrl+M)" : "Mute Speech (Ctrl+M)";
        muteBtn.setAttribute("aria-label", muteBtn.title);
        applyButtonIcon("#mute-btn", {
            icon: state.isMuted ? "volumeX" : "volume2",
            iconOnly: true,
            keepBadge: true
        });
        if (state.isMuted) {
            muteBtn.classList.add("muted");
        } else {
            muteBtn.classList.remove("muted");
        }
    }
}

function toggleMute() {
    state.isMuted = !state.isMuted;
    localStorage.setItem("state.isMuted", state.isMuted);
    updateMuteButtonUI();
    appendChatMessage(
        "system",
        `System: Speech voice feedback is now ${state.isMuted ? "disabled (Muted)" : "enabled (Unmuted)"}.`
    );
}

function cleanTextForSpeech(text) {
    let clean = text.replace(/```[\s\S]*?```/g, "");
    clean = clean.replace(/`[^`]+`/g, "");
    clean = clean.replace(/[*_~#]/g, "");
    clean = clean.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
    return clean.trim();
}

// Send Message Handler
function clearPendingAttachments() {
    window.pendingAttachments = [];
    const bar = document.getElementById("chat-attachment-bar");
    if (bar) {
        bar.replaceChildren();
        bar.classList.add("hidden");
    }
    const btn = document.getElementById("screenshot-btn");
    if (btn) btn.classList.remove("has-attachment");
}

function prepareAttachmentsForSend() {
    const attachments = window.pendingAttachments || [];
    if (!attachments.length) return { attachments: [], imageAttachment: null, inlinedText: "" };

    let imageAttachment = null;
    const textParts = [];
    const nonImageAttachments = [];

    for (const att of attachments) {
        if (att.kind === 'image' && att.data && !imageAttachment) {
            imageAttachment = att;
        } else if (att.kind === 'text' && att.data) {
            const ext = att.name.split('.').pop() || 'txt';
            textParts.push(`\n--- ${att.name} ---\n\`\`\`${ext}\n${att.data}\n\`\`\``);
        } else {
            nonImageAttachments.push(att);
        }
    }

    return { attachments: nonImageAttachments, imageAttachment, inlinedText: textParts.join('\n') };
}

function _sendComparisonMode(text, imageAttachment) {
    state.compareStreaming = true;
    document.getElementById("tool-status").innerText = "Comparing...";
    resetComparePane('left', state.compareLeft.provider || state.activeProvider || 'gemini');
    resetComparePane('right', state.compareRight.provider || 'ollama');
    appendCompareUserMessage('left', text, imageAttachment);
    appendCompareUserMessage('right', text, imageAttachment);
    state.compareLeft.currentAIMessage = appendCompareAiThinking('left');
    state.compareRight.currentAIMessage = appendCompareAiThinking('right');
    const compareArgs = { prompt: text, leftProvider: state.compareLeft.provider || state.activeProvider || 'gemini', rightProvider: state.compareRight.provider || 'ollama' };
    if (imageAttachment) { compareArgs.imageBase64 = imageAttachment.data; compareArgs.imageMime = imageAttachment.mime; }
    invoke('compare_models', compareArgs).catch(err => {
        appendChatMessage("system", `Comparison error: ${String(err)}`, { error: true });
        state.compareStreaming = false;
        document.getElementById("tool-status").innerText = "Idle";
    });
}

function _sendNormalMode(text, imageAttachment) {
    dismissWelcome();
    showGenBar();
    appendUserMessage(text, imageAttachment);
    state.currentAIMessage = appendAiThinkingMessage();
    state.currentAIText = "";
    state.streamStartTime = performance.now();
    state.firstChunkTime = 0;
    state.totalTokens = 0;
    document.getElementById("latency-val").innerText = "--ms";
    document.getElementById("token-speed").innerText = "--/s";
    const viewport = document.getElementById("chat-workspace");
    viewport.scrollTop = viewport.scrollHeight;
    if (imageAttachment) {
        const provSel = document.getElementById("llm-provider-select");
        if (provSel && provSel.value !== "gemini") appendChatMessage("system", "Vision is only supported with Gemini. The image attachment will be ignored. Switch to Gemini in Settings to use vision.", { borderColor: "var(--warning-color)" });
    }
    const invokeArgs = { prompt: text };
    if (imageAttachment) { invokeArgs.imageBase64 = imageAttachment.data; invokeArgs.imageMime = imageAttachment.mime; }
    invoke('send_command', invokeArgs).catch(err => { appendChatMessage("system", String(err), { error: true, strongPrefix: "Error:" }); document.getElementById("tool-status").innerText = "Idle"; });
    document.getElementById("tool-status").innerText = "Thinking...";
}

function sendMessage() {
    let text = inputElement.value.trim();
    if (text === "") return;
    if (text === "/login") { inputElement.value = ""; inputElement.style.height = "36px"; triggerOAuthLogin(); return; }
    inputElement.value = "";
    inputElement.style.height = "36px";
    triggerHaptic("medium");
    const { imageAttachment, inlinedText } = prepareAttachmentsForSend();
    clearPendingAttachments();
    if (inlinedText) text += inlinedText;
    if (state.comparisonMode) { _sendComparisonMode(text, imageAttachment); return; }
    _sendNormalMode(text, imageAttachment);
}

function updateInputConsoleState() {
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    
    if (state.isProcessRunning) {
        userInput.placeholder = "[Terminal Executing...] Type input for process and press Enter (Ctrl+C to Terminate)";
        userInput.classList.add("terminal-input-active");
        if (sendBtn) {
            sendBtn.querySelector("span:first-child").innerText = "Send In";
            sendBtn.title = "Send Input to Process";
        }
    } else {
        userInput.placeholder = "Enter command or type message...";
        userInput.classList.remove("terminal-input-active");
        if (sendBtn) {
            sendBtn.querySelector("span:first-child").innerText = "Send";
            sendBtn.title = "Send Message";
        }
    }
}

function sendProcessInput() {
    let text = inputElement.value;
    if (text === "") return;

    invoke("write_to_process", { input: text }).then(() => {
        appendLineToTerminal(`> ${text}`, false);
    }).catch(err => {
        appendLineToTerminal(`System error sending stdin: ${err}`, true);
    });

    inputElement.value = "";
    inputElement.style.height = "36px";
}

function handleSendAction() {
    if (state.isProcessRunning) {
        sendProcessInput();
    } else {
        sendMessage();
    }
}

function appendLineToTerminal(line, isError) {
    if (!state.activeTerminalBody) return;
    const lineSpan = document.createElement("div");
    if (isError) {
        lineSpan.style.color = "var(--error-color, #FF3C5A)";
    }
    lineSpan.innerText = line;
    state.activeTerminalBody.appendChild(lineSpan);

    // Auto-scroll the terminal body
    state.activeTerminalBody.scrollTop = state.activeTerminalBody.scrollHeight;
}

function finishRunningProcess(code) {
    state.isProcessRunning = false;
    if (state.activeTerminalBody) {
        state.activeTerminalBody.classList.remove("running");
        const statusMsg = document.createElement("div");
        statusMsg.style.marginTop = "8px";
        statusMsg.style.opacity = "0.5";
        statusMsg.style.borderTop = "1px solid rgba(255, 255, 255, 0.05)";
        statusMsg.style.paddingTop = "4px";
        statusMsg.innerText = `Process exited with code ${code}`;
        state.activeTerminalBody.appendChild(statusMsg);
        state.activeTerminalBody.scrollTop = state.activeTerminalBody.scrollHeight;
    }
    if (state.activeExecuteBtn) {
        state.activeExecuteBtn.innerText = "Execute";
        state.activeExecuteBtn.disabled = false;
    }
    document.getElementById("tool-status").innerText = "Idle";
    updateInputConsoleState();
}

// Event listeners for send action
function handleInputKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendAction();
    }
    if (state.isProcessRunning && e.ctrlKey && e.key === "c") {
        e.preventDefault();
        invoke("kill_process", {  }).catch(err => console.error("Error killing process:", err));
    }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.click();
    }
}

// Send button handler registered in initChat()

function _createTermConsole(pre) {
    const existing = pre.nextElementSibling;
    if (existing && existing.classList.contains("terminal-console")) existing.remove();
    const termConsole = document.createElement("div");
    termConsole.className = "terminal-console";
    termConsole.innerHTML = `
        <div class="terminal-console-header">
            <span>Terminal Output</span>
            <button class="terminal-terminate-btn">Terminate (Ctrl+C)</button>
        </div>
        <div class="terminal-console-body running"></div>
    `;
    pre.parentNode.insertBefore(termConsole, pre.nextSibling);
    state.activeTerminalBody = termConsole.querySelector(".terminal-console-body");
    termConsole.querySelector(".terminal-terminate-btn").onclick = () => {
        invoke("kill_process", {}).catch(err => console.error("Error invoking kill_process:", err));
    };
}

async function _execCodeBlock(execBtn, pre, code, lang) {
    const confirmed = await window.showConfirm(`Execute this ${lang} snippet?`, { confirmText: "Execute", cancelText: "Cancel" });
    if (!confirmed) return;
    if (state.isProcessRunning) invoke("kill_process", {}).catch(e => console.error("Error killing process:", e));
    execBtn.innerText = "Running...";
    execBtn.disabled = true;
    state.activeExecuteBtn = execBtn;
    _createTermConsole(pre);
    state.isProcessRunning = true;
    document.getElementById("tool-status").innerText = "Executing...";
    updateInputConsoleState();
    const viewport = document.getElementById("chat-workspace");
    viewport.scrollTop = viewport.scrollHeight;
    invoke("execute_command_stream", { cmdStr: code.innerText }).catch(err => {
        appendLineToTerminal(`Error spawning process: ${err}`, true);
        finishRunningProcess(1);
    });
}

// Custom Premium Markdown Code Header / Action Injection
function _chatCodeCopyBtn(code) {
    const btn = document.createElement('button');
    btn.className = 'code-header-btn copy-btn';
    btn.innerText = 'Copy';
    btn.onclick = function() {
        navigator.clipboard.writeText(code.innerText).then(() => {
            triggerHaptic('doubleTick');
            btn.innerText = 'Copied!';
            setTimeout(() => { btn.innerText = 'Copy'; }, 2000);
        });
    };
    return btn;
}

function _chatCodeCanvasBtn(lang, code) {
    const btn = document.createElement('button');
    btn.className = 'code-header-btn canvas-export-btn';
    btn.innerText = '→ Canvas';
    btn.onclick = function() {
        window.neurodeckCanvas.loadCode(lang, code.innerText);
        const canvasTab = document.querySelector('[data-view="canvas"]');
        if (canvasTab) canvasTab.click();
        btn.innerText = 'Sent!';
        setTimeout(() => { btn.innerText = '→ Canvas'; }, 2000);
    };
    return btn;
}

function _chatCodeAddExecBtns(actions, pre, code, lang) {
    const executableLangs = ['bash', 'sh', 'powershell', 'cmd', 'zsh', 'shell'];
    if (executableLangs.includes(lang.toLowerCase())) {
        const execBtn = document.createElement('button');
        execBtn.className = 'code-header-btn execute-btn';
        execBtn.innerText = 'Execute';
        execBtn.onclick = () => _execCodeBlock(execBtn, pre, code, lang);
        actions.appendChild(execBtn);
    }
    if (lang.toLowerCase() === 'lua') {
        state.pendingLuaScript = code.innerText;
        const execBtn = document.createElement('button');
        execBtn.className = 'code-header-btn execute-btn';
        execBtn.innerText = 'Execute';
        execBtn.onclick = function() { runLuaScript(code.innerText, pre, execBtn); };
        actions.appendChild(execBtn);
    }
}

function _chatBuildCodeHeaderBar(pre) {
    if (pre.querySelector('.code-header-bar')) return;
    const code = pre.querySelector('code');
    if (!code) return;
    let lang = 'text';
    code.classList.forEach(cls => { if (cls.startsWith('language-')) lang = cls.replace('language-', ''); });
    const header = document.createElement('div');
    header.className = 'code-header-bar';
    const label = document.createElement('span');
    label.className = 'code-lang-label';
    label.innerText = lang;
    header.appendChild(label);
    const actions = document.createElement('div');
    actions.className = 'code-header-actions';
    actions.appendChild(_chatCodeCopyBtn(code));
    actions.appendChild(_chatCodeCanvasBtn(lang, code));
    _chatCodeAddExecBtns(actions, pre, code, lang);
    header.appendChild(actions);
    pre.insertBefore(header, pre.firstChild);
}

function formatCodeBlocks(container) {
    const pres = container.querySelectorAll("pre");
    pres.forEach(pre => _chatBuildCodeHeaderBar(pre));
}

function _findLuaPreElement() {
    const pres = document.querySelectorAll("pre");
    for (let i = pres.length - 1; i >= 0; i--) {
        const code = pres[i].querySelector("code");
        if (code && Array.from(code.classList).includes("language-lua")) return pres[i];
    }
    return null;
}

function _createLuaTermConsole(preElement) {
    let targetParent = document.getElementById("chat-viewport");
    let targetSibling = null;
    if (preElement) {
        const existing = preElement.nextElementSibling;
        if (existing && existing.classList.contains("terminal-console")) existing.remove();
        targetParent = preElement.parentNode;
        targetSibling = preElement.nextSibling;
    }
    const termConsole = document.createElement("div");
    termConsole.className = "terminal-console";
    termConsole.innerHTML = `
        <div class="terminal-console-header">
            <span>Lua Script Output</span>
            <button class="terminal-terminate-btn">Terminate</button>
        </div>
        <div class="terminal-console-body running"></div>
    `;
    if (preElement) targetParent.insertBefore(termConsole, targetSibling);
    else targetParent.appendChild(termConsole);
    state.activeTerminalBody = termConsole.querySelector(".terminal-console-body");
    termConsole.querySelector(".terminal-terminate-btn").onclick = () => finishRunningProcess(-1);
}

async function runLuaScript(scriptCode, preElement, execBtn) {
    if (!scriptCode || scriptCode.trim() === "") { console.warn("No Lua script to execute."); return; }
    const confirmed = await window.showConfirm("Execute this Lua script?", { confirmText: "Execute", cancelText: "Cancel" });
    if (!confirmed) return;
    if (state.isProcessRunning) invoke("kill_process", {}).catch(e => console.error("Error killing process:", e));
    if (execBtn) { execBtn.innerText = "Running..."; execBtn.disabled = true; state.activeExecuteBtn = execBtn; }
    if (!preElement) preElement = _findLuaPreElement();
    _createLuaTermConsole(preElement);
    state.isProcessRunning = true;
    document.getElementById("tool-status").innerText = "Executing...";
    updateInputConsoleState();
    const viewport = document.getElementById("chat-workspace");
    viewport.scrollTop = viewport.scrollHeight;
    invoke("execute_lua", { code: scriptCode }).catch(err => { appendLineToTerminal(`Error executing Lua: ${err}`, true); finishRunningProcess(1); });
}

listen("rag_sources", function (event) {
    try {
        state.currentRagSources = JSON.parse(event.payload);
    } catch(e) {
        console.error("Failed to parse RAG sources", e);
    }
});

// Listen for stream events
listen("stream_chunk", function (event) {
    let chunk = event.payload;
    if (state.currentAIMessage) {
        if (state.currentAIMessage.classList.contains("thinking")) {
            state.currentAIMessage.classList.remove("thinking");
            const msgCard = state.currentAIMessage.querySelector(".message-card");
            if (msgCard) {
                msgCard.innerHTML = "";
            }
        }
        state.currentAIText += chunk;
        
        // Latency and Tokens Speed Calculation
        state.totalTokens += chunk.split(/\s+/).filter(Boolean).length || 1;
        updateGenBarTokens(state.totalTokens);
        if (state.firstChunkTime === 0) {
            state.firstChunkTime = performance.now();
            let latency = Math.round(state.firstChunkTime - state.streamStartTime);
            document.getElementById("latency-val").innerText = latency + "ms";
        }
        let elapsedSecs = (performance.now() - state.firstChunkTime) / 1000;
        if (elapsedSecs > 0.5) {
            let speed = Math.round(state.totalTokens / elapsedSecs);
            document.getElementById("token-speed").innerText = speed + " t/s";
        }

        renderAiMessageText(state.currentAIMessage, state.currentAIText);
        
        let viewport = document.getElementById("chat-workspace");
        let isAtBottom = (viewport.scrollHeight - viewport.clientHeight) - viewport.scrollTop < 100;
        if (isAtBottom) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
    triggerHaptic("tick");
    // Forward token to any connected remote clients
    invoke("remote_send_to_clients", {
        message: JSON.stringify({ type: "chat_token", text: chunk, done: false })
    }).catch(() => {});
});

listen("stream_error", function (event) {
    let err = event.payload;
    if (typeof window.announceToScreenReader === 'function') {
        window.announceToScreenReader(`Chat error: ${String(err)}`);
    }
    triggerHaptic("error");
    appendChatMessage("system", String(err), { error: true, strongPrefix: "Error:" });
    let viewport = document.getElementById("chat-workspace");
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
    document.getElementById("tool-status").innerText = "Idle";
    // Reset AI message state so stale cards don't accumulate
    state.currentAIMessage = null;
    state.currentAIText = "";
});

function _chatBuildRagSourceItem(src, idx) {
  const srcEl = document.createElement("div");
  srcEl.className = "rag-source-item";
  const srcHeader = document.createElement("div");
  srcHeader.className = "rag-source-header";
  srcHeader.innerHTML = `<span class="rag-source-chip">[${idx + 1}]</span> <span class="rag-source-title">${window.sanitizeHtml(src.title || src.id)}</span> <span class="rag-source-role">${window.sanitizeHtml(src.role)}</span>`;
  const srcSnippet = document.createElement("div");
  srcSnippet.className = "rag-source-snippet";
  srcSnippet.innerText = src.content_snippet;
  srcEl.onclick = () => {
    const searchInput = document.getElementById("memory-search-input");
    if (searchInput) searchInput.value = src.id;
    const memoryTab = document.querySelector('[data-view="memory"]');
    if (memoryTab) memoryTab.click();
  };
  srcEl.appendChild(srcHeader);
  srcEl.appendChild(srcSnippet);
  return srcEl;
}

function _chatBuildRagSourcesUI(ragSources, msgCard) {
  if (!ragSources || ragSources.length === 0) return;
  const ragContainer = document.createElement("div");
  ragContainer.className = "rag-sources-container";
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "rag-sources-toggle";
  toggleBtn.innerHTML = `<span class="rag-toggle-text">📚 Injected Context (${ragSources.length})</span><span class="rag-toggle-icon">▼</span>`;
  const listEl = document.createElement("div");
  listEl.className = "rag-sources-list";
  listEl.style.display = "none";
  toggleBtn.onclick = () => {
    const isHidden = listEl.style.display === "none";
    listEl.style.display = isHidden ? "block" : "none";
    toggleBtn.querySelector(".rag-toggle-icon").innerText = isHidden ? "▲" : "▼";
  };
  ragSources.forEach((src, idx) => listEl.appendChild(_chatBuildRagSourceItem(src, idx)));
  ragContainer.appendChild(toggleBtn);
  ragContainer.appendChild(listEl);
  msgCard.appendChild(ragContainer);
}

function _chatFinalizeStreamMessage(msgCard, capturedText, finalTokens, provider, timeStr, msgId) {
  const metaRow = document.createElement("div");
  metaRow.className = "msg-meta";
  const modelEl = document.createElement("span"); modelEl.className = "msg-meta-model"; modelEl.textContent = provider;
  const sepA = document.createElement("span"); sepA.className = "msg-meta-sep"; sepA.textContent = "·";
  const timeEl = document.createElement("span"); timeEl.textContent = timeStr;
  const sepB = document.createElement("span"); sepB.className = "msg-meta-sep"; sepB.textContent = "·";
  const tokenEl = document.createElement("span"); tokenEl.textContent = `${finalTokens} tokens`;
  metaRow.append(modelEl, sepA, timeEl, sepB, tokenEl);
  msgCard.appendChild(metaRow);
  msgCard.appendChild(makeCopyBtn(() => capturedText));
  const reg = state.chatMessageRegistry.find(r => r.id === msgId);
  if (reg) msgCard.appendChild(makeActionMenuBtn(reg));
  _chatBuildRagSourcesUI(state.currentRagSources, msgCard);
  state.currentRagSources = null;
}

listen("stream_done", function () {
    triggerHaptic("success");
    document.getElementById("tool-status").innerText = "Idle";
    hideGenBar();
    if (state.currentAIMessage) {
        const msgCard = state.currentAIMessage.querySelector(".message-card");
        if (msgCard) {
            renderAiMessageText(state.currentAIMessage, state.currentAIText);
            const capturedText = state.currentAIText;
            const finalTokens = state.totalTokens;
            const provider = (state.activeProvider || "gemini").toUpperCase();
            const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const msgId = state.currentAIMessage.dataset.msgId;
            if (msgId) { const reg = state.chatMessageRegistry.find(r => r.id === msgId); if (reg) reg.text = capturedText; }
            _chatFinalizeStreamMessage(msgCard, capturedText, finalTokens, provider, timeStr, msgId);
        }
        if (typeof window.announceToScreenReader === 'function') {
            const preview = state.currentAIText.slice(0, 120).replace(/\s+/g, ' ').trim();
            window.announceToScreenReader(`Response received. ${preview}${state.currentAIText.length > 120 ? '...' : ''}`);
        }
    }
    const _ttsMode = localStorage.getItem("neurodeck_tts_mode") || "complete";
    if (!state.isMuted && _ttsMode === "complete" && state.currentAIText && state.currentAIText.trim().length > 0) {
        let speechText = cleanTextForSpeech(state.currentAIText);
        if (speechText.length > 0) invoke("speak_text", { text: speechText }).catch(err => console.error("TTS Error:", err));
    }
    state.currentAIMessage = null;
    state.currentAIText = "";
    invoke("remote_send_to_clients", { message: JSON.stringify({ type: "chat_token", text: "", done: true }) }).catch(() => {});
    refreshSessionsList();
    updateContextDrawer();
});

// Streaming TTS — speak each sentence as it arrives (mode: "stream")
listen("tts_chunk", function (event) {
    const ttsMode = localStorage.getItem("neurodeck_tts_mode") || "complete";
    if (ttsMode !== "stream" || state.isMuted) return;
    const text = event.payload;
    if (!text || !text.trim()) return;
    invoke("speak_text_stream", { text }).catch(() => {});
});

// Listen for command stream events
listen("command_stdout", function (event) {
    const line = event.payload;
    appendLineToTerminal(line, false);
});

listen("command_stderr", function (event) {
    const line = event.payload;
    appendLineToTerminal(line, true);
});

listen("command_exit", function (event) {
    const code = event.payload;
    finishRunningProcess(code);
});

// ── Comparison Mode Event Listeners ───────────────────────────────────────────

listen("compare_stream_chunk", function (event) {
    const { pane, text } = event.payload;
    const paneState = pane === 'left' ? state.compareLeft : state.compareRight;
    if (!paneState.currentAIMessage) return;

    if (paneState.currentAIMessage.classList.contains('thinking')) {
        paneState.currentAIMessage.classList.remove('thinking');
        const msgCard = paneState.currentAIMessage.querySelector('.message-card');
        if (msgCard) msgCard.innerHTML = '';
    }

    paneState.currentAIText += text;
    paneState.totalTokens += text.split(/\s+/).filter(Boolean).length || 1;

    if (paneState.firstChunkTime === 0) {
        paneState.firstChunkTime = performance.now();
    }

    const msgCard = paneState.currentAIMessage.querySelector('.message-card');
    if (msgCard) {
        const parsed = marked.parse(paneState.currentAIText);
        const html = (parsed && typeof parsed.then === 'function') ? '' : window.sanitizeHtml(parsed);
        if (html !== '') {
            msgCard.innerHTML = html;
            formatCodeBlocks(msgCard);
        }
    }

    const viewport = document.getElementById(`compare-viewport-${pane}`);
    if (viewport) {
        const isAtBottom = (viewport.scrollHeight - viewport.clientHeight) - viewport.scrollTop < 100;
        if (isAtBottom) viewport.scrollTop = viewport.scrollHeight;
    }

    updateCompareMetrics(pane);
    triggerHaptic("tick");
});

listen("compare_stream_done", function (event) {
    const { pane } = event.payload;
    finalizeComparePane(pane);
    triggerHaptic("success");

    // Check if both panes are done
    const leftDone = !state.compareLeft.currentAIMessage || !state.compareLeft.currentAIMessage.classList.contains('thinking');
    const rightDone = !state.compareRight.currentAIMessage || !state.compareRight.currentAIMessage.classList.contains('thinking');
    if (leftDone && rightDone) {
        state.compareStreaming = false;
        document.getElementById("tool-status").innerText = "Idle";
    }
});

listen("compare_stream_error", function (event) {
    triggerHaptic("error");
    const { pane, error } = event.payload;
    const paneState = pane === 'left' ? state.compareLeft : state.compareRight;

    if (paneState.currentAIMessage) {
        paneState.currentAIMessage.classList.remove('thinking');
        const msgCard = paneState.currentAIMessage.querySelector('.message-card');
        if (msgCard) {
            msgCard.innerHTML = `<div style="color:var(--error-color)"><strong>Error:</strong> ${window.sanitizeHtml(String(error))}</div>`;
        }
    }

    const viewport = document.getElementById(`compare-viewport-${pane}`);
    if (viewport) viewport.scrollTop = viewport.scrollHeight;

    state.compareStreaming = false;
    document.getElementById("tool-status").innerText = "Idle";
});

// Audio Recording Logic
// let isRecording = false; (Moved to state.js)
let micBtn = null;

function handleMicAction() {
    let chatViewport = document.getElementById("chat-viewport");
    let viewport = document.getElementById("chat-workspace");
    if (!state.isRecording) {
        state.isRecording = true;
        applyButtonIcon("#mic-btn", { icon: "x", iconOnly: true });
        micBtn.classList.add("recording");
        invoke("start_recording").then((msg) => {
            appendChatMessage("system", `System: ${String(msg)}`);
        }).catch((err) => {
            state.isRecording = false;
            applyButtonIcon("#mic-btn", { icon: "mic", iconOnly: true });
            micBtn.classList.remove("recording");
            appendChatMessage("system", `System error starting recording: ${String(err)}`, { error: true });
        });
    } else {
        state.isRecording = false;
        applyButtonIcon("#mic-btn", { icon: "mic", iconOnly: true });
        micBtn.classList.remove("recording");
        
        const div = appendChatMessage("system", "System: Processing audio...");
        const messageCard = div?.querySelector(".message-card");

        invoke("stop_recording").then((text) => {
            inputElement.value = text;
            inputElement.style.height = "auto";
            inputElement.style.height = (inputElement.scrollHeight) + "px";
            inputElement.focus();
            
            if (messageCard) messageCard.textContent = "System: Audio transcribed.";
        }).catch((err) => {
            if (div) div.className = "message system error";
            if (messageCard) {
                messageCard.textContent = "System error stop recording/transcribing: " + err;
            }
        });
    }
}

// Sessions History Management (Sidebar UI)
function _buildSessionItem(sid) {
    const item = document.createElement("div");
    item.className = "history-item";
    if (sid === state.currentSessionId) item.classList.add("active");
    const title = document.createElement("span");
    title.className = "history-title";
    title.innerText = sid;
    title.onclick = () => loadSession(sid);
    item.appendChild(title);
    const actions = document.createElement("div");
    actions.className = "history-actions";
    const exportBtn = document.createElement("button");
    exportBtn.className = "history-action-btn";
    exportBtn.title = "Export to Markdown";
    exportBtn.setAttribute("aria-label", "Export to Markdown");
    exportBtn.innerHTML = createIcon("upload", { size: 14 });
    exportBtn.onclick = e => {
        e.stopPropagation();
        invoke("export_session_markdown", { id: sid })
            .then(msg => addNotification('Export Complete', msg, 'success'))
            .catch(err => addNotification('Export Failed', String(err), 'error'));
    };
    actions.appendChild(exportBtn);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "history-action-btn";
    deleteBtn.title = "Delete Session";
    deleteBtn.setAttribute("aria-label", "Delete Session");
    deleteBtn.innerHTML = createIcon("trash2", { size: 14 });
    deleteBtn.onclick = async e => {
        e.stopPropagation();
        const confirmed = await showConfirm(`Delete session ${sid}?`, { confirmText: "Delete", cancelText: "Keep" });
        if (confirmed) invoke("delete_session", { id: sid }).then(() => {
            if (sid === state.currentSessionId) startNewSession(); else refreshSessionsList();
        });
    };
    actions.appendChild(deleteBtn);
    item.appendChild(actions);
    return item;
}

function refreshSessionsList() {
    invoke("list_sessions").then((sessions) => {
        const historyContainer = document.getElementById("sidebar-history");
        historyContainer.replaceChildren();
        const groupLabel = document.createElement("div");
        groupLabel.className = "history-group-label";
        groupLabel.textContent = "Recent Sessions";
        historyContainer.appendChild(groupLabel);
        
        if (sessions.length === 0) {
            const noSessions = document.createElement("div");
            noSessions.style.padding = "10px 12px";
            noSessions.style.opacity = "0.4";
            noSessions.style.fontSize = "0.8rem";
            noSessions.innerText = "No saved sessions";
            historyContainer.appendChild(noSessions);
            return;
        }

        sessions.forEach(sid => historyContainer.appendChild(_buildSessionItem(sid)));
    }).catch(err => {
        console.error("Error listing sessions:", err);
    });
}

function loadSession(sid) {
    invoke("load_session_by_id", { id: sid }).then((data) => {
        applyLoadedSessionData(data);
    }).catch((err) => {
        appendChatMessage("system", `Error loading session: ${String(err)}`, { error: true });
    });
}

function startNewSession() {
    invoke("new_session").then((newId) => {
        state.currentSessionId = newId;
        const sidEl = document.getElementById("session-id");
        if (sidEl) sidEl.innerText = state.currentSessionId;
        const stitleEl = document.getElementById("session-title");
        if (stitleEl) stitleEl.innerText = "New Session";

        const chatViewport = document.getElementById("chat-viewport");
        clearMessageRegistry();
        renderSanitizedHtml(chatViewport, CHAT_WELCOME_HTML);
        wireWelcomeStarters();

        // Reset session header
        const nameEl = document.getElementById("chat-session-name");
        if (nameEl) nameEl.textContent = "New Session";
        const tokensEl = document.getElementById("chat-session-tokens");
        if (tokensEl) tokensEl.textContent = "0 tokens";

        refreshSessionsList();
    }).catch(err => {
        console.error("Error starting new session:", err);
    });
}

// new-chat-btn handler registered in initChat()

// Keydown shortcuts for Save/Load/Record/Mute
// Backtick (`) — toggle radial menu for keyboard/desktop testing
function _chatKeyCtrlAlt(e) {
    if (!e.ctrlKey || !e.altKey) return;
    if (e.key === "1") { e.preventDefault(); const sidebar = document.getElementById("sidebar"); if (sidebar) sidebar.classList.toggle("collapsed"); }
    if (e.key === "2") { e.preventDefault(); const inspectDrawer = document.getElementById("inspect-drawer"); if (inspectDrawer) inspectDrawer.classList.toggle("collapsed"); }
    if (e.key === "3") { e.preventDefault(); const clearBtn = document.getElementById("canvas-clear-btn"); if (clearBtn) clearBtn.click(); }
    if (e.key === "4") { e.preventDefault(); cycleTheme(); }
}

function _chatKeyCtrlSearch(e) {
    if (!e.ctrlKey || e.key !== "f") return;
    e.preventDefault();
    const chatView = document.getElementById("view-chat");
    if (chatView && chatView.classList.contains("active")) {
        if (state.chatSearch.open) { closeChatSearch(); } else { openChatSearch(); }
    }
}

function _chatKeyCtrlSaveLoad(e) {
    if (!e.ctrlKey) return;
    if (e.key === "s") {
        e.preventDefault();
        invoke("save_session").then((msg) => {
            appendChatMessage("system", `System: ${String(msg)}`);
            const stitleEl = document.getElementById("session-title");
            if (stitleEl) stitleEl.innerText = "Session: " + state.currentSessionId;
            refreshSessionsList();
        }).catch((err) => { appendChatMessage("system", `System error saving session: ${String(err)}`, { error: true }); });
    }
    if (e.key === "l") {
        e.preventDefault();
        invoke("load_latest_session").then((data) => { applyLoadedSessionData(data); })
          .catch((err) => { appendChatMessage("system", `Error loading session: ${String(err)}`, { error: true }); });
    }
}

function _chatKeyCtrlAction(e) {
    if (!e.ctrlKey && e.key !== "Escape") return;
    if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        if (state.pendingLuaScript) { runLuaScript(state.pendingLuaScript); }
        else { appendChatMessage("system", "System: No pending Lua script found in chat to execute.", { error: true }); }
    }
    if (e.ctrlKey && e.key === "r") { e.preventDefault(); const micBtn = document.getElementById("mic-btn"); if (micBtn) micBtn.click(); }
    if (e.ctrlKey && e.key === "m") { e.preventDefault(); toggleMute(); }
    if (e.ctrlKey && e.key === "n") { e.preventDefault(); startNewSession(); }
    if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        if (state.availablePersonas.length > 0) {
            let currentIndex = state.availablePersonas.indexOf(state.activePersona);
            let nextPersona = state.availablePersonas[(currentIndex + 1) % state.availablePersonas.length];
            invoke("set_persona", { name: nextPersona }).then((msg) => {
                state.activePersona = nextPersona;
                let select = document.getElementById("persona-select");
                if (select) select.value = nextPersona;
                appendChatMessage("system", `System: Persona cycled to ${nextPersona}`);
            }).catch((err) => { console.error("Error cycling persona:", err); });
        }
    }
    if (e.key === "Escape" && state.currentAIMessage !== null) {
        e.preventDefault();
        invoke("cancel_generation").catch((err) => { console.error("Error cancelling generation:", err); });
    }
}

window.addEventListener("keydown", function(e) {
    _chatKeyCtrlAlt(e);
    _chatKeyCtrlSearch(e);
    _chatKeyCtrlSaveLoad(e);
    _chatKeyCtrlAction(e);
});

// Arrow keys and number keys to cycle/select radial segments when menu is open
window.addEventListener("keydown", function(e) {
    if (!state.radialMenuVisible) return;
    const keyToSeg = { ArrowUp: 0, ArrowRight: 2, ArrowDown: 4, ArrowLeft: 6 };
    if (e.key in keyToSeg) {
        e.preventDefault();
        updateRadialDisplay(keyToSeg[e.key]);
        return;
    }
    // Number keys 1-9,0 for direct segment selection (1=Chat, 2=Canvas, etc.)
    if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const num = e.key === "0" ? 9 : parseInt(e.key, 10) - 1;
        if (num >= 0 && num < 12) {
            updateRadialDisplay(num);
            setTimeout(() => {
                activateRadialSegment(num);
                hideRadialMenu();
            }, 120);
        }
        return;
    }
    if (e.key === "Enter") {
        e.preventDefault();
        activateRadialSegment(state.radialSelectedSegment);
        hideRadialMenu();
        return;
    }
    if (e.key === "Escape") {
        e.preventDefault();
        hideRadialMenu();
        return;
    }
});


// Listen for persona changes from backend commands
listen("persona_changed", function(event) {
    state.activePersona = event.payload;
    let select = document.getElementById("persona-select");
    if (select) {
        select.value = state.activePersona;
    }
});

function handlePersonaChange() {
    let val = this.value;
    invoke("set_persona", { name: val }).then((msg) => {
        state.activePersona = val;
        updateSessionHeader();
        let chatViewport = document.getElementById("chat-viewport");
        let viewport = document.getElementById("chat-workspace");
        appendChatMessage("system", `System: ${String(msg)}`);
    });
}

function handleThemeChange() {
    let val = this.value;
    invoke("set_theme", { name: val }).then((theme) => {
        if (theme) {
            applyThemeColors(theme);
            localStorage.setItem("selectedTheme", val);
            
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            appendChatMessage("system", `System: Theme applied and saved: ${val}`);
        }
    });
}



export {
    updateMuteButtonUI,
    toggleMute,
    cleanTextForSpeech,
    sendMessage,
    updateInputConsoleState,
    sendProcessInput,
    handleSendAction,
    appendLineToTerminal,
    finishRunningProcess,
    formatCodeBlocks,
    runLuaScript,
    refreshSessionsList,
    loadSession,
    startNewSession,
};

// ── initChat helpers ──────────────────────────────────────────────────────────
function _chatWireInputListeners() {
    if (!inputElement) return;
    inputElement.addEventListener("input", function() { this.style.height = "auto"; this.style.height = (this.scrollHeight) + "px"; });
    inputElement.addEventListener("keydown", handleInputKeydown);
    inputElement.addEventListener('paste', e => {
        const items = e.clipboardData?.items; if (!items) return;
        const files = [];
        for (const item of items) { if (item.kind === 'file') { const f = item.getAsFile(); if (f) files.push(f); } }
        if (files.length) { e.preventDefault(); addAttachments(files); }
    });
}
function _chatWireBasicButtons() {
    const sendBtn = document.getElementById("send-btn"); if (sendBtn) sendBtn.onclick = handleSendAction;
    if (micBtn) micBtn.onclick = handleMicAction;
    const newChatBtn = document.getElementById("new-chat-btn"); if (newChatBtn) newChatBtn.onclick = startNewSession;
    const newChatBtnHeader = document.getElementById("new-chat-btn-header"); if (newChatBtnHeader) newChatBtnHeader.onclick = startNewSession;
    const compareToggleBtn = document.getElementById("compare-toggle-btn"); if (compareToggleBtn) compareToggleBtn.onclick = toggleComparisonMode;
    const personaSelect = document.getElementById("persona-select"); if (personaSelect) personaSelect.onchange = handlePersonaChange;
    const themeSelect = document.getElementById("theme-select"); if (themeSelect) themeSelect.onchange = handleThemeChange;
    const muteBtn = document.getElementById("mute-btn"); if (muteBtn) muteBtn.onclick = function() { toggleMute(); };
}
function _chatWireExportDropdown() {
    const exportBtn = document.getElementById("chat-export-btn");
    const exportMenu = document.getElementById("chat-export-menu");
    if (!exportBtn || !exportMenu) return;
    exportBtn.addEventListener("click", e => {
        e.stopPropagation();
        const open = !exportMenu.classList.contains("hidden");
        exportMenu.classList.toggle("hidden", open);
        exportBtn.setAttribute("aria-expanded", String(!open));
    });
    exportMenu.querySelectorAll(".chat-export-item").forEach(item => {
        item.addEventListener("click", async () => {
            exportMenu.classList.add("hidden"); exportBtn.setAttribute("aria-expanded", "false");
            const fmt = item.dataset.format;
            try {
                const sessionId = document.getElementById("chat-session-name")?.dataset?.sessionId || window.__currentSessionId || "";
                if (!sessionId) { addNotification("Export", "Save the session first (Ctrl+S), then export.", "info"); return; }
                const content = await invoke("export_session_content", { id: sessionId, format: fmt });
                await navigator.clipboard.writeText(content);
                addNotification("Exported", `Session copied as ${fmt.toUpperCase()} to clipboard.`, "success");
            } catch (err) { addNotification("Export Failed", String(err), "error"); }
        });
    });
    document.addEventListener("click", () => { exportMenu.classList.add("hidden"); exportBtn.setAttribute("aria-expanded", "false"); });
}
function _chatWireAttachments() {
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    if (!attachBtn || !fileInput) return;
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
        if (e.target.files && e.target.files.length) { addAttachments(Array.from(e.target.files)); fileInput.value = ''; }
    });
}
function _chatWireDragDrop() {
    const chatWorkspace = document.getElementById('chat-workspace'); if (!chatWorkspace) return;
    let dropCounter = 0;
    chatWorkspace.addEventListener('dragenter', e => { e.preventDefault(); dropCounter++; showDropOverlay(); });
    chatWorkspace.addEventListener('dragleave', e => { e.preventDefault(); dropCounter--; if (dropCounter <= 0) hideDropOverlay(); });
    chatWorkspace.addEventListener('dragover', e => { e.preventDefault(); });
    chatWorkspace.addEventListener('drop', e => {
        e.preventDefault(); dropCounter = 0; hideDropOverlay();
        const files = e.dataTransfer?.files;
        if (files && files.length) addAttachments(Array.from(files));
    });
}

export function initChat() {
    inputElement = document.getElementById("user-input");
    micBtn = document.getElementById("mic-btn");
    _chatWireInputListeners();
    _chatWireBasicButtons();
    _chatWireExportDropdown();
    updateMuteButtonUI();
    const chatViewport = document.getElementById("chat-viewport");
    if (chatViewport && !chatViewport.querySelector(".message")) { renderSanitizedHtml(chatViewport, CHAT_WELCOME_HTML); wireWelcomeStarters(); }
    setTimeout(updateSessionHeader, 300);
    initChatSearch();
    const genStopBtn = document.getElementById("chat-gen-stop");
    if (genStopBtn) {
        genStopBtn.onclick = () => invoke("cancel_generation").catch(err => {
            console.error("Error cancelling generation:", err);
            if (typeof addNotification === "function") addNotification("Stop Failed", `Could not cancel: ${err}`, "error");
        });
    }
    initMessageObserver();
    setSlashClearHandler(startNewSession);
    initSlashCommands();
    _chatWireAttachments();
    _chatWireDragDrop();
}

function renderAiMessageText(el, text) {
    const msgCard = el?.querySelector(".message-card");
    if (msgCard) {
        const parsed = marked.parse(text);
        const html = (parsed && typeof parsed.then === 'function') ? '' : window.sanitizeHtml(parsed);
        if (html !== '') {
            msgCard.innerHTML = html;
            formatCodeBlocks(msgCard);
        }
    }
}

function applyLoadedSessionData(data) {
    state.currentSessionId = data.session_id;
    const sidEl = document.getElementById("session-id");
    if (sidEl) sidEl.innerText = state.currentSessionId;
    const stitleEl = document.getElementById("session-title");
    if (stitleEl) stitleEl.innerText = "Session: " + state.currentSessionId;

    renderSessionMessages(data.messages);
    appendChatMessage("system", `System: Loaded session ${state.currentSessionId}`);
    refreshSessionsList();
}
