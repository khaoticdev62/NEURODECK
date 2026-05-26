import { state } from './state.js';
import { createIcon } from './icons.js';
import { addNotification } from './notifications.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SLASH COMMAND PALETTE
// ═══════════════════════════════════════════════════════════════════════════════

const SLASH_COMMANDS = [
    {
        id: 'explain',
        label: 'Explain like I\'m 5',
        desc: 'Simplify a concept in plain English',
        icon: 'bookOpen',
        template: 'Explain this like I\'m 5 years old: ',
    },
    {
        id: 'code',
        label: 'Write Code',
        desc: 'Generate code for a given task',
        icon: 'code',
        template: 'Write code for: ',
    },
    {
        id: 'fix',
        label: 'Fix Code',
        desc: 'Debug and fix provided code',
        icon: 'bug',
        template: 'Fix this code and explain what was wrong:\n\n```\n\n```',
    },
    {
        id: 'summarize',
        label: 'Summarize Chat',
        desc: 'Summarize the last messages in this session',
        icon: 'fileText',
        template: 'Summarize our conversation so far.',
    },
    {
        id: 'model',
        label: 'Switch Model',
        desc: 'Change the active LLM provider',
        icon: 'cpu',
        template: '/model ',
        action: 'model',
    },
    {
        id: 'clear',
        label: 'Clear Chat',
        desc: 'Clear the current chat session',
        icon: 'trash2',
        template: '',
        action: 'clear',
    },
    {
        id: 'help',
        label: 'Help',
        desc: 'Show available slash commands',
        icon: 'helpCircle',
        template: 'What can you help me with?',
    },
];

let slashPaletteEl = null;

function getOrCreatePalette() {
    if (slashPaletteEl) return slashPaletteEl;
    const input = document.getElementById('user-input');
    if (!input) return null;
    const wrapper = input.closest('.input-textarea-wrapper');
    if (!wrapper) return null;

    const palette = document.createElement('div');
    palette.className = 'slash-palette hidden';
    palette.id = 'slash-palette';
    palette.setAttribute('role', 'listbox');
    palette.setAttribute('aria-label', 'Slash commands');
    wrapper.style.position = 'relative';
    wrapper.appendChild(palette);
    slashPaletteEl = palette;
    return palette;
}

function buildPaletteItems(filter = '') {
    const palette = getOrCreatePalette();
    if (!palette) return;
    const cmds = SLASH_COMMANDS.filter(c =>
        c.label.toLowerCase().includes(filter.toLowerCase()) ||
        c.id.toLowerCase().includes(filter.toLowerCase())
    );
    palette.replaceChildren();
    if (cmds.length === 0) {
        palette.classList.add('hidden');
        state.slashPaletteOpen = false;
        return;
    }

    cmds.forEach((cmd, idx) => {
        const item = document.createElement('div');
        item.className = 'slash-cmd';
        item.dataset.index = idx;
        item.dataset.id = cmd.id;
        item.setAttribute('role', 'option');
        if (idx === state.slashPaletteSelected) {
            item.classList.add('selected');
            item.setAttribute('aria-selected', 'true');
        }

        const iconWrap = document.createElement('span');
        iconWrap.className = 'slash-cmd-icon';
        iconWrap.innerHTML = createIcon(cmd.icon, { size: 16 });

        const info = document.createElement('div');
        info.className = 'slash-cmd-info';

        const label = document.createElement('div');
        label.className = 'slash-cmd-label';
        label.textContent = '/' + cmd.id + ' — ' + cmd.label;

        const desc = document.createElement('div');
        desc.className = 'slash-cmd-desc';
        desc.textContent = cmd.desc;

        info.append(label, desc);
        item.append(iconWrap, info);

        item.addEventListener('click', () => {
            executeSlashCommand(cmd);
        });

        palette.appendChild(item);
    });

    palette.classList.remove('hidden');
    state.slashPaletteOpen = true;
}

let _onClearSession = null;
export function setSlashClearHandler(fn) { _onClearSession = fn; }

function executeSlashCommand(cmd) {
    const input = document.getElementById('user-input');
    if (!input) return;

    hideSlashPalette();

    if (cmd.action === 'clear') {
        input.value = '';
        input.style.height = '36px';
        if (typeof _onClearSession === 'function') _onClearSession();
        return;
    }

    if (cmd.action === 'model') {
        input.value = cmd.template;
        input.focus();
        // Show model hint
        const prov = state.activeProvider || 'gemini';
        input.value = cmd.template + prov;
        input.setSelectionRange(cmd.template.length, input.value.length);
        return;
    }

    input.value = cmd.template;
    input.focus();
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 300) + 'px';
    // Place cursor at end if template ends with space
    if (cmd.template.endsWith(' ')) {
        input.setSelectionRange(input.value.length, input.value.length);
    }
}

export function hideSlashPalette() {
    if (slashPaletteEl) {
        slashPaletteEl.classList.add('hidden');
        slashPaletteEl.replaceChildren();
    }
    state.slashPaletteOpen = false;
    state.slashPaletteSelected = 0;
    state.slashPaletteFilter = '';
}

function updatePaletteSelection(delta) {
    const items = slashPaletteEl?.querySelectorAll('.slash-cmd');
    if (!items || items.length === 0) return;
    items.forEach(el => {
        el.classList.remove('selected');
        el.setAttribute('aria-selected', 'false');
    });
    state.slashPaletteSelected += delta;
    if (state.slashPaletteSelected < 0) state.slashPaletteSelected = items.length - 1;
    if (state.slashPaletteSelected >= items.length) state.slashPaletteSelected = 0;
    const selected = items[state.slashPaletteSelected];
    if (selected) {
        selected.classList.add('selected');
        selected.setAttribute('aria-selected', 'true');
        selected.scrollIntoView({ block: 'nearest' });
    }
}

function confirmPaletteSelection() {
    const items = slashPaletteEl?.querySelectorAll('.slash-cmd');
    if (!items) return;
    const selected = items[state.slashPaletteSelected];
    if (selected) {
        const cmdId = selected.dataset.id;
        const cmd = SLASH_COMMANDS.find(c => c.id === cmdId);
        if (cmd) executeSlashCommand(cmd);
    }
}

export function handleSlashInput(e) {
    const input = e.target;
    const val = input.value;

    // Detect slash at start
    if (val.startsWith('/')) {
        const afterSlash = val.substring(1);
        const spaceIdx = afterSlash.indexOf(' ');
        const filter = spaceIdx === -1 ? afterSlash : afterSlash.substring(0, spaceIdx);
        state.slashPaletteFilter = filter;
        state.slashPaletteSelected = 0;
        buildPaletteItems(filter);
    } else {
        hideSlashPalette();
    }
}

export function handleSlashKeydown(e) {
    if (!state.slashPaletteOpen) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopImmediatePropagation();
        updatePaletteSelection(1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopImmediatePropagation();
        updatePaletteSelection(-1);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
        confirmPaletteSelection();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        hideSlashPalette();
    }
}

export function initSlashCommands() {
    const input = document.getElementById('user-input');
    if (!input) return;
    input.addEventListener('input', handleSlashInput);
    input.addEventListener('keydown', handleSlashKeydown);
}
