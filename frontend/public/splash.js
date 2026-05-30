const { invoke } = window.__TAURI__.core;

const bootSequence = [
    "NEURODECK OS v0.1.0-alpha [x86_64-pc-windows-msvc]",
    "Copyright (c) 2026 KhaoticDev. All rights reserved.",
    "",
    "[OK] Initializing memory matrix...",
    "[OK] Mounting virtual filesystem...",
    "[OK] Bootstrapping PTY subsystem...",
    "[WARN] Neural link latency high... bypass authorized.",
    "Establishing local AI provider bridge...",
    "[OK] Bridge established.",
    "Loading user persona matrices...",
    "[OK] System ready.",
    "",
    "Connecting to neural net...",
];

const viewport = document.getElementById('log-viewport');

// Watchdog: if the boot sequence takes more than 8 seconds or invoke fails,
// force the main window to show regardless. Prevents permanent blank screen
// on slow hardware or WebKit initialization failures (critical for Steam Deck).
const BOOT_WATCHDOG_MS = 8000;
let bootComplete = false;

async function forceShowMain() {
    if (bootComplete) return;
    bootComplete = true;
    try {
        await invoke('close_splashscreen');
    } catch (_) {
        // Silent fallback — we tried, but the main window should show anyway
    }
}

setTimeout(forceShowMain, BOOT_WATCHDOG_MS);

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBootSequence() {
    await sleep(200); // Initial pause

    for (let i = 0; i < bootSequence.length; i++) {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerText = bootSequence[i];
        viewport.appendChild(line);

        // Randomize speed for hacker effect (10ms to 150ms)
        const delay = Math.random() * 140 + 10;
        await sleep(delay);
    }

    // Final dramatic pause before launching
    await sleep(600);

    await forceShowMain();
}

document.addEventListener('DOMContentLoaded', runBootSequence);
