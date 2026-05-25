import { state } from './state.js';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { marked } from 'marked';
import { applyButtonIcon, createIcon } from './icons.js';

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
    bar.innerHTML = `
        <span class="chat-input-context-persona">${createIcon("brain", { size: 14 })}<span>${state.activePersona || "Default"}</span></span>
        <span class="chat-input-context-sep">·</span>
        <span class="chat-input-context-model">${provider}</span>
    `;
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
    const iconMarkup = createIcon(icon, { size: 14 })
        || `<span class="tool-pill-icon-fallback">${window.sanitizeHtml ? window.sanitizeHtml(String(icon || "")) : String(icon || "")}</span>`;
    const pill = document.createElement("div");
    pill.className = `tool-pill ${status}`;
    pill.innerHTML = `
        <span class="tool-pill-dot"></span>
        <span class="tool-pill-icon">${iconMarkup}</span>
        <span class="tool-pill-cmd">${cmd}</span>
        ${status !== "running" ? `<span class="tool-pill-status">${createIcon(status === "error" ? "x" : "shieldCheck", { size: 12 })}</span>` : ""}
        ${duration ? `<span class="tool-pill-duration">${duration}</span>` : ""}
    `;
    msgCard.appendChild(pill);
    const viewport = document.getElementById("chat-workspace");
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
}

function makeCopyBtn(getText) {
    const btn = document.createElement("button");
    btn.className = "msg-copy-btn";
    btn.title = "Copy message";
    btn.setAttribute("aria-label", "Copy message");
    btn.innerHTML = `${createIcon("copy", { size: 14 })}<span class="nd-button-label">Copy</span>`;
    btn.addEventListener("click", () => {
        navigator.clipboard.writeText(getText());
        btn.innerHTML = `${createIcon("shieldCheck", { size: 14 })}<span class="nd-button-label">Copied</span>`;
        setTimeout(() => {
            btn.innerHTML = `${createIcon("copy", { size: 14 })}<span class="nd-button-label">Copy</span>`;
        }, 1600);
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
    
    let chatViewport = document.getElementById("chat-viewport");
    let viewport = document.getElementById("chat-workspace");
    let div = document.createElement("div");
    div.className = "message system";
    div.innerHTML = `
        <div class="message-card">
            System: Speech voice feedback is now ${state.isMuted ? "disabled (Muted)" : "enabled (Unmuted)"}.
        </div>
    `;
    chatViewport.appendChild(div);
    viewport.scrollTop = viewport.scrollHeight;
}

function cleanTextForSpeech(text) {
    let clean = text.replace(/```[\s\S]*?```/g, "");
    clean = clean.replace(/`[^`]+`/g, "");
    clean = clean.replace(/[*_~#]/g, "");
    clean = clean.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
    return clean.trim();
}

// Send Message Handler
function sendMessage() {
    let text = inputElement.value.trim();
    if (text === "") return;

    if (text === "/login") {
        inputElement.value = "";
        inputElement.style.height = "36px";
        triggerOAuthLogin();
        return;
    }

    // Dismiss welcome state on first real message
    dismissWelcome();
    showGenBar();

    // Collect any pending screenshot attachment
    const attachment = window.pendingScreenshot || null;

    // Add message to viewport
    let viewport = document.getElementById("chat-workspace");
    let chatViewport = document.getElementById("chat-viewport");
    let msg = document.createElement("div");
    msg.className = "message user";

    let attachmentHTML = '';
    if (attachment) {
        attachmentHTML = `<div style="margin-bottom:8px;"><img src="data:${attachment.mime};base64,${attachment.data}" style="max-width:160px;max-height:100px;border-radius:5px;border:1px solid rgba(0,240,255,0.3);display:block;" alt="Screenshot"></div>`;
    }

    msg.innerHTML = `
        <div class="message-card">
            ${attachmentHTML}${window.sanitizeHtml(text)}
        </div>
    `;
    // Add copy button to user message
    const userCard = msg.querySelector(".message-card");
    if (userCard) userCard.appendChild(makeCopyBtn(() => text));
    chatViewport.appendChild(msg);

    // Create a placeholder for AI response
    state.currentAIMessage = document.createElement("div");
    state.currentAIMessage.className = "message ai thinking";
    state.currentAIMessage.innerHTML = `
        <div class="message-card">
            <span class="thinking-dots">AI is thinking</span>
        </div>
    `;
    chatViewport.appendChild(state.currentAIMessage);
    
    state.currentAIText = "";

    // Reset analytics
    state.streamStartTime = performance.now();
    state.firstChunkTime = 0;
    state.totalTokens = 0;
    document.getElementById("latency-val").innerText = "--ms";
    document.getElementById("token-speed").innerText = "--/s";

    // Clear and reset input size
    inputElement.value = "";
    inputElement.style.height = "36px";

    // Clear screenshot attachment
    if (attachment) {
        window.pendingScreenshot = null;
        const bar = document.getElementById("chat-attachment-bar");
        if (bar) {
            bar.innerHTML = "";
            bar.classList.add("hidden");
        }
        const btn = document.getElementById("screenshot-btn");
        if (btn) btn.classList.remove("has-attachment");
    }
    
    // Scroll workspace
    viewport.scrollTop = viewport.scrollHeight;
    
    // Warn user if they attach a screenshot while Ollama is the active provider
    if (attachment) {
        const provSel = document.getElementById("llm-provider-select");
        if (provSel && provSel.value === "ollama") {
            const warn = document.createElement("div");
            warn.className = "message system";
            warn.innerHTML = `<div class="message-card" style="border-color:var(--warning-color)">
                ⚠️ <strong>Vision not supported with Ollama.</strong>
                The screenshot attachment will be ignored. Switch to Gemini in Settings to use vision.
            </div>`;
            chatViewport.appendChild(warn);
            viewport.scrollTop = viewport.scrollHeight;
        }
    }

    // Call Tauri backend — pass image data directly when a screenshot is attached
    const invokeArgs = { prompt: text };
    if (attachment) {
        invokeArgs.imageBase64 = attachment.data;
        invokeArgs.imageMime = attachment.mime;
    }
    invoke('send_command', invokeArgs).catch((err) => {
        let errorMsg = document.createElement("div");
        errorMsg.className = "message system error";
        errorMsg.innerHTML = `
            <div class="message-card">
                <strong>Error:</strong> ${err}
            </div>
        `;
        chatViewport.appendChild(errorMsg);
        viewport.scrollTop = viewport.scrollHeight;
        document.getElementById("tool-status").innerText = "Idle";
    });
    document.getElementById("tool-status").innerText = "Thinking...";
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
        invoke("kill_process").catch(err => console.error("Error killing process:", err));
    }
}

// Send button handler registered in initChat()

// Custom Premium Markdown Code Header / Action Injection
function formatCodeBlocks(container) {
    const pres = container.querySelectorAll("pre");
    pres.forEach(pre => {
        if (pre.querySelector(".code-header-bar")) return;

        const code = pre.querySelector("code");
        if (!code) return;

        let lang = "text";
        code.classList.forEach(cls => {
            if (cls.startsWith("language-")) {
                lang = cls.replace("language-", "");
            }
        });

        const header = document.createElement("div");
        header.className = "code-header-bar";
        
        const label = document.createElement("span");
        label.className = "code-lang-label";
        label.innerText = lang;
        header.appendChild(label);

        const actions = document.createElement("div");
        actions.className = "code-header-actions";

        const copyBtn = document.createElement("button");
        copyBtn.className = "code-header-btn copy-btn";
        copyBtn.innerText = "Copy";
        copyBtn.onclick = function() {
            navigator.clipboard.writeText(code.innerText).then(() => {
                copyBtn.innerText = "Copied!";
                setTimeout(() => { copyBtn.innerText = "Copy"; }, 2000);
            });
        };
        actions.appendChild(copyBtn);

        // Send to Canvas button
        const sendToCanvasBtn = document.createElement("button");
        sendToCanvasBtn.className = "code-header-btn canvas-export-btn";
        sendToCanvasBtn.innerText = "→ Canvas";
        sendToCanvasBtn.onclick = function() {
            const codeText = code.innerText;
            window.neurodeckCanvas.loadCode(lang, codeText);
            // Switch to canvas view
            const canvasTab = document.querySelector('[data-view="canvas"]');
            if (canvasTab) canvasTab.click();
            sendToCanvasBtn.innerText = "Sent!";
            setTimeout(() => { sendToCanvasBtn.innerText = "→ Canvas"; }, 2000);
        };
        actions.appendChild(sendToCanvasBtn);

        const executableLangs = ["bash", "sh", "powershell", "cmd", "zsh", "shell"];
        if (executableLangs.includes(lang.toLowerCase())) {
            const execBtn = document.createElement("button");
            execBtn.className = "code-header-btn execute-btn";
            execBtn.innerText = "Execute";
            execBtn.onclick = function() {
                if (state.isProcessRunning) {
                    invoke("kill_process").catch(e => console.error("Error killing process:", e));
                }

                execBtn.innerText = "Running...";
                execBtn.disabled = true;
                state.activeExecuteBtn = execBtn;

                const cmd = code.innerText;

                // Create terminal block immediately below the <pre> block
                let existingTerm = pre.nextElementSibling;
                if (existingTerm && existingTerm.classList.contains("terminal-console")) {
                    existingTerm.remove();
                }

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

                const terminateBtn = termConsole.querySelector(".terminal-terminate-btn");
                terminateBtn.onclick = function() {
                    invoke("kill_process").catch(err => {
                        console.error("Error invoking kill_process:", err);
                    });
                };

                state.isProcessRunning = true;
                document.getElementById("tool-status").innerText = "Executing...";
                updateInputConsoleState();

                let viewport = document.getElementById("chat-workspace");
                viewport.scrollTop = viewport.scrollHeight;

                invoke("execute_command_stream", { cmdStr: cmd }).catch((err) => {
                    appendLineToTerminal(`Error spawning process: ${err}`, true);
                    finishRunningProcess(1);
                });
            };
            actions.appendChild(execBtn);
        }

        if (lang.toLowerCase() === "lua") {
            state.pendingLuaScript = code.innerText;
            const execBtn = document.createElement("button");
            execBtn.className = "code-header-btn execute-btn";
            execBtn.innerText = "Execute";
            execBtn.onclick = function() {
                runLuaScript(code.innerText, pre, execBtn);
            };
            actions.appendChild(execBtn);
        }

        header.appendChild(actions);
        pre.insertBefore(header, pre.firstChild);
    });
}

function runLuaScript(scriptCode, preElement, execBtn) {
    if (!scriptCode || scriptCode.trim() === "") {
        console.warn("No Lua script to execute.");
        return;
    }

    if (!window.confirm("Execute this Lua script?")) {
        return;
    }

    if (state.isProcessRunning) {
        invoke("kill_process").catch(e => console.error("Error killing process:", e));
    }

    if (execBtn) {
        execBtn.innerText = "Running...";
        execBtn.disabled = true;
        state.activeExecuteBtn = execBtn;
    }

    if (!preElement) {
        const luaPres = document.querySelectorAll("pre");
        for (let i = luaPres.length - 1; i >= 0; i--) {
            const code = luaPres[i].querySelector("code");
            let isLua = false;
            if (code) {
                code.classList.forEach(cls => {
                    if (cls === "language-lua") isLua = true;
                });
            }
            if (isLua) {
                preElement = luaPres[i];
                break;
            }
        }
    }

    let targetParent = document.getElementById("chat-viewport");
    let targetSibling = null;

    if (preElement) {
        let existingTerm = preElement.nextElementSibling;
        if (existingTerm && existingTerm.classList.contains("terminal-console")) {
            existingTerm.remove();
        }
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

    if (preElement) {
        targetParent.insertBefore(termConsole, targetSibling);
    } else {
        targetParent.appendChild(termConsole);
    }

    state.activeTerminalBody = termConsole.querySelector(".terminal-console-body");

    const terminateBtn = termConsole.querySelector(".terminal-terminate-btn");
    terminateBtn.onclick = function() {
        finishRunningProcess(-1);
    };

    state.isProcessRunning = true;
    document.getElementById("tool-status").innerText = "Executing...";
    updateInputConsoleState();

    let viewport = document.getElementById("chat-workspace");
    viewport.scrollTop = viewport.scrollHeight;

    invoke("execute_lua", { code: scriptCode }).catch((err) => {
        appendLineToTerminal(`Error executing Lua: ${err}`, true);
        finishRunningProcess(1);
    });
}

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

        const msgCard = state.currentAIMessage.querySelector(".message-card");
        if (msgCard) {
            msgCard.innerHTML = window.sanitizeHtml(marked.parse(state.currentAIText));
            formatCodeBlocks(msgCard);
        }
        
        let viewport = document.getElementById("chat-workspace");
        let isAtBottom = (viewport.scrollHeight - viewport.clientHeight) - viewport.scrollTop < 100;
        if (isAtBottom) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
    // Forward token to any connected remote clients
    invoke("remote_send_to_clients", {
        message: JSON.stringify({ type: "chat_token", text: chunk, done: false })
    }).catch(() => {});
});

listen("stream_error", function (event) {
    let err = event.payload;
    let chatViewport = document.getElementById("chat-viewport");
    let viewport = document.getElementById("chat-workspace");
    let msg = document.createElement("div");
    msg.className = "message system error";
    msg.innerHTML = `
        <div class="message-card">
            <strong>Error:</strong> ${err}
        </div>
    `;
    chatViewport.appendChild(msg);
    viewport.scrollTop = viewport.scrollHeight;
    document.getElementById("tool-status").innerText = "Idle";
});

listen("stream_done", function () {
    document.getElementById("tool-status").innerText = "Idle";
    hideGenBar();
    if (state.currentAIMessage) {
        const msgCard = state.currentAIMessage.querySelector(".message-card");
        if (msgCard) {
            msgCard.innerHTML = window.sanitizeHtml(marked.parse(state.currentAIText));
            formatCodeBlocks(msgCard);
            // Capture text before state is cleared
            const capturedText = state.currentAIText;
            const finalTokens = state.totalTokens;
            const provider = (state.activeProvider || "gemini").toUpperCase();
            const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            // Message metadata footer (hover-revealed)
            const metaRow = document.createElement("div");
            metaRow.className = "msg-meta";
            metaRow.innerHTML = `
                <span class="msg-meta-model">${provider}</span>
                <span class="msg-meta-sep">·</span>
                <span>${timeStr}</span>
                <span class="msg-meta-sep">·</span>
                <span>${finalTokens} tokens</span>
            `;
            msgCard.appendChild(metaRow);
            // Copy button
            msgCard.appendChild(makeCopyBtn(() => capturedText));
        }
    }
    
    if (!state.isMuted && state.currentAIText && state.currentAIText.trim().length > 0) {
        let speechText = cleanTextForSpeech(state.currentAIText);
        if (speechText.length > 0) {
            invoke("speak_text", { text: speechText }).catch(err => console.error("TTS Error:", err));
        }
    }

    state.currentAIMessage = null;
    state.currentAIText = "";

    // Notify remote clients that the AI response stream is complete
    invoke("remote_send_to_clients", {
        message: JSON.stringify({ type: "chat_token", text: "", done: true })
    }).catch(() => {});

    // Refresh sessions sidebar list
    refreshSessionsList();

    // Refresh context drawer live metrics
    updateContextDrawer();
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

// Audio Recording Logic
// let isRecording = false; (Moved to state.js)
let micBtn = null;

function handleMicAction() {
    let chatViewport = document.getElementById("chat-viewport");
    let viewport = document.getElementById("chat-workspace");
    if (!state.isRecording) {
        state.isRecording = true;
        micBtn.innerText = "🛑";
        micBtn.classList.add("recording");
        invoke("start_recording").then((msg) => {
            let div = document.createElement("div");
            div.className = "message system";
            div.innerHTML = `
                <div class="message-card">
                    System: ${msg}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
        }).catch((err) => {
            state.isRecording = false;
            micBtn.innerText = "🎙️";
            micBtn.classList.remove("recording");
            let div = document.createElement("div");
            div.className = "message system error";
            div.innerHTML = `
                <div class="message-card">
                    System error starting recording: ${err}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
        });
    } else {
        state.isRecording = false;
        micBtn.innerText = "🎙️";
        micBtn.classList.remove("recording");
        
        let div = document.createElement("div");
        div.className = "message system";
        div.innerHTML = `
            <div class="message-card">
                System: Processing audio...
            </div>
        `;
        chatViewport.appendChild(div);
        viewport.scrollTop = viewport.scrollHeight;

        invoke("stop_recording").then((text) => {
            inputElement.value = text;
            inputElement.style.height = "auto";
            inputElement.style.height = (inputElement.scrollHeight) + "px";
            inputElement.focus();
            
            div.querySelector(".message-card").innerText = "System: Audio transcribed.";
        }).catch((err) => {
            div.className = "message system error";
            div.querySelector(".message-card").innerText = "System error stop recording/transcribing: " + err;
        });
    }
}

// Sessions History Management (Sidebar UI)
function refreshSessionsList() {
    invoke("list_sessions").then((sessions) => {
        const historyContainer = document.getElementById("sidebar-history");
        historyContainer.innerHTML = '<div class="history-group-label">Recent Sessions</div>';
        
        if (sessions.length === 0) {
            const noSessions = document.createElement("div");
            noSessions.style.padding = "10px 12px";
            noSessions.style.opacity = "0.4";
            noSessions.style.fontSize = "0.8rem";
            noSessions.innerText = "No saved sessions";
            historyContainer.appendChild(noSessions);
            return;
        }

        sessions.forEach((sid) => {
            const item = document.createElement("div");
            item.className = "history-item";
            if (sid === state.currentSessionId) {
                item.classList.add("active");
            }
            
            const title = document.createElement("span");
            title.className = "history-title";
            title.innerText = sid;
            title.onclick = function() {
                loadSession(sid);
            };
            item.appendChild(title);
            
            const actions = document.createElement("div");
            actions.className = "history-actions";
            
            const exportBtn = document.createElement("button");
            exportBtn.className = "history-action-btn";
            exportBtn.title = "Export to Markdown";
            exportBtn.setAttribute("aria-label", "Export to Markdown");
            exportBtn.innerHTML = createIcon("upload", { size: 14 });
            exportBtn.onclick = function(e) {
                e.stopPropagation();
                invoke("export_session_markdown", { id: sid }).then((msg) => {
                    alert(msg);
                }).catch((err) => {
                    alert("Error exporting session: " + err);
                });
            };
            actions.appendChild(exportBtn);
            
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "history-action-btn";
            deleteBtn.title = "Delete Session";
            deleteBtn.setAttribute("aria-label", "Delete Session");
            deleteBtn.innerHTML = createIcon("trash2", { size: 14 });
            deleteBtn.onclick = function(e) {
                e.stopPropagation();
                if (confirm(`Delete session ${sid}?`)) {
                    invoke("delete_session", { id: sid }).then(() => {
                        if (sid === state.currentSessionId) {
                            startNewSession();
                        } else {
                            refreshSessionsList();
                        }
                    });
                }
            };
            actions.appendChild(deleteBtn);
            
            item.appendChild(actions);
            historyContainer.appendChild(item);
        });
    }).catch(err => {
        console.error("Error listing sessions:", err);
    });
}

function loadSession(sid) {
    invoke("load_session_by_id", { id: sid }).then((data) => {
        state.currentSessionId = data.session_id;
        const sidEl = document.getElementById("session-id");
        if (sidEl) sidEl.innerText = state.currentSessionId;
        const stitleEl = document.getElementById("session-title");
        if (stitleEl) stitleEl.innerText = "Session: " + state.currentSessionId;
        
        let chatViewport = document.getElementById("chat-viewport");
        let viewport = document.getElementById("chat-workspace");
        chatViewport.innerHTML = "";
        
        data.messages.forEach((msgStr) => {
            const div = document.createElement("div");
            if (msgStr.startsWith("User: ")) {
                div.className = "message user";
                div.innerHTML = `
                    <div class="message-card">
                        ${window.sanitizeHtml(msgStr.substring(6))}
                    </div>
                `;
            } else if (msgStr.startsWith("AI: ")) {
                div.className = "message ai";
                div.innerHTML = `
                    <div class="message-card">
                        ${window.sanitizeHtml(marked.parse(msgStr.substring(4)))}
                    </div>
                `;
                formatCodeBlocks(div);
            } else {
                div.className = "message system";
                div.innerHTML = `
                    <div class="message-card">
                        ${window.sanitizeHtml(msgStr)}
                    </div>
                `;
            }
            chatViewport.appendChild(div);
        });
        
        viewport.scrollTop = viewport.scrollHeight;
        
        let systemDiv = document.createElement("div");
        systemDiv.className = "message system";
        systemDiv.innerHTML = `
            <div class="message-card">
                System: Loaded session ${state.currentSessionId}
            </div>
        `;
        chatViewport.appendChild(systemDiv);
        viewport.scrollTop = viewport.scrollHeight;
        
        refreshSessionsList();
    }).catch((err) => {
        let chatViewport = document.getElementById("chat-viewport");
        let viewport = document.getElementById("chat-workspace");
        let div = document.createElement("div");
        div.className = "message system error";
        div.innerHTML = `
            <div class="message-card">
                Error loading session: ${err}
            </div>
        `;
        chatViewport.appendChild(div);
        viewport.scrollTop = viewport.scrollHeight;
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
        chatViewport.innerHTML = CHAT_WELCOME_HTML;
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
window.addEventListener("keydown", function(e) {
    if (e.key === "`" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (state.radialMenuVisible) {
            hideRadialMenu();
        } else {
            showRadialMenu();
        }
        return;
    }
});

// Arrow keys to cycle radial segments when menu is open
window.addEventListener("keydown", function(e) {
    if (!state.radialMenuVisible) return;
    const keyToSeg = { ArrowUp: 0, ArrowRight: 2, ArrowDown: 4, ArrowLeft: 6 };
    if (e.key in keyToSeg) {
        e.preventDefault();
        updateRadialDisplay(keyToSeg[e.key]);
    }
    if (e.key === "Enter") {
        e.preventDefault();
        activateRadialSegment(state.radialSelectedSegment);
        hideRadialMenu();
    }
    if (e.key === "Escape") {
        e.preventDefault();
        hideRadialMenu();
    }
});

window.addEventListener("keydown", function(e) {
    if (e.ctrlKey && e.altKey && e.key === "1") {
        e.preventDefault();
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.toggle("collapsed");
    }
    
    if (e.ctrlKey && e.altKey && e.key === "2") {
        e.preventDefault();
        const inspectDrawer = document.getElementById("inspect-drawer");
        if (inspectDrawer) inspectDrawer.classList.toggle("collapsed");
    }
    
    if (e.ctrlKey && e.altKey && e.key === "3") {
        e.preventDefault();
        const clearBtn = document.getElementById("canvas-clear-btn");
        if (clearBtn) clearBtn.click();
    }
    
    if (e.ctrlKey && e.altKey && e.key === "4") {
        e.preventDefault();
        cycleTheme();
    }

    if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        invoke("save_session").then((msg) => {
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            let div = document.createElement("div");
            div.className = "message system";
            div.innerHTML = `
                <div class="message-card">
                    System: ${msg}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
            
            // Update session title in top navigation bar
            const stitleEl = document.getElementById("session-title");
            if (stitleEl) stitleEl.innerText = "Session: " + state.currentSessionId;
            
            refreshSessionsList();
        }).catch((err) => {
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            let div = document.createElement("div");
            div.className = "message system error";
            div.innerHTML = `
                <div class="message-card">
                    System error saving session: ${err}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
        });
    }
    
    if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        invoke("load_latest_session").then((data) => {
            state.currentSessionId = data.session_id;
            const sidEl = document.getElementById("session-id");
            if (sidEl) sidEl.innerText = state.currentSessionId;
            const stitleEl = document.getElementById("session-title");
            if (stitleEl) stitleEl.innerText = "Session: " + state.currentSessionId;
            
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            chatViewport.innerHTML = "";
            
            data.messages.forEach((msgStr) => {
                const div = document.createElement("div");
                if (msgStr.startsWith("User: ")) {
                    div.className = "message user";
                    div.innerHTML = `
                        <div class="message-card">
                            ${window.sanitizeHtml(msgStr.substring(6))}
                        </div>
                    `;
                } else if (msgStr.startsWith("AI: ")) {
                    div.className = "message ai";
                    div.innerHTML = `
                        <div class="message-card">
                            ${window.sanitizeHtml(marked.parse(msgStr.substring(4)))}
                        </div>
                    `;
                    formatCodeBlocks(div);
                }
                chatViewport.appendChild(div);
            });
            
            viewport.scrollTop = viewport.scrollHeight;
            
            let div = document.createElement("div");
            div.className = "message system";
            div.innerHTML = `
                <div class="message-card">
                    System: Loaded session ${state.currentSessionId}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
            
            refreshSessionsList();
        }).catch((err) => {
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            let div = document.createElement("div");
            div.className = "message system error";
            div.innerHTML = `
                <div class="message-card">
                    Error loading session: ${err}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
        });
    }
    
    if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        if (state.pendingLuaScript) {
            runLuaScript(state.pendingLuaScript);
        } else {
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            let div = document.createElement("div");
            div.className = "message system error";
            div.innerHTML = `
                <div class="message-card">
                    System: No pending Lua script found in chat to execute.
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
        }
    }

    if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        let micBtn = document.getElementById("mic-btn");
        if (micBtn) {
            micBtn.click();
        }
    }
    
    if (e.ctrlKey && e.key === "m") {
        e.preventDefault();
        toggleMute();
    }

    if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        startNewSession();
    }

    if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        if (state.availablePersonas.length > 0) {
            let currentIndex = state.availablePersonas.indexOf(state.activePersona);
            let nextIndex = (currentIndex + 1) % state.availablePersonas.length;
            let nextPersona = state.availablePersonas[nextIndex];
            
            invoke("set_persona", { name: nextPersona }).then((msg) => {
                state.activePersona = nextPersona;
                let select = document.getElementById("persona-select");
                if (select) {
                    select.value = nextPersona;
                }
                
                let chatViewport = document.getElementById("chat-viewport");
                let viewport = document.getElementById("chat-workspace");
                let div = document.createElement("div");
                div.className = "message system";
                div.innerHTML = `
                    <div class="message-card">
                        System: Persona cycled to ${nextPersona}
                    </div>
                `;
                chatViewport.appendChild(div);
                viewport.scrollTop = viewport.scrollHeight;
            }).catch((err) => {
                console.error("Error cycling persona:", err);
            });
        }
    }

    if (e.key === "Escape") {
        if (state.currentAIMessage !== null) {
            e.preventDefault();
            invoke("cancel_generation").catch((err) => {
                console.error("Error cancelling generation:", err);
            });
        }
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
        let div = document.createElement("div");
        div.className = "message system";
        div.innerHTML = `
            <div class="message-card">
                System: ${msg}
            </div>
        `;
        chatViewport.appendChild(div);
        viewport.scrollTop = viewport.scrollHeight;
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
            let div = document.createElement("div");
            div.className = "message system";
            div.innerHTML = `
                <div class="message-card">
                    System: Theme applied and saved: ${val}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
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
    startNewSession
};

export function initChat() {
    inputElement = document.getElementById("user-input");
    if (inputElement) {
        inputElement.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = (this.scrollHeight) + "px";
        });
        inputElement.addEventListener("keydown", handleInputKeydown);
    }

    const sendBtn = document.getElementById("send-btn");
    if (sendBtn) {
        sendBtn.onclick = handleSendAction;
    }

    micBtn = document.getElementById("mic-btn");
    if (micBtn) {
        micBtn.onclick = handleMicAction;
    }

    const newChatBtn = document.getElementById("new-chat-btn");
    if (newChatBtn) {
        newChatBtn.onclick = startNewSession;
    }

    const newChatBtnHeader = document.getElementById("new-chat-btn-header");
    if (newChatBtnHeader) {
        newChatBtnHeader.onclick = startNewSession;
    }

    const personaSelect = document.getElementById("persona-select");
    if (personaSelect) {
        personaSelect.onchange = handlePersonaChange;
    }

    const themeSelect = document.getElementById("theme-select");
    if (themeSelect) {
        themeSelect.onchange = handleThemeChange;
    }

    // Setup mute button listener and initial state
    const muteBtn = document.getElementById("mute-btn");
    if (muteBtn) {
        muteBtn.onclick = function() {
            toggleMute();
        };
    }
    updateMuteButtonUI();

    // Render welcome state on initial load
    const chatViewport = document.getElementById("chat-viewport");
    if (chatViewport && !chatViewport.querySelector(".message")) {
        chatViewport.innerHTML = CHAT_WELCOME_HTML;
        wireWelcomeStarters();
    }

    // Populate context bar + session header (defer so state is set by boot)
    setTimeout(updateSessionHeader, 300);

    // Wire gen-bar Stop button
    const genStopBtn = document.getElementById("chat-gen-stop");
    if (genStopBtn) {
        genStopBtn.onclick = () => {
            invoke("cancel_generation").catch(err => {
                console.error("Error cancelling generation:", err);
                if (typeof addNotification === "function") {
                    addNotification("Stop Failed", `Could not cancel: ${err}`, "error");
                }
            });
        };
    }
}
