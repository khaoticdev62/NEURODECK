import { state } from "./state.js";
import { triggerHaptic } from "./haptics.js";
import {
  updateMuteButtonUI,
  toggleMute,
  refreshSessionsList,
  loadSession,
  startNewSession,
  formatCodeBlocks,
  appendLineToTerminal,
  finishRunningProcess,
  runLuaScript,
  sendMessage,
  initChat,
  getMessageText,
  getMessageElements,
} from "./chat.js";
import {
  initCanvasView,
  initCanvasCollab,
  loadCanvasCode,
  initCanvas,
} from "./canvas.js";
import {
  initSettings,
  applySettings,
  toggleSettingsLlmGroups,
  initSettingsSidebar,
  openSettingsModal,
  activateSettingsPanel,
  performModelSearch,
  switchToBrowseTabAndSearch,
} from "./settings.js";
import {
  initPtyTerminal,
  initSshTerminal,
  connectSsh,
  initSshProfilesFromDisk,
  renderSshProfiles,
  renderSshProfilesSettings,
  initFtpProfilesFromDisk,
  renderFtpProfiles,
  renderFtpProfilesSettings,
  initSftpProfilesFromDisk,
  renderSftpProfiles,
  renderSftpProfilesSettings,
  initFtpSftpDragDrop,
  createTerminalSession,
  initTerminal,
} from "./terminal.js";

import "./style.css";
import "./app.css";

import { invoke } from "./neurobridge.js";
import QRCode from "qrcode";
import { applyNeurodeckIconography, createIcon } from "./icons.js";
import {
  addNotification,
  updateNotifBadge,
  renderNotificationsList,
} from "./notifications.js";
import { initAgentView } from "./agent.js";
import { initMemoryView } from "./memory.js";
import { FocusTrap } from "./focus-trap.js";
import { renderShortcutsOverlay, KEYBOARD_SHORTCUTS, getShortcutOverrides, saveShortcutOverride, resetShortcutOverride, getEffectiveKeys } from "./shortcuts.js";
import { RADIAL_SEGMENTS } from "./radial.js";
import { COMMAND_PALETTE_ACTIONS } from "./palette-commands.js";
import { initGitView } from "./git.js";
import { initApiLabView } from "./api_lab.js";
import { initCliMakerView } from "./cli_maker.js";
import { initGraphView } from "./graph_view.js";
import { initSchedulerView } from "./scheduler_view.js";

import { listen } from "./neurobridge.js";
import { marked } from "marked";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import manualContent from "./JPE_MANUAL.md?raw";
import {
  getCtrlPromptVisible,
  getCtrlPromptTemplateMode,
  openCtrlPromptOverlay,
  closeCtrlPromptOverlay,
  confirmCtrlPrompt,
  exitTemplateMode,
  cycleTemplatePlaceholder,
  navigateTemplatePlaceholder,
  confirmTemplateAndSend,
  navigateCtrlPromptList,
  navigateCtrlPromptCat,
  initCtrlPromptPicker,
  initCtrlPromptPanel,
} from "./ctrl_prompt.js";
import { initRemoteControl } from "./remote_control_view.js";

// ==========================================================================
// SCREEN-READER ANNOUNCER (a11y)
// ==========================================================================
function announceToScreenReader(message) {
  const announcer = document.getElementById("sr-announcer");
  if (!announcer) return;
  // Clear first so identical messages re-announce
  announcer.textContent = "";
  requestAnimationFrame(() => {
    announcer.textContent = String(message);
  });
}
window.announceToScreenReader = announceToScreenReader;

let oauthFocusTrap = null;

function _oauthCreateCard(chatViewport) {
  const msg = document.createElement("div");
  msg.className = "message ai";
  msg.id = "oauth-message-card";
  msg.tabIndex = -1;
  msg.innerHTML = `
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
    `;
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
}

window.neurodeckCanvas = {
  currentLang: "html",
  currentCode: "",
  loadCode: function (lang, content) {
    if (typeof loadCanvasCode === "function") {
      loadCanvasCode(lang, content);
    } else {
      console.warn("loadCanvasCode is not defined yet.");
    }
  },
};

window.sanitizeHtml = function (html) {
  if (!html) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const allowedTags = new Set([
      "a",
      "span",
      "div",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "pre",
      "code",
      "em",
      "strong",
      "br",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "blockquote",
      "hr",
    ]);

    const allowedAttrs = new Set([
      "class",
      "href",
      "src",
      "alt",
      "title",
      "target",
    ]);
    const allowedUrlSchemes = /^(https?:|mailto:|#|\/)/i;

    function _cleanUnallowedNode(child, tagName, cleanNodeFn) {
      if (
        [
          "script",
          "style",
          "iframe",
          "object",
          "embed",
          "noscript",
          "meta",
          "link",
        ].includes(tagName)
      ) {
        child.remove();
      } else {
        cleanNodeFn(child);
        while (child.firstChild) {
          child.parentNode.insertBefore(child.firstChild, child);
        }
        child.remove();
      }
    }

    function _cleanNodeAttributes(child, tagName, allowedAttrs, allowedUrlSchemes) {
      const attrs = Array.from(child.attributes);
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        if (!allowedAttrs.has(name) || name.startsWith("on")) {
          child.removeAttribute(attr.name);
        } else if (name === "href" || name === "src") {
          const val = attr.value.trim();
          if (!allowedUrlSchemes.test(val)) {
            child.removeAttribute(attr.name);
          }
        }
      }
      if (tagName === "a") {
        child.setAttribute("rel", "noopener noreferrer nofollow");
        child.setAttribute("target", "_blank");
      }
    }

    function cleanNode(node) {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const tagName = child.tagName.toLowerCase();
          if (!allowedTags.has(tagName)) {
            _cleanUnallowedNode(child, tagName, cleanNode);
          } else {
            _cleanNodeAttributes(child, tagName, allowedAttrs, allowedUrlSchemes);
            cleanNode(child);
          }
        }
      }
    }

    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch (e) {
    console.error("HTML Sanitization failed:", e);
    return "";
  }
};

window.parseStructuredError = function (err) {
  if (!err) return null;
  const text = String(err).trim();
  if (!text.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed.code && parsed.message) return parsed;
    return null;
  } catch {
    return null;
  }
};

window.escapeHtml = function (s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

window.applyThemeColors = function (theme) {
  if (!theme) return;
  const bg = theme.Background || theme.background || "#000000";
  const fg = theme.Foreground || theme.foreground || "#e2e8f0";
  const accent = theme.Accent || theme.accent || "#5EEBFF";
  const response = theme.Response || theme.response || "#00FF88";
  const warning = theme.Warning || theme.warning || "#FFB000";
  const error = theme.Error || theme.error || "#FF3C5A";
  const name = theme.Name || theme.name || "";
  const color = theme.Color || theme.color || "";
  let pulse = theme.Pulse || theme.pulse || [];
  if (typeof pulse === "string") {
    try {
      pulse = JSON.parse(pulse);
    } catch {
      pulse = [];
    }
  }

  document.documentElement.style.setProperty("--bg-color", bg);
  document.documentElement.style.setProperty("--fg-color", fg);
  document.documentElement.style.setProperty("--accent-color", accent);
  document.documentElement.style.setProperty("--response-color", response);
  document.documentElement.style.setProperty("--warning-color", warning);
  document.documentElement.style.setProperty("--error-color", error);
  document.documentElement.style.setProperty("--theme-name", `"${name}"`);
  document.documentElement.style.setProperty("--theme-color", color);

  // Expose pulse gradient stops as CSS variables for animation use
  if (Array.isArray(pulse)) {
    for (let i = 0; i < 10; i++) {
      document.documentElement.style.setProperty(
        `--pulse-${i}`,
        pulse[i] || accent,
      );
    }
  }

  const xtermTheme = {
    background: bg,
    foreground: fg,
    cursor: accent,
    selectionBackground: "rgba(255, 255, 255, 0.15)",
  };
  if (window.ptyTerminal) {
    window.ptyTerminal.options.theme = xtermTheme;
  }
  if (window.sshTerminal) {
    window.sshTerminal.options.theme = xtermTheme;
  }
};



// ==========================================================================
// LIVE & STATIC BACKGROUNDS SYSTEM
// ==========================================================================
const LIVE_BACKGROUNDS = [
  {
    id: "matrix",
    name: "Matrix Rain",
    desc: "Digital rain streaming in accent color",
    preview:
      "linear-gradient(180deg, #050505 0%, rgba(0, 255, 136, 0.15) 100%)",
  },
  {
    id: "starfield",
    name: "Starfield Warp",
    desc: "Hyperspace travel through stars",
    preview: "radial-gradient(circle, rgba(255,255,255,0.15) 10%, #050505 90%)",
  },
  {
    id: "particles",
    name: "Quantum Net",
    desc: "Drifting nodes with interactive links",
    preview:
      "radial-gradient(circle at 30% 20%, rgba(0, 240, 255, 0.15) 0%, #050505 80%)",
  },
  {
    id: "grid",
    name: "Synthwave Grid",
    desc: "Retro-futuristic perspective grid",
    preview: "linear-gradient(0deg, rgba(255, 0, 255, 0.15) 0%, #050505 60%)",
  },
  {
    id: "radar",
    name: "Tactical HUD",
    desc: "Military scanlines & radar telemetry",
    preview:
      "radial-gradient(circle, transparent 50%, rgba(0, 240, 255, 0.1) 90%), #050505",
  },
  {
    id: "circuit",
    name: "Cyber Circuit",
    desc: "Glowing cybernetic trace paths",
    preview: "linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, #050505 100%)",
  },
  {
    id: "wave",
    name: "Digital Wave",
    desc: "Flowing harmonic data streams",
    preview:
      "linear-gradient(90deg, rgba(0, 240, 255, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%), #050505",
  },
  {
    id: "ascii",
    name: "Console Stream",
    desc: "Scrolling terminal kernel logs",
    preview:
      "linear-gradient(180deg, #000000 0%, rgba(0, 255, 136, 0.08) 100%)",
  },
  {
    id: "css-nebula",
    name: "Cosmic Nebula",
    desc: "CSS dynamic cosmic gas clouds",
    preview:
      "radial-gradient(circle at top right, rgba(168, 85, 247, 0.2), transparent), radial-gradient(circle at bottom left, rgba(0, 240, 255, 0.2), #050505)",
  },
  {
    id: "css-aurora",
    name: "Aurora Borealis",
    desc: "CSS hardware-accelerated polar lights",
    preview:
      "linear-gradient(220deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 240, 255, 0.15) 50%, #050505 100%)",
  },
];

const STATIC_BACKGROUNDS = [
  {
    id: "hq-1",
    name: "Nebula Core",
    url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=100&w=2560",
    desc: "Ultra HD cosmic nebula",
  },
  {
    id: "hq-2",
    name: "Neon District",
    url: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=100&w=2560",
    desc: "Cyberpunk city street at night",
  },
  {
    id: "hq-3",
    name: "Abstract Fluid",
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=100&w=2560",
    desc: "Dark liquid metal and glass",
  },
  {
    id: "hq-4",
    name: "Quantum Chip",
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=100&w=2560",
    desc: "Macro shot of illuminated processor",
  },
  {
    id: "hq-5",
    name: "Data Center",
    url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=100&w=2560",
    desc: "Endless rows of glowing servers",
  },
  {
    id: "hq-6",
    name: "Vaporwave Sun",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=100&w=2560",
    desc: "Retrowave sunset over digital grid",
  },
  {
    id: "hq-7",
    name: "Deep Ocean Base",
    url: "https://images.unsplash.com/photo-1682687982501-1e5898cb4693?q=100&w=2560",
    desc: "Submerged metallic structures",
  },
  {
    id: "hq-8",
    name: "Hexagon Matrix",
    url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=100&w=2560",
    desc: "Glowing geometric hex patterns",
  },
  {
    id: "hq-9",
    name: "Cyber Samurai",
    url: "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=100&w=2560",
    desc: "Neon kanji and rain reflections",
  },
  {
    id: "hq-10",
    name: "Fractal Glass",
    url: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=100&w=2560",
    desc: "Shattered glowing 3D glass",
  },
  {
    id: "hq-11",
    name: "Aurora Night",
    url: "https://images.unsplash.com/photo-1531366936337-7c912a454b07?q=100&w=2560",
    desc: "Vivid northern lights over dark silhouette",
  },
  {
    id: "hq-12",
    name: "Dark Marble",
    url: "https://images.unsplash.com/photo-1600821034455-ee53151b7ea7?q=100&w=2560",
    desc: "Premium black marble texture",
  },
  {
    id: "hq-13",
    name: "Synth Wave",
    url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=100&w=2560",
    desc: "Abstract colorful vector waves",
  },
  {
    id: "hq-14",
    name: "Void Horizon",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=100&w=2560",
    desc: "Earth curve from orbit at night",
  },
  {
    id: "hq-15",
    name: "Neon Flora",
    url: "https://images.unsplash.com/photo-1500829243541-74b676404532?q=100&w=2560",
    desc: "Bioluminescent jungle leaves",
  },
  {
    id: "hq-16",
    name: "Code Rain",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=100&w=2560",
    desc: "Classic green hacker terminal",
  },
  {
    id: "hq-17",
    name: "Fiber Optics",
    url: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=100&w=2560",
    desc: "Macro glowing fiber strands",
  },
  {
    id: "hq-18",
    name: "Galactic Core",
    url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=100&w=2560",
    desc: "Stunning star cluster",
  },
  {
    id: "hq-19",
    name: "Dark Carbon",
    url: "https://images.unsplash.com/photo-1596700547143-69024f2b9bf2?q=100&w=2560",
    desc: "Carbon fiber sleek material",
  },
  {
    id: "hq-20",
    name: "Laser Grid",
    url: "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=100&w=2560",
    desc: "Retro 80s 3D laser landscape",
  },
];

class LiveBackgroundManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animationFrameId = null;
    this.currentType = null;
    this.resizeHandler = null;
    this.mouseHandler = null;
    this.particles = [];
    this.angle = 0;
    this.lastTime = 0;
    this.mouseX = -9999;
    this.mouseY = -9999;

    // Bind
    this.loop = this.loop.bind(this);
    this.resize = this.resize.bind(this);
    this.mousemove = this.mousemove.bind(this);
  }

  init() {
    this.canvas = document.getElementById("app-background-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.resizeHandler = () => this.resize();
    this.mouseHandler = (e) => this.mousemove(e);

    window.addEventListener("resize", this.resizeHandler);
    window.addEventListener("mousemove", this.mouseHandler);
    this.resize();
  }

  resize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      if (this.currentType) {
        this.setupCanvasBackground(this.currentType);
      }
    }
  }

  mousemove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  destroy() {
    this.stop();
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }
    if (this.mouseHandler) {
      window.removeEventListener("mousemove", this.mouseHandler);
    }
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.currentType = null;
    this.particles = [];

    const cssEl = document.getElementById("app-background-css");
    if (cssEl) {
      cssEl.style.opacity = "0";
      cssEl.className = "app-background-css";
    }
    if (this.canvas) {
      this.canvas.style.opacity = "0";
    }
  }

  start(type) {
    if (this.currentType === type) {
      const opacity =
        parseFloat(localStorage.getItem("bgOpacity") || "10") / 100;
      const canvasEl = document.getElementById("app-background-canvas");
      const cssEl = document.getElementById("app-background-css");
      if (canvasEl) canvasEl.style.opacity = opacity.toString();
      if (cssEl) cssEl.style.opacity = opacity.toString();
      return;
    }

    this.stop();
    if (!this.canvas) this.init();

    this.currentType = type;
    this.lastTime = performance.now();

    const cssEl = document.getElementById("app-background-css");
    const canvasEl = document.getElementById("app-background-canvas");
    const opacity = parseFloat(localStorage.getItem("bgOpacity") || "10") / 100;

    if (type.startsWith("css-")) {
      if (cssEl) {
        cssEl.className = "app-background-css " + type;
        cssEl.style.opacity = opacity.toString();
      }
    } else {
      if (canvasEl) {
        canvasEl.style.opacity = opacity.toString();
        this.setupCanvasBackground(type);
        this.animationFrameId = requestAnimationFrame(this.loop);
      }
    }
  }

  setupCanvasBackground(type) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.particles = [];
    this.angle = 0;

    if (type === "matrix") {
      const columns = Math.floor(w / 16) + 1;
      this.particles = Array(columns)
        .fill(0)
        .map(() => Math.random() * -h);
    } else if (type === "starfield") {
      const numStars = 100;
      this.particles = Array(numStars)
        .fill(0)
        .map(() => ({
          x: Math.random() * w - w / 2,
          y: Math.random() * h - h / 2,
          z: Math.random() * w,
          color:
            Math.random() > 0.5
              ? "var(--accent-color)"
              : "var(--response-color)",
        }));
    } else if (type === "particles") {
      const numParticles = 60;
      this.particles = Array(numParticles)
        .fill(0)
        .map(() => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          r: Math.random() * 2 + 1,
        }));
    } else if (type === "grid") {
      this.angle = 0;
    } else if (type === "radar") {
      this.particles = Array(15)
        .fill(0)
        .map(() => ({
          x: Math.random() * w,
          y: Math.random() * h,
          size: Math.random() * 2 + 1,
          alpha: Math.random(),
          speed: 0.005 + Math.random() * 0.01,
          label: `NODE_0x${Math.floor(Math.random() * 256)
            .toString(16)
            .toUpperCase()}`,
        }));
    } else if (type === "circuit") {
      const numLines = 8;
      this.particles = Array(numLines)
        .fill(0)
        .map(() => this.createCircuitLine(w, h));
    } else if (type === "wave") {
      this.angle = 0;
    } else if (type === "ascii") {
      const linesCount = Math.floor(h / 20) + 2;
      this.particles = Array(linesCount)
        .fill(0)
        .map((_, i) => ({
          text: this.getRandomLogText(),
          y: i * 20 + Math.random() * 15,
          speed: 0.5 + Math.random() * 1.5,
          alpha: 0.15 + Math.random() * 0.35,
        }));
    }
  }

  createCircuitLine(w, h) {
    const startX = Math.random() * w;
    const startY = Math.random() * h;
    const angle = (Math.floor(Math.random() * 8) * Math.PI) / 4;
    return {
      points: [{ x: startX, y: startY }],
      dirX: Math.cos(angle),
      dirY: Math.sin(angle),
      growSpeed: 2 + Math.random() * 2,
      stepsRemaining: Math.floor(Math.random() * 15) + 10,
      alpha: 1.0,
      color:
        Math.random() > 0.4 ? "var(--accent-color)" : "var(--response-color)",
    };
  }

  getRandomLogText() {
    const logs = [
      `[OK] Kernel initialized. Boot time: 0.342s`,
      `[SYSTEM] pci 0000:00:01.0: [1002:163f] type 00 class 0x030000`,
      `[DISK] sd 0:0:0:0: [sda] 1000215216 sectors (512 GB SSD)`,
      `[FS] Ext4-fs (sda8): mounted filesystem with ordered data mode`,
      `[DAEMON] systemd[1]: Started Steam Deck Controller Daemon`,
      `[AI] neurodeck-daemon: Initializing Gemini Core connection...`,
      `[AI] neurodeck-daemon: IPC channel secure (auth=keychain)`,
      `[TELEMETRY] memory load stable (12.8 GB / 16.0 GB)`,
      `[TELEMETRY] CPU load: 12% | GPU load: 8% | Temp: 58C`,
      `[NETWORK] wlan0: connection established to LAN_DECK_GRID`,
      `[TUNNEL] ssh-tunnel: tunnel service running on port 2222`,
      `[OLLAMA] Service active: listing model presets...`,
      `[DAEMON] Game Mode compositor handshake complete`,
      `[DAEMON] Battery state: discharging (98% remaining)`,
      `[DAEMON] Controller layout mapped: STEAM_INPUT_VDF`,
      `[SYSTEM] Memory pages optimized. Swap file size increased (4GB)`,
      `[SECURE] Keychain initialized. Cryptographic credentials loaded.`,
    ];
    return logs[Math.floor(Math.random() * logs.length)];
  }

  loop(time) {
    if (!this.ctx || !this.canvas || !this.currentType) return;

    const delta = time - this.lastTime;
    if (delta < 33.3) {
      this.animationFrameId = requestAnimationFrame(this.loop);
      return;
    }
    this.lastTime = time;

    const w = this.canvas.width;
    const h = this.canvas.height;

    this.draw(w, h);

    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  /** Dispatcher — delegates to a type-specific renderer. */
  draw(w, h) {
    const ctx = this.ctx;
    const cs = getComputedStyle(document.documentElement);
    const ac = cs.getPropertyValue("--accent-color").trim()   || "#00F0FF";
    const rc = cs.getPropertyValue("--response-color").trim() || "#00FF88";
    if      (this.currentType === "matrix")    this._drawMatrix(ctx, w, h, ac);
    else if (this.currentType === "starfield") this._drawStarfield(ctx, w, h, ac, rc);
    else if (this.currentType === "particles") this._drawParticles(ctx, w, h, ac);
    else if (this.currentType === "grid")      this._drawGrid(ctx, w, h, ac, rc);
    else if (this.currentType === "radar")     this._drawRadar(ctx, w, h, ac, rc);
    else if (this.currentType === "circuit")   this._drawCircuit(ctx, w, h, ac, rc);
    else if (this.currentType === "wave")      this._drawWave(ctx, w, h, ac, rc);
    else if (this.currentType === "ascii")     this._drawAscii(ctx, w, h, ac);
  }

  _drawMatrix(ctx, w, h, ac) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "14px monospace";
    for (let i = 0; i < this.particles.length; i++) {
      const char = String.fromCharCode(33 + Math.floor(Math.random() * 93));
      const x = i * 16;
      const y = this.particles[i];
      ctx.fillStyle = "#ffffff";
      ctx.fillText(char, x, y);
      ctx.fillStyle = ac;
      ctx.fillText(char, x, y - 14);
      this.particles[i] += 14;
      if (this.particles[i] > h && Math.random() > 0.98) this.particles[i] = 0;
    }
  }

  _drawStarfield(ctx, w, h, ac, rc) {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, speed = 4;
    for (let i = 0; i < this.particles.length; i++) {
      const star = this.particles[i];
      const px = (star.x / star.z) * cx + cx;
      const py = (star.y / star.z) * cy + cy;
      star.z -= speed;
      if (star.z <= 0) {
        star.x = Math.random() * w - cx;
        star.y = Math.random() * h - cy;
        star.z = w;
        continue;
      }
      const nx = (star.x / star.z) * cx + cx;
      const ny = (star.y / star.z) * cy + cy;
      if (nx >= 0 && nx <= w && ny >= 0 && ny <= h) {
        const alpha = 1 - star.z / w;
        ctx.strokeStyle = star.color.startsWith("var")
          ? star.color.includes("accent") ? ac : rc
          : star.color;
        ctx.lineWidth = alpha * 2;
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;
  }

  _drawParticles(ctx, w, h, ac) {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      if (this.mouseX > 0 && this.mouseY > 0) {
        const dx = p.x - this.mouseX, dy = p.y - this.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120;
          p.x += (dx / dist) * force * 2;
          p.y += (dy / dist) * force * 2;
        }
      }
      ctx.fillStyle = ac; ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = ac;
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p1.x - p2.x, dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.globalAlpha = ((100 - dist) / 100) * 0.15;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1.0;
  }

  _drawGrid(ctx, w, h, ac, rc) {
    ctx.clearRect(0, 0, w, h);
    const horizon = h * 0.45, gridHeight = h - horizon;
    this.angle = (this.angle + 0.8) % 40;
    const glowGrad = ctx.createLinearGradient(0, horizon - 50, 0, horizon + 50);
    glowGrad.addColorStop(0, "transparent");
    glowGrad.addColorStop(0.5, rc + "1a");
    glowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = glowGrad; ctx.fillRect(0, horizon - 50, w, 100);
    ctx.strokeStyle = rc; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(w, horizon); ctx.stroke();
    const numVerts = 30;
    for (let i = 0; i <= numVerts; i++) {
      const xTop = (w / numVerts) * i;
      const xBottom = w / 2 + (xTop - w / 2) * 3;
      ctx.strokeStyle = ac; ctx.globalAlpha = 0.12;
      ctx.beginPath(); ctx.moveTo(xTop, horizon); ctx.lineTo(xBottom, h); ctx.stroke();
    }
    const speedRatio = this.angle / 40, numHoriz = 12;
    for (let i = 0; i < numHoriz; i++) {
      const ratio = (i + speedRatio) / numHoriz;
      const y = horizon + Math.pow(ratio, 2.5) * gridHeight;
      ctx.strokeStyle = ac; ctx.globalAlpha = Math.pow(ratio, 1.5) * 0.25; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  _drawRadar(ctx, w, h, ac, rc) {
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.75, cy = h * 0.6, maxRadius = Math.min(w, h) * 0.45;
    this.angle = (this.angle + 0.005) % (Math.PI * 2);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.angle);
    const radarSweep = ctx.createRadialGradient(0, 0, 10, 0, 0, maxRadius);
    radarSweep.addColorStop(0, rc + "33"); radarSweep.addColorStop(1, "transparent");
    ctx.fillStyle = radarSweep;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, maxRadius, -0.4, 0); ctx.lineTo(0, 0); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = ac; ctx.lineWidth = 1;
    for (let r = 50; r <= maxRadius; r += 80) {
      ctx.globalAlpha = 0.08; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.2; ctx.fillStyle = ac; ctx.font = "8px monospace";
      ctx.fillText(`R_${r}KM`, cx + r + 3, cy - 3);
    }
    ctx.strokeStyle = ac; ctx.globalAlpha = 0.06;
    ctx.beginPath();
    ctx.moveTo(cx - maxRadius, cy); ctx.lineTo(cx + maxRadius, cy);
    ctx.moveTo(cx, cy - maxRadius); ctx.lineTo(cx, cy + maxRadius);
    ctx.stroke();
    ctx.font = "8px monospace";
    for (let i = 0; i < this.particles.length; i++) {
      const node = this.particles[i];
      node.alpha += node.speed;
      if (node.alpha > 1 || node.alpha < 0) node.speed *= -1;
      ctx.fillStyle = rc; ctx.globalAlpha = node.alpha * 0.3;
      ctx.beginPath(); ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ac; ctx.globalAlpha = node.alpha * 0.2;
      ctx.fillText(node.label, node.x + 6, node.y + 3);
    }
    ctx.globalAlpha = 1.0;
  }

  _drawCircuit(ctx, w, h, ac, rc) {
    ctx.clearRect(0, 0, w, h); ctx.lineWidth = 1.2;
    const resolveColor = (c) => c.startsWith("var") ? (c.includes("accent") ? ac : rc) : c;
    for (let i = 0; i < this.particles.length; i++) {
      const line = this.particles[i];
      if (line.points.length > 0 && line.stepsRemaining > 0) {
        const lastPt = line.points[line.points.length - 1];
        line.stepsRemaining--;
        line.points.push({ x: lastPt.x + line.dirX * line.growSpeed, y: lastPt.y + line.dirY * line.growSpeed });
        if (line.stepsRemaining <= 0 && Math.random() > 0.3 && line.points.length < 80) {
          line.stepsRemaining = Math.floor(Math.random() * 15) + 10;
          const angle = (Math.floor(Math.random() * 8) * Math.PI) / 4;
          line.dirX = Math.cos(angle); line.dirY = Math.sin(angle);
        }
      }
      if (line.points.length > 1) {
        ctx.strokeStyle = resolveColor(line.color); ctx.globalAlpha = line.alpha * 0.15;
        ctx.beginPath(); ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let j = 1; j < line.points.length; j++) ctx.lineTo(line.points[j].x, line.points[j].y);
        ctx.stroke();
        const head = line.points[line.points.length - 1];
        ctx.fillStyle = resolveColor(line.color); ctx.globalAlpha = line.alpha * 0.4;
        ctx.beginPath(); ctx.arc(head.x, head.y, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      line.alpha -= 0.001;
      if (line.alpha <= 0 || (line.points.length >= 80 && line.stepsRemaining <= 0))
        this.particles[i] = this.createCircuitLine(w, h);
    }
    ctx.globalAlpha = 1.0;
  }

  _drawWave(ctx, w, h, ac, rc) {
    ctx.clearRect(0, 0, w, h);
    this.angle += 0.02;
    const configs = [
      { amp: 40, freq: 0.003, phase: this.angle,       color: ac,        opacity: 0.1  },
      { amp: 25, freq: 0.005, phase: this.angle * 1.5,  color: rc,        opacity: 0.08 },
      { amp: 15, freq: 0.008, phase: this.angle * 0.8,  color: "#A855F7", opacity: 0.06 },
    ];
    for (const cfg of configs) {
      ctx.strokeStyle = cfg.color; ctx.lineWidth = 1.5; ctx.globalAlpha = cfg.opacity;
      ctx.beginPath();
      const midY = h / 2 + Math.sin(cfg.phase * 0.2) * 50;
      ctx.moveTo(0, midY);
      for (let x = 0; x < w; x += 10) {
        ctx.lineTo(x, midY + Math.sin(x * cfg.freq + cfg.phase) * cfg.amp * Math.sin((x / w) * Math.PI));
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  _drawAscii(ctx, w, h, ac) {
    ctx.fillStyle = "#020305"; ctx.fillRect(0, 0, w, h);
    ctx.font = "12px monospace"; ctx.fillStyle = ac;
    for (let i = 0; i < this.particles.length; i++) {
      const line = this.particles[i];
      ctx.globalAlpha = line.alpha;
      ctx.fillText(line.text, 15, line.y);
      line.y -= line.speed;
      if (line.y < -20) {
        line.y = h + 20;
        line.text = this.getRandomLogText();
        line.speed = 0.5 + Math.random() * 1.5;
        line.alpha = 0.15 + Math.random() * 0.35;
      }
    }
    ctx.globalAlpha = 1.0;
  }
}

window.liveBgManager = new LiveBackgroundManager();

function _bgCreateCard(bg, isLive) {
  const card = document.createElement("div");
  card.className = "bg-gallery-card";
  card.setAttribute("data-id", bg.id);
  if (!isLive) card.setAttribute("data-url", bg.url);
  const preview = document.createElement("div");
  preview.className = "bg-gallery-card-preview";
  if (isLive) { preview.style.background = bg.preview; }
  else if (bg.url) { preview.style.backgroundImage = "url('" + bg.url + "')"; }
  else { preview.style.background = "#050505"; }
  const title = document.createElement("div");
  title.className = "bg-gallery-card-title";
  title.innerText = bg.name;
  const desc = document.createElement("div");
  desc.className = "bg-gallery-card-desc";
  desc.innerText = bg.desc;
  card.append(preview, title, desc);
  card.onclick = function () {
    document.querySelectorAll(".bg-gallery-card").forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    const url = isLive ? "live:" + bg.id : bg.url;
    const bgUrlInput = document.getElementById("bg-url-input");
    if (bgUrlInput) bgUrlInput.value = url;
    localStorage.setItem("bgUrl", url);
    const tvpBgLayer = document.getElementById("tvp-bg-layer");
    if (tvpBgLayer) {
      if (isLive) { tvpBgLayer.style.backgroundImage = "none"; tvpBgLayer.style.backgroundColor = bg.preview || "#050505"; }
      else if (bg.url) { tvpBgLayer.style.backgroundColor = "transparent"; tvpBgLayer.style.backgroundImage = "url('" + bg.url + "')"; }
      else { tvpBgLayer.style.backgroundImage = "none"; tvpBgLayer.style.backgroundColor = "transparent"; }
    }
    applySettings();
  };
  return card;
}

function _bgUpdateThemePreview() {
  const tvpPreview = document.getElementById("theme-viewport-preview");
  if (!tvpPreview) return;
  tvpPreview.style.setProperty("--preview-bg", document.getElementById("ct-bg")?.value || "#050505");
  tvpPreview.style.setProperty("--preview-fg", document.getElementById("ct-fg")?.value || "#D9F7FF");
  tvpPreview.style.setProperty("--preview-accent", document.getElementById("ct-accent")?.value || "#00F0FF");
  tvpPreview.style.setProperty("--preview-response", document.getElementById("ct-response")?.value || "#00FF88");
  tvpPreview.style.setProperty("--preview-warning", document.getElementById("ct-warning")?.value || "#FFB000");
  tvpPreview.style.setProperty("--preview-error", document.getElementById("ct-error")?.value || "#FF3C5A");
}

function renderBackgroundGallery() {
  const liveContainer = document.getElementById("bg-gallery-live");
  const staticContainer = document.getElementById("bg-gallery-static");
  if (!liveContainer || !staticContainer) return;

  liveContainer.innerHTML = "";
  staticContainer.innerHTML = "";
  liveContainer.appendChild(_bgCreateCard({ id: "", name: "None (Solid Black)", desc: "Deep matte black battery-saver mode", preview: "#050505" }, true));
  LIVE_BACKGROUNDS.forEach((bg) => liveContainer.appendChild(_bgCreateCard(bg, true)));
  staticContainer.appendChild(_bgCreateCard({ id: "", name: "None (Solid Black)", url: "", desc: "Deep matte black battery-saver mode" }, false));
  STATIC_BACKGROUNDS.forEach((bg) => staticContainer.appendChild(_bgCreateCard(bg, false)));

  const tabLive = document.getElementById("bg-tab-live");
  const tabStatic = document.getElementById("bg-tab-static");
  if (tabLive && tabStatic) {
    tabLive.onclick = function () { tabLive.classList.add("active"); tabStatic.classList.remove("active"); liveContainer.style.display = "grid"; staticContainer.style.display = "none"; };
    tabStatic.onclick = function () { tabStatic.classList.add("active"); tabLive.classList.remove("active"); staticContainer.style.display = "grid"; liveContainer.style.display = "none"; };
  }

  ["ct-bg","ct-fg","ct-accent","ct-response","ct-warning","ct-error"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", _bgUpdateThemePreview);
  });
  _bgUpdateThemePreview();
}
window.renderBackgroundGallery = renderBackgroundGallery;

/* --- SEPARATOR --- */

// ==========================================================================
// STEAM DECK CONTROLLER (GAMEPAD API) INPUT WIRING
// ==========================================================================
// let gamepadActive = false; (Moved to state.js)
// let gamepadFocusIndex = -1; (Moved to state.js)
// Removed state.previousGamepadState multiline declaration (moved to state.js)

// Sprint C — Touchpad cursor state
// let tpCursorX = 640; (Moved to state.js) // Start at screen center (1280/2)
// let tpCursorY = 400; (Moved to state.js) // Start at screen center (800/2)
// let tpCursorVisible = false; (Moved to state.js)
// let tpCursorHideTimer = null; (Moved to state.js)
// let tpScrollVisible = false; (Moved to state.js)
// let tpScrollHideTimer = null; (Moved to state.js)
const TP_SENSITIVITY = 9; // pixels per frame per axis unit
const TP_DEADZONE = 0.06; // ignore jitter below this magnitude
const TP_SCROLL_SPEED = 14; // pixels per frame for left-stick scroll
const TP_CURSOR_TIMEOUT = 2500; // ms idle before cursor fades

function initTouchpadCursorDOM() {
  const cursor = document.createElement("div");
  cursor.id = "tp-cursor";
  document.body.appendChild(cursor);

  const scrollInd = document.createElement("div");
  scrollInd.id = "tp-scroll-indicator";
  scrollInd.innerHTML = `
        <div class="tp-scroll-arrow tp-scroll-arrow-up"></div>
        <div class="tp-scroll-arrow tp-scroll-arrow-down"></div>`;
  document.body.appendChild(scrollInd);
}
initTouchpadCursorDOM();

function moveTpCursor(dx, dy) {
  state.tpCursorX = Math.max(
    0,
    Math.min(window.innerWidth - 1, state.tpCursorX + dx),
  );
  state.tpCursorY = Math.max(
    0,
    Math.min(window.innerHeight - 1, state.tpCursorY + dy),
  );
  const el = document.getElementById("tp-cursor");
  if (el) {
    el.style.left = state.tpCursorX + "px";
    el.style.top = state.tpCursorY + "px";
    el.classList.add("tp-visible");
  }
  state.tpCursorVisible = true;
  clearTimeout(state.tpCursorHideTimer);
  state.tpCursorHideTimer = setTimeout(() => {
    const c = document.getElementById("tp-cursor");
    if (c) c.classList.remove("tp-visible");
    state.tpCursorVisible = false;
  }, TP_CURSOR_TIMEOUT);
}

function tpClick(button = 0) {
  const el = document.elementFromPoint(state.tpCursorX, state.tpCursorY);
  if (!el) return;
  const cursor = document.getElementById("tp-cursor");
  if (cursor) {
    cursor.classList.add("tp-clicking");
    setTimeout(() => cursor.classList.remove("tp-clicking"), 120);
  }
  // Dispatch full pointer/mouse/click event chain
  const opts = {
    bubbles: true,
    cancelable: true,
    clientX: state.tpCursorX,
    clientY: state.tpCursorY,
    button,
  };
  el.dispatchEvent(new PointerEvent("pointerdown", opts));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new PointerEvent("pointerup", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.dispatchEvent(new MouseEvent("click", opts));
  // Focus text inputs on click
  if (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.isContentEditable
  ) {
    el.focus();
  }
}

function getActiveScrollContainer() {
  // Returns the best scrollable container for the currently visible view
  const views = [
    "chat-viewport",
    "agent-log",
    "memory-list",
    "ftp-file-list",
    "sftp-file-list",
    "sidebar-history",
  ];
  for (const id of views) {
    const el = document.getElementById(id);
    if (el && el.offsetParent !== null && el.scrollHeight > el.clientHeight)
      return el;
  }
  // Fallback: any overflow-y element under cursor
  return null;
}

function showTpScrollIndicator(active) {
  const el = document.getElementById("tp-scroll-indicator");
  if (!el) return;
  if (active) {
    el.classList.add("tp-visible");
    clearTimeout(state.tpScrollHideTimer);
    state.tpScrollHideTimer = setTimeout(() => {
      el.classList.remove("tp-visible");
      state.tpScrollVisible = false;
    }, 1200);
    state.tpScrollVisible = true;
  } else {
    el.classList.remove("tp-visible");
    state.tpScrollVisible = false;
  }
}

// Radial menu state
// let radialMenuVisible = false; (Moved to state.js)
// let radialSelectedSegment = null; (Moved to state.js)

// Controller Prompt Picker state (declared here so pollGamepads can reference it)

// RADIAL_SEGMENTS imported from ./radial.js

function getActiveModalFocusableElements(modalId, selector = "button") {
  const modal = document.getElementById(modalId);
  if (modal && modal.classList.contains("active")) {
    const els = Array.from(modal.querySelectorAll(selector));
    return els.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !el.disabled;
    });
  }
  return null;
}

const _GP_FOCUSABLE_SELECTORS = [
  "#sidebar:not(.collapsed) #sidebar-close-btn",
  "#sidebar:not(.collapsed) #new-chat-btn",
  "#sidebar:not(.collapsed) .history-item",
  "#sidebar-toggle-btn", ".nav-tab", "#mute-btn", "#notif-btn", "#settings-btn",
  "#view-chat.active #user-input", "#view-chat.active #mic-btn",
  "#view-chat.active #toggle-drawer-btn", "#view-chat.active #send-btn",
  "#view-chat.active .code-header-btn", "#view-chat.active .message",
  "#view-canvas.active #canvas-run-btn", "#view-canvas.active #canvas-clear-btn",
  "#view-canvas.active #canvas-copy-btn", "#view-canvas.active #canvas-lang-select",
  "#view-canvas.active #canvas-collab-btn",
  "#view-terminal.active #pty-reconnect-btn",
  "#view-tunnel.active #tunnel-check-btn", "#view-tunnel.active #tunnel-toggle-btn",
  "#view-tunnel.active #tunnel-cmd-input", "#view-tunnel.active #tunnel-cmd-send",
  "#view-tunnel.active #tunnel-filepath-input", "#view-tunnel.active #tunnel-filecontent-input",
  "#view-tunnel.active #tunnel-file-send", "#view-tunnel.active #tunnel-dirpath-input",
  "#view-tunnel.active #tunnel-dir-send",
  "#view-share.active .peer-item", "#view-share.active #share-dropzone",
  "#view-share.active #share-filepath-input", "#view-share.active #share-send-btn",
  "#view-memory.active #memory-search-input", "#view-memory.active #memory-refresh-btn",
  "#view-memory.active #memory-fact-input", "#view-memory.active #memory-fact-save-btn",
  "#view-agent.active #agent-task-input", "#view-agent.active #agent-run-btn",
  "#view-agent.active #agent-stop-btn", "#view-agent.active #agent-send-canvas-btn",
  "#view-docs.active #docs-search-input", "#view-docs.active #docs-search-btn",
  "#view-docs.active #docs-index-btn", "#view-docs.active #docs-clear-btn",
  "#view-docs.active .docs-remove-btn",
  "#inspect-drawer:not(.collapsed) #inspect-close-btn",
];

function _gpCheckModalFocusable() {
  const modals = ["notif-modal", "game-context-modal", "computer-use-modal", "transfer-modal"];
  for (const id of modals) {
    const els = getActiveModalFocusableElements(id);
    if (els) return els;
  }
  const settingsEls = getActiveModalFocusableElements("settings-overlay", "select, input, button");
  if (settingsEls) return settingsEls;
  return null;
}

function getGamepadFocusableElements() {
  if (getCtrlPromptVisible()) return [];
  const modalEls = _gpCheckModalFocusable();
  if (modalEls) return modalEls;
  const elements = [];
  _GP_FOCUSABLE_SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && !el.disabled) elements.push(el);
    });
  });
  return elements;
}

function updateGamepadFocus(index) {
  const els = getGamepadFocusableElements();
  document
    .querySelectorAll(".gamepad-focused")
    .forEach((el) => el.classList.remove("gamepad-focused"));

  if (els.length === 0) {
    state.gamepadFocusIndex = -1;
    return;
  }

  if (index < 0) {
    state.gamepadFocusIndex = els.length - 1;
  } else if (index >= els.length) {
    state.gamepadFocusIndex = 0;
  } else {
    state.gamepadFocusIndex = index;
  }
  triggerHaptic("light");

  const target = els[state.gamepadFocusIndex];
  if (target) {
    target.classList.add("gamepad-focused");
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA"
    ) {
      target.focus();
    }
  }
}

document.addEventListener("mousedown", () => {
  document
    .querySelectorAll(".gamepad-focused")
    .forEach((el) => el.classList.remove("gamepad-focused"));
  state.gamepadFocusIndex = -1;
});

const _RADIAL_R_OUTER = 130, _RADIAL_R_INNER = 52, _RADIAL_CX = 150, _RADIAL_CY = 150;

function _radialPolarToXY(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: _RADIAL_CX + r * Math.cos(rad), y: _RADIAL_CY + r * Math.sin(rad) };
}

function _radialBuildPaths(segDeg) {
  let svgPaths = "";
  RADIAL_SEGMENTS.forEach((seg, i) => {
    const startAngle = i * segDeg - segDeg / 2;
    const endAngle = startAngle + segDeg;
    const p1 = _radialPolarToXY(startAngle, _RADIAL_R_INNER);
    const p2 = _radialPolarToXY(startAngle, _RADIAL_R_OUTER);
    const p3 = _radialPolarToXY(endAngle, _RADIAL_R_OUTER);
    const p4 = _radialPolarToXY(endAngle, _RADIAL_R_INNER);
    const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${_RADIAL_R_OUTER} ${_RADIAL_R_OUTER} 0 0 1 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} A ${_RADIAL_R_INNER} ${_RADIAL_R_INNER} 0 0 0 ${p1.x} ${p1.y} Z`;
    svgPaths += `<path class="radial-slice radial-segment" data-segment="${i}" d="${d}" />`;
  });
  return svgPaths;
}

function _radialBuildItems(segDeg) {
  const LABEL_R = 105;
  let items = "";
  RADIAL_SEGMENTS.forEach((seg, i) => {
    const rad = ((i * segDeg - 90) * Math.PI) / 180;
    const x = _RADIAL_CX + LABEL_R * Math.cos(rad);
    const y = _RADIAL_CY + LABEL_R * Math.sin(rad);
    items += `<div class="radial-item" data-segment="${i}" style="left:${x}px;top:${y}px">
            <span class="radial-item-icon">${seg.icon}</span>
            <span class="radial-item-label">${seg.label}</span>
        </div>`;
  });
  return items;
}

function initRadialMenu() {
  const segDeg = 360 / RADIAL_SEGMENTS.length;
  const overlay = document.getElementById("radial-menu-overlay") || document.createElement("div");
  overlay.id = "radial-menu-overlay";
  overlay.className = "radial-menu hidden";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
        <div class="radial-backdrop"></div>
        <div class="radial-ring" id="radial-ring">
            <svg class="radial-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                ${_radialBuildPaths(segDeg)}
            </svg>
            ${_radialBuildItems(segDeg)}
            <div class="radial-center" id="radial-center-label">
                <span class="radial-center-icon" id="radial-center-icon">🎮</span>
                <span class="radial-center-text" id="radial-center-text">MENU</span>
            </div>
        </div>
        <div class="radial-hint">Release L2 to navigate · Push stick to select</div>`;
  if (!overlay.parentNode) document.body.appendChild(overlay);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.radialMenuVisible) {
      event.preventDefault();
      hideRadialMenu();
      return;
    }
    if (event.key !== "Backquote" && event.code !== "Backquote" && event.key !== "`") return;
    event.preventDefault();
    if (state.radialMenuVisible) hideRadialMenu();
    else showRadialMenu();
  });
}

function showRadialMenu() {
  const el = document.getElementById("radial-menu-overlay");
  if (el) {
    el.classList.remove("hidden");
    el.classList.add("active");
    el.setAttribute("aria-hidden", "false");
  }
  state.radialMenuVisible = true;
  state.radialSelectedSegment = null;
  updateRadialDisplay(null);
  triggerHaptic("medium");
}

function hideRadialMenu() {
  const el = document.getElementById("radial-menu-overlay");
  if (el) {
    el.classList.remove("active");
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
  }
  state.radialMenuVisible = false;
  state.radialSelectedSegment = null;
  triggerHaptic("light");
}

function getRadialSegmentFromStick(x, y) {
  const DEADZONE = 0.38;
  if (Math.sqrt(x * x + y * y) < DEADZONE) return null;
  // atan2(x, -y) gives 0=up, increasing clockwise
  let angle = (Math.atan2(x, -y) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  // Offset by half-segment so segments are centered on cardinal/diagonal directions
  const segDeg = 360 / RADIAL_SEGMENTS.length;
  angle = (angle + segDeg / 2) % 360;
  return Math.floor(angle / segDeg) % RADIAL_SEGMENTS.length;
}

function updateRadialDisplay(segIdx) {
  state.radialSelectedSegment = segIdx;

  // Update slice highlights
  document.querySelectorAll(".radial-slice").forEach((slice) => {
    const si = parseInt(slice.dataset.segment, 10);
    slice.classList.toggle("active", si === segIdx);
  });
  // Update item highlights
  document.querySelectorAll(".radial-item").forEach((item) => {
    const si = parseInt(item.dataset.segment, 10);
    item.classList.toggle("active", si === segIdx);
  });

  const centerIcon = document.getElementById("radial-center-icon");
  const centerText = document.getElementById("radial-center-text");
  if (segIdx !== null && RADIAL_SEGMENTS[segIdx]) {
    const seg = RADIAL_SEGMENTS[segIdx];
    if (centerIcon) centerIcon.textContent = seg.icon;
    if (centerText) centerText.textContent = seg.label;
  } else {
    if (centerIcon) centerIcon.textContent = "🎮";
    if (centerText) centerText.textContent = "MENU";
  }
}

function activateRadialSegment(segIdx) {
  if (segIdx === null || !RADIAL_SEGMENTS[segIdx]) return;
  const view = RADIAL_SEGMENTS[segIdx].view;
  const tab = document.querySelector(`.nav-tab[data-view="${view}"]`);
  if (tab) {
    tab.click();
    triggerHaptic("heavy");
  }
}

function _gpButtonPressed(gp, index) {
  return !!(gp.buttons[index] && gp.buttons[index].pressed && !state.previousGamepadState.buttons[index]);
}

function _gpFaceButtonA(gp) {
  if (!_gpButtonPressed(gp, 0)) return;
  triggerHaptic("medium");
  if (getCtrlPromptVisible()) {
    getCtrlPromptTemplateMode() ? confirmTemplateAndSend() : confirmCtrlPrompt();
  } else {
    const els = getGamepadFocusableElements();
    const activeEl = els[state.gamepadFocusIndex];
    if (activeEl) { activeEl.click(); if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") activeEl.focus(); }
    else { updateGamepadFocus(0); }
  }
}

function _gpFaceButtonB(gp) {
  if (!_gpButtonPressed(gp, 1)) return;
  triggerHaptic("medium");
  if (getCtrlPromptVisible()) { getCtrlPromptTemplateMode() ? exitTemplateMode() : closeCtrlPromptOverlay(); }
  else { closeTopmostOverlay(); }
}

function _gpFaceButtonX(gp) {
  if (!_gpButtonPressed(gp, 2) || getCtrlPromptVisible()) return;
  const focused = document.querySelector(".gamepad-focused");
  if (focused && focused.classList.contains("message")) {
    triggerHaptic("doubleTick");
    const text = getMessageText(focused);
    if (text) {
      navigator.clipboard.writeText(text).catch(() => {});
      focused.style.transition = "background 0.2s";
      const oldBg = focused.style.background;
      focused.style.background = "rgba(94, 235, 255, 0.15)";
      setTimeout(() => { focused.style.background = oldBg; }, 400);
    }
  } else {
    triggerHaptic("light");
    const chatTab = document.querySelector('.nav-tab[data-view="chat"]');
    if (chatTab) chatTab.click();
    setTimeout(() => {
      const userInput = document.getElementById("user-input");
      if (userInput) {
        userInput.focus();
        const els = getGamepadFocusableElements();
        const uidx = els.indexOf(userInput);
        if (uidx !== -1) updateGamepadFocus(uidx);
      }
    }, 50);
  }
}

function _gpFaceButtonY(gp) {
  if (!_gpButtonPressed(gp, 3) || getCtrlPromptVisible()) return;
  triggerHaptic("medium");
  const chatView = document.getElementById("view-chat");
  if (chatView && chatView.classList.contains("active")) {
    const msgs = getMessageElements();
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].classList.contains("user")) {
        const text = getMessageText(msgs[i]);
        if (text) {
          const input = document.getElementById("user-input");
          if (input) {
            input.value = text; input.style.height = "auto";
            input.style.height = Math.min(input.scrollHeight, 300) + "px"; input.focus();
          }
          setTimeout(() => { const s = document.getElementById("send-btn"); if (s) s.click(); }, 300);
        }
        break;
      }
    }
  } else if (state.availablePersonas && state.availablePersonas.length > 0) {
    const nextPersona = state.availablePersonas[(state.availablePersonas.indexOf(state.activePersona) + 1) % state.availablePersonas.length];
    invoke("set_persona", { name: nextPersona })
      .then(() => { state.activePersona = nextPersona; const sel = document.getElementById("persona-select"); if (sel) sel.value = nextPersona; })
      .catch((err) => console.error("Error setting persona via Gamepad:", err));
  }
}

function _gpHandleFaceButtons(gp) {
  _gpFaceButtonA(gp);
  _gpFaceButtonB(gp);
  _gpFaceButtonX(gp);
  _gpFaceButtonY(gp);
}

function _gpShoulderL2R2(gp) {
  if (_gpButtonPressed(gp, 6) || _gpButtonPressed(gp, 7)) {
    const shareView = document.getElementById("view-share");
    if (shareView && shareView.classList.contains("active")) {
      const subtabs = Array.from(document.querySelectorAll(".share-inner-tab"));
      const idx = subtabs.findIndex((t) => t.classList.contains("active"));
      if (idx !== -1) { subtabs[_gpButtonPressed(gp, 6) ? (idx - 1 + subtabs.length) % subtabs.length : (idx + 1) % subtabs.length].click(); triggerHaptic("light"); }
    }
  }
  if (_gpButtonPressed(gp, 7)) {
    const shareView = document.getElementById("view-share");
    if (!(shareView && shareView.classList.contains("active"))) {
      if (getCtrlPromptVisible()) {
        triggerHaptic("light");
        getCtrlPromptTemplateMode() ? exitTemplateMode() : closeCtrlPromptOverlay();
      } else {
        openCtrlPromptOverlay(); triggerHaptic("medium");
        if (state.gamepadActive && window.showVirtualKeyboard) {
          setTimeout(() => { const s = document.getElementById("ctrl-prompt-search"); if (s) { s.focus(); window.showVirtualKeyboard(s); } }, 120);
        }
      }
    }
  }
}

function _gpShoulderL1R1_CtrlPrompt(isL1) {
  triggerHaptic("light"); 
  navigateCtrlPromptCat(isL1 ? -1 : 1);
}

function _gpShoulderL1R1_ChatScroll(isL1) {
  const chatView = document.getElementById("view-chat");
  if (chatView && chatView.classList.contains("active")) {
    const workspace = document.getElementById("chat-workspace");
    if (workspace) workspace.scrollTop += isL1 ? -(workspace.clientHeight * 0.8) : (workspace.clientHeight * 0.8);
  }
}

function _gpShoulderL1R1_SshProfile() {
  const sshView = document.getElementById("view-ssh");
  if (sshView && sshView.classList.contains("active")) {
    const focused = document.querySelector("#ssh-profiles-list .ssh-profile-item.gamepad-focused");
    if (focused) focused.click();
  }
}

function _gpShoulderL1R1_NavTabs(isL1) {
  const tabs = Array.from(document.querySelectorAll(".nav-tab"));
  const activeTabIdx = tabs.findIndex((tab) => tab.classList.contains("active"));
  if (activeTabIdx !== -1) {
    const nextIdx = isL1 ? (activeTabIdx - 1 + tabs.length) % tabs.length : (activeTabIdx + 1) % tabs.length;
    if (nextIdx !== activeTabIdx) { 
      tabs[nextIdx].click(); 
      triggerHaptic("light"); 
      state.gamepadFocusIndex = -1; 
      document.querySelectorAll(".gamepad-focused").forEach((el) => el.classList.remove("gamepad-focused")); 
    }
  }
}

function _gpShoulderL1R1(gp) {
  const isL1 = _gpButtonPressed(gp, 4);
  const isR1 = _gpButtonPressed(gp, 5);
  if (!isL1 && !isR1) return;

  if (getCtrlPromptVisible()) {
    _gpShoulderL1R1_CtrlPrompt(isL1);
    return;
  }
  
  _gpShoulderL1R1_ChatScroll(isL1);
  _gpShoulderL1R1_SshProfile();
  _gpShoulderL1R1_NavTabs(isL1);
}

function _gpHandleShoulderButtons(gp) {
  _gpShoulderL2R2(gp);
  _gpShoulderL1R1(gp);
}

function _gpHandleMenuButtons(gp) {
  if (_gpButtonPressed(gp, 8) && !getCtrlPromptVisible()) {
    triggerHaptic("medium");
    const runBtn = document.getElementById("canvas-run-btn");
    if (runBtn) runBtn.click();
  }
  if (_gpButtonPressed(gp, 9) && !getCtrlPromptVisible()) {
    triggerHaptic("medium");
    const settingsOverlay = document.getElementById("settings-overlay");
    if (settingsOverlay) {
      if (settingsOverlay.classList.contains("active")) document.getElementById("close-settings").click();
      else document.getElementById("settings-btn").click();
    }
  }
}

function _gpDpadVerticalCtrlPrompt(goUp) {
  if (getCtrlPromptTemplateMode()) navigateTemplatePlaceholder(goUp ? -1 : 1);
  else navigateCtrlPromptList(goUp ? -1 : 1);
}

function _gpDpadVerticalShare(goUp) {
  const subtabs = Array.from(document.querySelectorAll(".share-inner-tab"));
  const idx = subtabs.findIndex((t) => t.classList.contains("active"));
  if (idx !== -1) subtabs[goUp ? (idx - 1 + subtabs.length) % subtabs.length : (idx + 1) % subtabs.length].click();
}

function _gpDpadVerticalSsh(goUp) {
  const items = Array.from(document.querySelectorAll("#ssh-profiles-list .ssh-profile-item"));
  if (items.length > 0) {
    const selIdx = items.findIndex((el) => el.classList.contains("gamepad-focused"));
    const nextIdx = goUp ? Math.max(0, selIdx === -1 ? items.length - 1 : selIdx - 1) : Math.min(items.length - 1, selIdx === -1 ? 0 : selIdx + 1);
    items.forEach((el) => el.classList.remove("gamepad-focused"));
    items[nextIdx].classList.add("gamepad-focused");
    items[nextIdx].scrollIntoView({ block: "nearest" });
  } else {
    updateGamepadFocus(goUp ? state.gamepadFocusIndex - 1 : state.gamepadFocusIndex + 1);
  }
}

function _gpDpadVertical(gp, goUp) {
  if (getCtrlPromptVisible()) {
    _gpDpadVerticalCtrlPrompt(goUp);
    return;
  }
  const shareView = document.getElementById("view-share");
  const sshView = document.getElementById("view-ssh");
  if (shareView && shareView.classList.contains("active")) {
    _gpDpadVerticalShare(goUp);
  } else if (sshView && sshView.classList.contains("active")) {
    _gpDpadVerticalSsh(goUp);
  } else {
    updateGamepadFocus(goUp ? state.gamepadFocusIndex - 1 : state.gamepadFocusIndex + 1);
  }
}

function _gpDpadHorizontal(gp, goLeft) {
  if (getCtrlPromptVisible()) {
    if (getCtrlPromptTemplateMode()) cycleTemplatePlaceholder(goLeft ? -1 : 1);
    else navigateCtrlPromptCat(goLeft ? -1 : 1);
    return;
  }
  const els = getGamepadFocusableElements();
  const activeEl = els[state.gamepadFocusIndex];
  const handled = activeEl && (() => {
    if (activeEl.tagName === "INPUT" && activeEl.type === "range") {
      const step = parseInt(activeEl.step, 10) || 5;
      activeEl.value = goLeft
        ? Math.max(parseInt(activeEl.min, 10) || 0, parseInt(activeEl.value, 10) - step)
        : Math.min(parseInt(activeEl.max, 10) || 100, parseInt(activeEl.value, 10) + step);
      activeEl.dispatchEvent(new Event("input", { bubbles: true })); return true;
    }
    if (activeEl.tagName === "SELECT") {
      const idx = goLeft ? Math.max(0, activeEl.selectedIndex - 1) : Math.min(activeEl.options.length - 1, activeEl.selectedIndex + 1);
      if (idx !== activeEl.selectedIndex) { activeEl.selectedIndex = idx; activeEl.dispatchEvent(new Event("change", { bubbles: true })); }
      return true;
    }
    return false;
  })();
  if (!handled) {
    const tabs = Array.from(document.querySelectorAll(".nav-tab"));
    const activeTabIdx = tabs.findIndex((t) => t.classList.contains("active"));
    if (activeTabIdx !== -1) {
      const nextIdx = goLeft ? (activeTabIdx - 1 + tabs.length) % tabs.length : (activeTabIdx + 1) % tabs.length;
      tabs[nextIdx].click(); state.gamepadFocusIndex = -1;
      document.querySelectorAll(".gamepad-focused").forEach((el) => el.classList.remove("gamepad-focused"));
    }
  }
}

function _gpHandleDpad(gp) {
  if (_gpButtonPressed(gp, 12) || _gpButtonPressed(gp, 13)) _gpDpadVertical(gp, _gpButtonPressed(gp, 12));
  if (_gpButtonPressed(gp, 14) || _gpButtonPressed(gp, 15)) _gpDpadHorizontal(gp, _gpButtonPressed(gp, 14));
}

function _gpHandleGripButtons(gp) {
  if (getCtrlPromptVisible()) return;
  if (_gpButtonPressed(gp, 17)) { triggerHaptic("light"); const s = document.getElementById("sidebar"); if (s) s.classList.toggle("collapsed"); }
  if (_gpButtonPressed(gp, 18)) { triggerHaptic("light"); const d = document.getElementById("inspect-drawer"); if (d) d.classList.toggle("collapsed"); }
  if (_gpButtonPressed(gp, 19)) { triggerHaptic("heavy"); const c = document.getElementById("canvas-clear-btn"); if (c) c.click(); }
  if (_gpButtonPressed(gp, 20)) { triggerHaptic("light"); cycleTheme(); }
}

function _gpHandleRadialMenu(gp, l2Held, l2WasHeld) {
  if (l2Held && !l2WasHeld) {
    showRadialMenu();
  } else if (l2Held) {
    const seg = getRadialSegmentFromStick(gp.axes[0] || 0, gp.axes[1] || 0);
    if (seg !== state.radialSelectedSegment) { updateRadialDisplay(seg); triggerHaptic("tick"); }
  } else if (!l2Held && l2WasHeld) {
    activateRadialSegment(state.radialSelectedSegment);
    hideRadialMenu();
  }
}

function _gpHandleTouchpadAndScroll(gp, l2Held) {
  const rtX = gp.axes[2] || 0, rtY = gp.axes[3] || 0;
  if (Math.sqrt(rtX * rtX + rtY * rtY) > TP_DEADZONE && !l2Held) moveTpCursor(rtX * TP_SENSITIVITY, rtY * TP_SENSITIVITY);
  if (_gpButtonPressed(gp, 11) && state.tpCursorVisible) { triggerHaptic("medium"); tpClick(0); }
  if (!l2Held && Math.abs(gp.axes[1] || 0) > 0.2) {
    const scrollEl = getActiveScrollContainer();
    if (scrollEl) { scrollEl.scrollTop += (gp.axes[1] || 0) * TP_SCROLL_SPEED; showTpScrollIndicator(true); }
  }
  if (_gpButtonPressed(gp, 1) && state.tpCursorVisible) {
    const c = document.getElementById("tp-cursor");
    if (c) c.classList.remove("tp-visible");
    state.tpCursorVisible = false;
  }
  if (_gpButtonPressed(gp, 1) && !getCtrlPromptVisible()) {
    const vkEl = document.getElementById("vk-overlay");
    if (vkEl && vkEl.classList.contains("vk-visible") && window.hideVirtualKeyboard) window.hideVirtualKeyboard();
  }
}

function pollGamepads() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) { gp = gamepads[i]; break; }
  }
  if (!gp) {
    if (state.gamepadActive) {
      state.gamepadActive = false;
      document.querySelectorAll(".gamepad-focused").forEach((el) => el.classList.remove("gamepad-focused"));
      state.gamepadFocusIndex = -1;
    }
    requestAnimationFrame(pollGamepads);
    return;
  }
  state.gamepadActive = true;

  const l2Held    = (gp.buttons[6] ? gp.buttons[6].value : 0) > 0.5;
  const l2WasHeld = state.previousGamepadState.l2Held;

  _gpHandleFaceButtons(gp);
  _gpHandleShoulderButtons(gp);
  _gpHandleMenuButtons(gp);
  _gpHandleDpad(gp);
  _gpHandleGripButtons(gp);
  _gpHandleRadialMenu(gp, l2Held, l2WasHeld);
  _gpHandleTouchpadAndScroll(gp, l2Held);

  for (let i = 0; i < gp.buttons.length; i++) {
    state.previousGamepadState.buttons[i] = !!(gp.buttons[i] && gp.buttons[i].pressed);
  }
  state.previousGamepadState.l2Held = l2Held;

  requestAnimationFrame(pollGamepads);
}

/**
 * Close the topmost open overlay/modal/drawer when B is pressed.
 * Order matters: notification → game context → computer use → settings
 * → transfer → inspect drawer → sidebar.
 */
function closeTopmostOverlay() {
  let closed = false;
  const notifModal = document.getElementById("notif-modal");
  if (notifModal?.classList.contains("active")) {
    document.getElementById("close-notif-btn")?.click();
    closed = true;
  }
  const gameModal = document.getElementById("game-context-modal");
  if (!closed && gameModal?.classList.contains("active")) {
    document.getElementById("close-game-context")?.click();
    closed = true;
  }
  const computerUseModal = document.getElementById("computer-use-modal");
  if (!closed && computerUseModal?.classList.contains("active")) {
    document.getElementById("computer-use-deny-btn")?.click();
    closed = true;
  }
  const settingsOverlay = document.getElementById("settings-overlay");
  if (!closed && settingsOverlay?.classList.contains("active")) {
    document.getElementById("close-settings")?.click();
    closed = true;
  }
  const transferModal = document.getElementById("transfer-modal");
  if (!closed && transferModal?.classList.contains("active")) {
    document.getElementById("transfer-modal-reject")?.click();
    closed = true;
  }
  const inspectDrawer = document.getElementById("inspect-drawer");
  if (!closed && inspectDrawer && !inspectDrawer.classList.contains("collapsed")) {
    document.getElementById("inspect-close-btn")?.click();
    closed = true;
  }
  const sidebar = document.getElementById("sidebar");
  if (!closed && sidebar && !sidebar.classList.contains("collapsed")) {
    document.getElementById("sidebar-close-btn")?.click();
    closed = true;
  }
  if (closed) triggerHaptic("light");
}

function cycleTheme() {
  invoke("get_themes")
    .then((themes) => {
      if (!themes || themes.length === 0) return;
      const savedTheme = localStorage.getItem("selectedTheme") || "Default";
      const currentIdx = themes.indexOf(savedTheme);
      const nextIdx = (currentIdx + 1) % themes.length;
      const nextTheme = themes[nextIdx];

      invoke("set_theme", { name: nextTheme }).then((theme) => {
        if (theme) {
          applyThemeColors(theme);
          localStorage.setItem("selectedTheme", nextTheme);

          const themeSelect = document.getElementById("theme-select");
          if (themeSelect) themeSelect.value = nextTheme;

          let chatViewport = document.getElementById("chat-viewport");
          let viewport = document.getElementById("chat-workspace");
          let div = document.createElement("div");
          div.className = "message system";
          div.innerHTML = `
                    <div class="message-card">
                        System: Theme cycled to ${nextTheme}
                    </div>
                `;
          chatViewport.appendChild(div);
          viewport.scrollTop = viewport.scrollHeight;
        }
      });
    })
    .catch((err) => console.error("Error cycling theme:", err));
}

window.addEventListener("gamepadconnected", (e) => {
  state.previousGamepadState.buttons = Array(e.gamepad.buttons.length).fill(
    false,
  );
});

requestAnimationFrame(pollGamepads);

// let currentSessionId = ""; (Moved to state.js)
// let activePersona = "Default"; (Moved to state.js)
// let availablePersonas = []; (Moved to state.js)
// let isMuted = localStorage.getItem("state.isMuted") === "true"; (Moved to state.js)
// let currentAIMessage = null; (Moved to state.js)
// let currentAIText = ""; (Moved to state.js)

// let isProcessRunning = false; (Moved to state.js)
// let activeTerminalBody = null; (Moved to state.js)
// let activeExecuteBtn = null; (Moved to state.js)
// let pendingLuaScript = ""; (Moved to state.js)

// Analytics & Speed Indicators
// let streamStartTime = 0; (Moved to state.js)
// let firstChunkTime = 0; (Moved to state.js)
// let totalTokens = 0; (Moved to state.js)

// Sidebar & Drawer Collapsing Event Listeners
applyNeurodeckIconography();

const sidebar = document.getElementById("sidebar");
const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
const sidebarCloseBtn = document.getElementById("sidebar-close-btn");

sidebarToggleBtn.onclick = function () {
  sidebar.classList.toggle("collapsed");
};

sidebarCloseBtn.onclick = function () {
  sidebar.classList.add("collapsed");
};

const inspectDrawer = document.getElementById("inspect-drawer");
const toggleDrawerBtn = document.getElementById("toggle-drawer-btn");
const inspectCloseBtn = document.getElementById("inspect-close-btn");

function updateContextDrawer() {
  invoke("get_context_stats")
    .then((stats) => {
      // get_context_stats returns { chat, memory, agent, system }
      const sys  = stats.system  || {};
      const chat = stats.chat    || {};
      const mem  = stats.memory  || {};
      const agt  = stats.agent   || {};

      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el && val != null) el.innerText = val;
      };

      set("drawer-active-provider", (sys.provider || "--").toUpperCase());
      set("drawer-active-model",    sys.model     || "--");
      set("drawer-ram-val",         sys.ram_mb != null ? sys.ram_mb + " MB" : "--");
      set("drawer-memory-records",  mem.facts     ?? 0);
      set("drawer-memory-pinned",   mem.pinned    ?? 0);
      set("drawer-session-id",      chat.session_id ? chat.session_id.slice(0, 8) + "…" : "--");
      set("drawer-session-created", chat.created_at || "--");
      set("drawer-session-messages",chat.messages   ?? 0);
      set("drawer-active-persona",  chat.persona    || "Default");

      // Agent status indicator
      const agentStatusEl = document.getElementById("drawer-agent-status");
      if (agentStatusEl) {
        agentStatusEl.innerText = agt.running ? `Running (${agt.tasks ?? 0} tasks)` : "Idle";
        agentStatusEl.style.color = agt.running ? "var(--accent-color)" : "";
      }
    })
    .catch((err) => console.error("Error updating context drawer stats:", err));
}

toggleDrawerBtn.onclick = function () {
  inspectDrawer.classList.toggle("collapsed");
  if (!inspectDrawer.classList.contains("collapsed")) {
    updateContextDrawer();
  }
};

inspectCloseBtn.onclick = function () {
  inspectDrawer.classList.add("collapsed");
};
// Expose main.js functions to global scope for submodules
window.hideRadialMenu = hideRadialMenu;
window.showRadialMenu = showRadialMenu;
window.updateRadialDisplay = updateRadialDisplay;
window.activateRadialSegment = activateRadialSegment;
window.updateContextDrawer = updateContextDrawer;
window.updateGameBadge = updateGameBadge;
window.cycleTheme = cycleTheme;

/* --- SEPARATOR --- */

// --- GAME CONTEXT BADGE ---
function updateGameBadge(ctx) {
  const badge = document.getElementById("game-badge");
  const nameEl = document.getElementById("game-badge-name");
  const dotEl = document.getElementById("game-badge-dot");
  if (!badge || !nameEl) return;

  const name = ctx.name || "";
  const running = ctx.is_running === "true" || ctx.is_running === true;

  if (!name) {
    badge.classList.add("hidden");
    return;
  }

  nameEl.textContent = name;
  badge.title = running
    ? `🎮 ${name} — currently running`
    : `🎮 ${name} — recently played`;

  dotEl.classList.toggle("game-badge-dot--running", running);
  badge.classList.remove("hidden");
}

// Poll for game context every 15 seconds (detect launches/exits while app is open)
setInterval(() => {
  invoke("get_game_context")
    .then(updateGameBadge)
    .catch(() => {});
}, 15000);

// Initial state initialization
function _initUpdateStatusBadges(initialState) {
  const modelNameEl = document.getElementById("model-name");
  if (modelNameEl) modelNameEl.innerText = `[ MODEL: ${initialState.model.toUpperCase()} ]`;
  const dbStatusEl = document.getElementById("vector-db-status");
  if (dbStatusEl) dbStatusEl.innerText = initialState.memory_status;
  const memoryStatusEl = document.getElementById("memory-status");
  if (memoryStatusEl) memoryStatusEl.innerText = initialState.memory_status;
  const toolStatusEl = document.getElementById("tool-status");
  if (toolStatusEl) {
    toolStatusEl.innerText = initialState.tool_status;
    if (initialState.boot_health_status && initialState.boot_health_status !== "healthy") {
      toolStatusEl.innerText = "Recovered Boot";
    }
  }
  const sessionIdEl = document.getElementById("session-id");
  if (sessionIdEl) sessionIdEl.innerText = initialState.session_id;
}

function _initSetupStateAndListeners(initialState) {
  state.currentSessionId = initialState.session_id;
  state.activePersona = initialState.active_persona || "Default";
  state.activeProvider = initialState.provider || "gemini";
  state.activeAgentId = initialState.active_agent_id || "";
  invoke("list_agents").then((agents) => { state.agents = agents; renderAgentSwitcher(); }).catch(() => {});
  listen("agent_changed", (event) => {
    const agent = event.payload;
    state.activeAgentId = agent.id;
    state.activeProvider = agent.provider;
    const el = document.getElementById("model-name");
    if (el) el.innerText = `[ ${agent.name.toUpperCase()} ]`;
    renderAgentSwitcher();
  });
  updateContextDrawer();
  updateGameBadge({ name: initialState.game_name || "", app_id: initialState.game_app_id || "", is_running: initialState.game_running || "false" });
  invoke("get_personas").then((personas) => { state.availablePersonas = personas; }).catch((err) => { console.error("Error loading personas:", err); });
}

async function _initRunDiskMigration() {
  if (localStorage.getItem("neurodeck_disk_migrated_v1")) return;
  const migrateProfiles = async (lsKey, profileKey) => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw && raw !== "[]") await invoke("save_profiles", { key: profileKey, data: raw });
    } catch (_) {}
  };
  const migrateThemes = async () => {
    try {
      const raw = localStorage.getItem("neurodeck_custom_themes");
      if (raw && raw !== "[]") await invoke("save_custom_themes", { data: raw });
    } catch (_) {}
  };
  await Promise.all([migrateProfiles("sshProfiles", "ssh"), migrateProfiles("ftpProfiles", "ftp"), migrateProfiles("sftpProfiles", "sftp"), migrateThemes()]);
  localStorage.setItem("neurodeck_disk_migrated_v1", "true");
}

function _initRunOriginMigration() {
  if (localStorage.getItem("neurodeck_origin_migrated_v2")) return;
  if (!localStorage.getItem("selectedTheme")) localStorage.setItem("selectedTheme", "BLACKSITE");
  if (!localStorage.getItem("neurodeckTheme")) localStorage.setItem("neurodeckTheme", "BLACKSITE");
  localStorage.setItem("neurodeck_origin_migrated_v2", "true");
  if (typeof addNotification === "function") addNotification("Updated", "App origin changed — UI preferences reset to defaults.", "info");
}

function _initBootHealthNotification(initialState) {
  if (!initialState.boot_health_status || initialState.boot_health_status === "healthy" || typeof addNotification !== "function") return;
  const level = initialState.boot_health_warning_count && Number(initialState.boot_health_warning_count) > 0 ? "warning" : "info";
  addNotification("Boot Recovery", initialState.boot_health_summary || "Startup self-heal applied recovery actions.", level);
}

async function _applyInitialState(initialState) {
  _initUpdateStatusBadges(initialState);
  _initSetupStateAndListeners(initialState);
  await _initRunDiskMigration();
  _initRunOriginMigration();
  const savedTheme = localStorage.getItem("selectedTheme");
  if (savedTheme) invoke("set_theme", { name: savedTheme }).then((theme) => { if (theme) applyThemeColors(theme); });
  initChat(); initSettings(); initTerminal(); initCanvas(); initNotificationCenter();
  initSessionBrowser(); initShortcutsOverlay(); initShortcutCustomization(); initOsThemeSync();
  const initialActiveTab = document.querySelector(".nav-tab.active");
  if (initialActiveTab) updateTabGlide(initialActiveTab);
  _initBootHealthNotification(initialState);
  initCommandPalette(); initQuickSwitcher(); initGameContextPanel();
  initTunnelClient(); initFileShare(); initBrowser();
  initAgentView(); initMemoryView(); initRadialMenu(); initManualModal();
  checkOnboarding();
}

invoke("get_initial_state")
  .then(_applyInitialState)
  .catch((err) => {
    console.error("Error getting initial state:", err);
  });

// ==========================================================================
// TABS NAVIGATION, TERMINAL, CANVAS, & STEAMOS TUNNEL IMPLEMENTATIONS
// ==========================================================================

// Tab Switching System
const navTabs = document.querySelectorAll(".nav-tab");
const viewContents = document.querySelectorAll(".view-content");
const navTabRow = document.querySelector(".nav-tab-row");

function ensureTabVisible(tab) {
  if (!tab || !navTabRow) return;
  const rowRect = navTabRow.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  const currentLeft = navTabRow.scrollLeft;
  const targetLeft =
    currentLeft +
    (tabRect.left - rowRect.left) -
    (rowRect.width - tabRect.width) / 2;
  navTabRow.scrollTo({
    left: Math.max(0, targetLeft),
    behavior: "smooth",
  });
}

// View state persistence store
const viewStateStore = new Map();

function saveViewState(viewId) {
  const view = document.getElementById(viewId);
  if (!view) return;
  const scrollEls = view.querySelectorAll("[id]");
  const scrollMap = {};
  const inputMap = {};
  scrollEls.forEach((el) => {
    if (el.scrollTop > 0) scrollMap[el.id] = el.scrollTop;
    if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.value) {
      inputMap[el.id] = el.value;
    }
  });
  viewStateStore.set(viewId, { scroll: scrollMap, input: inputMap });
}

function restoreViewState(viewId) {
  const state = viewStateStore.get(viewId);
  if (!state) return;
  const view = document.getElementById(viewId);
  if (!view) return;
  Object.entries(state.scroll || {}).forEach(([id, top]) => {
    const el = document.getElementById(id);
    if (el) el.scrollTop = top;
  });
  Object.entries(state.input || {}).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
}

// Track current view for transition direction
let currentViewId = "view-chat";

function _navAnimateTransition(outgoing, incoming, direction, currentViewId) {
  if (outgoing) {
    outgoing.classList.remove("active");
    outgoing.classList.add(`view-exit-${direction}`);
    setTimeout(() => outgoing.classList.remove(`view-exit-${direction}`), 300);
    if (currentViewId === "view-ide" && typeof window._deactivateIdeView === "function") window._deactivateIdeView();
  }
  if (incoming) {
    const enterDir = direction === "right" ? "left" : "right";
    incoming.classList.remove("view-enter-left", "view-enter-right");
    incoming.classList.add(`view-enter-${enterDir}`);
    void incoming.offsetWidth;
    incoming.classList.add("active");
    incoming.classList.remove(`view-enter-${enterDir}`);
  }
}

function _navActivateSideEffects(targetViewName) {
  if (targetViewName === "terminal" && window.ptyTerminalFitAddon) {
    setTimeout(() => { try { window.ptyTerminalFitAddon.fit(); } catch (e) { console.error("Error fitting terminal:", e); } }, 50);
  }
  if (targetViewName === "ssh") {
    if (!window.sshTerminal) initSshTerminal();
    setTimeout(() => { try { window.sshTerminalFitAddon?.fit(); } catch (e) {} }, 50);
  }
  if (targetViewName === "share") {
    Promise.all([initSshProfilesFromDisk(), initFtpProfilesFromDisk(), initSftpProfilesFromDisk()])
      .then(() => { renderSshProfilesSettings(); renderFtpProfiles(); renderSftpProfiles(); });
  }
  if (targetViewName === "git" && typeof initGitView === "function") initGitView();
  if (targetViewName === "api-lab" && typeof initApiLabView === "function") initApiLabView();
  if (targetViewName === "cli-maker" && typeof initCliMakerView === "function") initCliMakerView();
  if (targetViewName === "graph" && typeof initGraphView === "function") initGraphView();
  if (targetViewName === "scheduler" && typeof initSchedulerView === "function") initSchedulerView();
  if (targetViewName === "workflow") {
    import("./workflow_view.js").then((m) => {
      if (typeof m.initWorkflowView === "function") m.initWorkflowView();
    }).catch(e => console.error("Failed to load workflow view", e));
  }
  if (targetViewName === "ide") {
    import("./ide_view.js").then((m) => {
      window._deactivateIdeView = m.deactivateIdeView;
      if (typeof m.initIdeView === "function") m.initIdeView();
    }).catch(e => console.error("Failed to load ide view", e));
  }
  if (targetViewName === "orchestrator") {
    import("./orchestrator.js").then((m) => {
      if (typeof m.initOrchestrator === "function") m.initOrchestrator();
    }).catch(e => console.error("Failed to load orchestrator", e));
  }
  if (targetViewName === "share") {
    import("./torrent.js").then((m) => {
      if (typeof m.initTorrentClient === "function") m.initTorrentClient();
    }).catch(e => console.error("Failed to load torrent client", e));
  }
}

function syncNavA11yState(activeTab, navTabs) {
  navTabs.forEach((tab) => {
    const isActive = tab === activeTab || tab.classList.contains("active");
    const viewId = `view-${tab.getAttribute("data-view")}`;
    const view = document.getElementById(viewId);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    tab.tabIndex = isActive ? 0 : -1;
    if (view) {
      view.toggleAttribute("hidden", !isActive);
      view.toggleAttribute("inert", !isActive);
      view.removeAttribute("aria-hidden");
    }
  });
}

function _navTabClick(tab, navTabs) {
  const targetViewName = tab.getAttribute("data-view");
  const targetViewId = `view-${targetViewName}`;
  if (targetViewId === currentViewId) return;

  const tabsArray = Array.from(navTabs);
  const currentIdx = tabsArray.findIndex((t) => t.getAttribute("data-view") === currentViewId.replace("view-", ""));
  const targetIdx = tabsArray.indexOf(tab);
  const direction = targetIdx > currentIdx ? "right" : "left";

  navTabs.forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  syncNavA11yState(tab, navTabs);
  updateTabGlide(tab);
  ensureTabVisible(tab);
  saveViewState(currentViewId);

  const outgoing = document.getElementById(currentViewId);
  const incoming = document.getElementById(targetViewId);
  _navAnimateTransition(outgoing, incoming, direction, currentViewId);
  currentViewId = targetViewId;
  recordViewSwitch(targetViewId);

  requestAnimationFrame(() => restoreViewState(targetViewId));
  updateBreadcrumb(targetViewName);
  updateContextualSidebar(targetViewName);
  showContextualTip(targetViewName);
  _navActivateSideEffects(targetViewName);
}

navTabs.forEach((tab) => {
  tab.onclick = function () { _navTabClick(tab, navTabs); };
  tab.addEventListener("keydown", (event) => {
    const tabsArray = Array.from(navTabs);
    const currentIndex = tabsArray.indexOf(tab);
    const nextIndex =
      event.key === "ArrowRight" ? (currentIndex + 1) % tabsArray.length :
      event.key === "ArrowLeft" ? (currentIndex - 1 + tabsArray.length) % tabsArray.length :
      -1;
    if (nextIndex >= 0) {
      event.preventDefault();
      tabsArray[nextIndex].focus();
    }
  });
});
syncNavA11yState(document.querySelector(".nav-tab.active") || navTabs[0], navTabs);
/* ------------------------------------------------------------------
   Contextual Tips — shown once per view on first visit
   ------------------------------------------------------------------ */
const CONTEXTUAL_TIPS = {
  canvas: "Press the <strong>Collab</strong> button to host a live LAN coding session.",
  agent: "The <strong>Agent</strong> can read your canvas output and iterate on it automatically.",
  memory: "Chat messages are auto-saved to <strong>RAG memory</strong> for future context.",
  docs: "<strong>Index a folder</strong> to make your documents semantically searchable.",
  terminal: "Press <strong>Ctrl+Space</strong> for AI ghost-text autocomplete in the terminal.",
  browser: "Add <strong>speed-dial bookmarks</strong> for your most-used sites.",
  ssh: "<strong>Save connection profiles</strong> for one-click reconnects.",
  "prompt-lab": "Try <strong>JPE Explain mode</strong> to understand any prompt formula.",
  share: "Enable the <strong>Warpinator gRPC server</strong> to receive files from Linux peers.",
  tunnel: "Use the tunnel to <strong>bridge Desktop Mode and Game Mode</strong> on SteamOS.",
  remote: "<strong>Scan the QR code</strong> with your iPhone to send commands remotely.",
  git: "<strong>Stage files</strong> and press ✨ to generate a commit message with AI.",
  "api-lab": "Describe an API in natural language and let <strong>AI generate the request</strong>.",
  "cli-maker": "Create custom commands that appear in the <strong>palette and radial menu</strong>.",
};

let activeTipTimer = null;
let activeTipInterval = null;

function dismissContextualTip() {
  const tip = document.getElementById("contextual-tip");
  if (!tip) return;
  tip.classList.remove("active");
  clearTimeout(activeTipTimer);
  clearInterval(activeTipInterval);
  activeTipTimer = null;
  activeTipInterval = null;
  setTimeout(() => tip.remove(), 400);
}

function parseTipText(text) {
  const frag = document.createDocumentFragment();
  const parts = text.split(/(<\/?strong>)/g);
  let inStrong = false;
  for (const part of parts) {
    if (part === "<strong>") {
      inStrong = true;
    } else if (part === "</strong>") {
      inStrong = false;
    } else if (part) {
      if (inStrong) {
        const strong = document.createElement("strong");
        strong.textContent = part;
        frag.appendChild(strong);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    }
  }
  return frag;
}

function _buildContextualTipDOM(tipText) {
  const tip = document.createElement("div");
  tip.id = "contextual-tip";
  tip.className = "contextual-tip";

  const iconWrap = document.createElement("div");
  iconWrap.className = "contextual-tip-icon";
  iconWrap.innerHTML = createIcon("info", { size: 16 });
  tip.appendChild(iconWrap);

  const textWrap = document.createElement("div");
  textWrap.className = "contextual-tip-text";
  textWrap.appendChild(parseTipText(tipText));
  tip.appendChild(textWrap);

  const closeBtn = document.createElement("button");
  closeBtn.className = "contextual-tip-close";
  closeBtn.setAttribute("aria-label", "Dismiss tip");
  closeBtn.innerHTML = createIcon("x", { size: 12 });
  tip.appendChild(closeBtn);

  const progress = document.createElement("div");
  progress.className = "contextual-tip-progress";
  progress.style.width = "100%";
  tip.appendChild(progress);

  return { tip, closeBtn, progress };
}

function _startContextualTipTimers(progress) {
  let remaining = 8000;
  const step = 100;
  activeTipInterval = setInterval(() => {
    remaining -= step;
    if (progress) progress.style.width = `${(remaining / 8000) * 100}%`;
    if (remaining <= 0) clearInterval(activeTipInterval);
  }, step);

  activeTipTimer = setTimeout(() => {
    dismissContextualTip();
  }, 8000);
}

function _wireContextualTipEvents(tip, closeBtn, storageKey) {
  closeBtn.addEventListener("click", () => {
    localStorage.setItem(storageKey, "true");
    dismissContextualTip();
  });

  tip.addEventListener("click", (e) => {
    if (e.target.closest(".contextual-tip-close")) return;
    localStorage.setItem(storageKey, "true");
    dismissContextualTip();
  });
}

function showContextualTip(viewName) {
  const tipText = CONTEXTUAL_TIPS[viewName];
  if (!tipText) return;

  const storageKey = `neurodeck_tip_dismissed_${viewName}`;
  if (localStorage.getItem(storageKey) === "true") return;

  dismissContextualTip();

  const { tip, closeBtn, progress } = _buildContextualTipDOM(tipText);
  document.body.appendChild(tip);

  requestAnimationFrame(() => tip.classList.add("active"));
  _startContextualTipTimers(progress);
  _wireContextualTipEvents(tip, closeBtn, storageKey);
}

// Global dismiss handlers for Escape and gamepad B
document.addEventListener("keydown", (e) => {
  const tip = document.getElementById("contextual-tip");
  if (!tip || !tip.classList.contains("active")) return;
  if (e.key === "Escape" || e.key === "b" || e.key === "B") {
    const viewName = currentViewId.replace("view-", "");
    localStorage.setItem(`neurodeck_tip_dismissed_${viewName}`, "true");
    dismissContextualTip();
  }
});

function updateBreadcrumb(viewName) {
  const el = document.getElementById("breadcrumb-view");
  if (!el) return;
  const labels = {
    chat: "Chat",
    canvas: "Canvas",
    terminal: "Terminal",
    ssh: "SSH",
    tunnel: "Tunnel",
    share: "Share",
    browser: "Browser",
    agent: "Agent",
    memory: "Memory",
    "prompt-lab": "Prompt Lab",
    remote: "Remote",
    docs: "Docs",
    git: "Git",
    "api-lab": "API Lab",
    "cli-maker": "CLI Maker",
  };
  el.textContent = labels[viewName] || viewName;
  el.style.opacity = "0";
  requestAnimationFrame(() => {
    el.style.transition = "opacity 150ms ease";
    el.style.opacity = "1";
  });
}

function updateContextualSidebar(viewName) {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  // Show/hide contextual sections
  const chatSections = ["new-chat-btn", "sidebar-history"];
  const diagSection = "sidebar-diagnostics";

  // All contextual sections
  const allSections = {
    "sidebar-history": ["chat", "agent", "memory"],
    "sidebar-diagnostics": ["chat", "terminal", "ssh", "tunnel", "share"],
  };

  Object.entries(allSections).forEach(([id, views]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (views.includes(viewName)) {
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  });
}

function updateTabGlide(activeTab) {
  const glide = document.getElementById("nav-tab-glide");
  const bar = document.querySelector(".nav-tab-bar");
  if (!glide || !bar || !activeTab) return;
  glide.style.left = activeTab.offsetLeft + "px";
  glide.style.width = activeTab.offsetWidth + "px";
  glide.classList.add("active");
}

function activateViewByName(targetView) {
  const tab = document.querySelector(`.nav-tab[data-view="${targetView}"]`);
  if (tab) tab.click();
}
window.activateViewByName = activateViewByName;

function openSettingsPanelById(panelId) {
  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn) settingsBtn.click();
  setTimeout(() => {
    document.querySelector(`.stv-nav-item[data-panel="${panelId}"]`)?.click();
  }, 0);
}

function clickFirstAvailableButton(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) {
      el.click();
      return true;
    }
  }
  return false;
}
window.openSettingsPanelById = openSettingsPanelById;
window.clickFirstAvailableButton = clickFirstAvailableButton;

// COMMAND_PALETTE_ACTIONS imported from ./palette-commands.js

const commandPaletteState = {
  open: false,
  query: "",
  activeIndex: 0,
  filtered: [],
};

const PALETTE_HISTORY_KEY = "nd_palette_history_v2";
const PALETTE_HISTORY_MAX = 20;

const GROUP_ORDER = [
  "History",
  "Views",
  "State",
  "Layout",
  "Session",
  "Settings",
  "Context",
  "System",
  "Window",
];

function getPaletteHistory() {
  try {
    const raw = localStorage.getItem(PALETTE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addPaletteHistory(label) {
  const history = getPaletteHistory();
  const filtered = history.filter((h) => h !== label);
  filtered.unshift(label);
  if (filtered.length > PALETTE_HISTORY_MAX) filtered.pop();
  try {
    localStorage.setItem(PALETTE_HISTORY_KEY, JSON.stringify(filtered));
  } catch {}
}

function fuzzyScore(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return { score: 0, matches: [] };
  if (t === q) return { score: 1000, matches: Array.from({ length: t.length }, (_, i) => i) };
  if (t.startsWith(q)) return { score: 500, matches: Array.from({ length: q.length }, (_, i) => i) };

  let score = 0;
  const matches = [];
  let tIdx = 0;
  let qIdx = 0;
  let lastMatchIdx = -1;
  let consecutiveBonus = 0;

  while (tIdx < t.length && qIdx < q.length) {
    if (t[tIdx] === q[qIdx]) {
      matches.push(tIdx);
      score += 10;
      if (lastMatchIdx >= 0 && tIdx === lastMatchIdx + 1) {
        consecutiveBonus += 5;
        score += consecutiveBonus;
      } else {
        consecutiveBonus = 0;
      }
      if (tIdx === 0) {
        score += 20;
      } else if (t[tIdx - 1] === " " || t[tIdx - 1] === "-" || t[tIdx - 1] === ":") {
        score += 10;
      }
      if (lastMatchIdx >= 0) {
        score -= (tIdx - lastMatchIdx - 1) * 3;
      }
      lastMatchIdx = tIdx;
      qIdx++;
    }
    tIdx++;
  }

  if (qIdx < q.length) return { score: -1, matches: [] };
  score -= (t.length - q.length) * 0.5;
  return { score: Math.max(0, Math.round(score)), matches };
}

function getDynamicActions() {
  const actions = [];

  if (state.isMuted) {
    actions.push({
      label: "Unmute Audio",
      group: "State",
      icon: "volume2",
      keywords: ["mute", "audio", "sound", "unmute"],
      run: () => toggleMute(),
    });
  } else {
    actions.push({
      label: "Mute Audio",
      group: "State",
      icon: "volumeX",
      keywords: ["mute", "audio", "sound", "unmute"],
      run: () => toggleMute(),
    });
  }

  const sidebar = document.getElementById("sidebar");
  const sidebarHidden = sidebar?.classList.contains("collapsed");
  if (sidebarHidden) {
    actions.push({
      label: "Show Sidebar",
      group: "Layout",
      icon: "menu",
      keywords: ["sidebar", "show", "layout"],
      run: () => clickFirstAvailableButton("sidebar-toggle-btn"),
    });
  } else {
    actions.push({
      label: "Hide Sidebar",
      group: "Layout",
      icon: "panelLeftClose",
      keywords: ["sidebar", "hide", "layout"],
      run: () => clickFirstAvailableButton("sidebar-close-btn", "sidebar-toggle-btn"),
    });
  }

  return actions;
}

function getCommandPaletteFilteredActions() {
  const query = commandPaletteState.query.trim().toLowerCase();
  const history = getPaletteHistory();
  const dynamic = getDynamicActions();
  const allActions = [...COMMAND_PALETTE_ACTIONS, ...dynamic];

  if (!query) {
    const seen = new Set();
    const result = [];

    for (const label of history) {
      const action = allActions.find((a) => a.label === label);
      if (action && !seen.has(action.label)) {
        const cloned = { ...action, group: "History" };
        cloned._labelMatches = [];
        result.push(cloned);
        seen.add(action.label);
      }
    }

    const rest = allActions
      .filter((a) => !seen.has(a.label))
      .sort((a, b) => {
        const groupA = GROUP_ORDER.indexOf(a.group);
        const groupB = GROUP_ORDER.indexOf(b.group);
        if (groupA !== groupB) return groupA - groupB;
        return a.label.localeCompare(b.label);
      });

    for (const action of rest) {
      const cloned = { ...action };
      cloned._labelMatches = [];
      result.push(cloned);
    }

    return result;
  }

  const scored = allActions.map((action) => {
    const haystack = `${action.label} ${action.group} ${(action.keywords || []).join(" ")}`;
    const labelScore = fuzzyScore(action.label, query);
    const haystackScore = fuzzyScore(haystack, query);
    let score = Math.max(labelScore.score * 2, haystackScore.score);

    if (history.includes(action.label) && score > 0) {
      score += 20;
    }

    const cloned = { ...action };
    cloned._labelMatches = labelScore.score > 0 ? labelScore.matches : [];
    return { action: cloned, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.action);
}

function highlightLabel(label, matches) {
  if (!matches || matches.length === 0) return document.createTextNode(label);
  const fragment = document.createDocumentFragment();
  let lastIdx = 0;
  for (const idx of matches) {
    if (idx > lastIdx) {
      fragment.appendChild(document.createTextNode(label.slice(lastIdx, idx)));
    }
    const mark = document.createElement("mark");
    mark.className = "command-palette-match";
    mark.textContent = label[idx];
    fragment.appendChild(mark);
    lastIdx = idx + 1;
  }
  if (lastIdx < label.length) {
    fragment.appendChild(document.createTextNode(label.slice(lastIdx)));
  }
  return fragment;
}

function _cpBuildActionBtn(action, index) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `command-palette-item${index === commandPaletteState.activeIndex ? " active" : ""}`;
  btn.setAttribute("data-command-index", String(index));
  const main = document.createElement("span");
  main.className = "command-palette-item-main";
  const icon = document.createElement("span");
  icon.className = "command-palette-item-icon";
  icon.innerHTML = createIcon(action.icon, { size: 15 });
  const copy = document.createElement("span");
  copy.className = "command-palette-item-copy";
  const title = document.createElement("span");
  title.className = "command-palette-item-title";
  title.appendChild(highlightLabel(action.label, action._labelMatches || []));
  const subtitle = document.createElement("span");
  subtitle.className = "command-palette-item-subtitle";
  subtitle.textContent = action.group;
  copy.append(title, subtitle);
  main.append(icon.firstElementChild || icon, copy);
  btn.appendChild(main);
  btn.addEventListener("click", () => {
    const selected = commandPaletteState.filtered[index];
    if (!selected) return;
    addPaletteHistory(selected.label);
    closeCommandPalette();
    selected.run();
  });
  return btn;
}

function renderCommandPalette() {
  const list = document.getElementById("command-palette-list");
  const input = document.getElementById("command-palette-input");
  if (!list || !input) return;
  commandPaletteState.filtered = getCommandPaletteFilteredActions();
  if (commandPaletteState.activeIndex >= commandPaletteState.filtered.length) {
    commandPaletteState.activeIndex = Math.max(0, commandPaletteState.filtered.length - 1);
  }
  if (!commandPaletteState.filtered.length) {
    const empty = document.createElement("div");
    empty.className = "command-palette-empty";
    empty.textContent = `No commands match "${input.value}".`;
    list.replaceChildren(empty); return;
  }
  list.replaceChildren();
  let lastGroup = null;
  commandPaletteState.filtered.forEach((action, index) => {
    if (action.group !== lastGroup) {
      const header = document.createElement("div");
      header.className = "command-palette-group-header";
      header.textContent = action.group;
      header.setAttribute("role", "separator");
      header.setAttribute("aria-label", `${action.group} commands`);
      list.appendChild(header);
      lastGroup = action.group;
    }
    list.appendChild(_cpBuildActionBtn(action, index));
  });
}

let commandPaletteFocusTrap = null;

function openCommandPalette(initialQuery = "") {
  const overlay = document.getElementById("command-palette-overlay");
  const input = document.getElementById("command-palette-input");
  if (!overlay || !input) return;
  commandPaletteState.open = true;
  commandPaletteState.query = initialQuery;
  commandPaletteState.activeIndex = 0;
  overlay.classList.remove("hidden");
  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");
  input.value = initialQuery;
  renderCommandPalette();
  if (!commandPaletteFocusTrap)
    commandPaletteFocusTrap = new FocusTrap(overlay);
  commandPaletteFocusTrap.activate();
  setTimeout(() => {
    try {
      input.focus({ preventScroll: true });
      input.select();
    } catch (_) {
      input.focus();
    }
  }, 0);
}

function closeCommandPalette() {
  const overlay = document.getElementById("command-palette-overlay");
  const input = document.getElementById("command-palette-input");
  if (!overlay) return;
  commandPaletteState.open = false;
  overlay.classList.remove("active");
  overlay.setAttribute("aria-hidden", "true");
  overlay.classList.add("hidden");
  commandPaletteState.query = "";
  commandPaletteState.activeIndex = 0;
  commandPaletteState.filtered = [];
  if (input) input.value = "";
  if (commandPaletteFocusTrap) commandPaletteFocusTrap.deactivate();
}

function moveCommandPaletteSelection(delta) {
  if (!commandPaletteState.filtered.length) return;
  const next =
    (commandPaletteState.activeIndex +
      delta +
      commandPaletteState.filtered.length) %
    commandPaletteState.filtered.length;
  commandPaletteState.activeIndex = next;
  renderCommandPalette();
  const list = document.getElementById("command-palette-list");
  const item = list?.querySelector(
    `.command-palette-item[data-command-index="${next}"]`,
  );
  if (item) {
    item.scrollIntoView({ block: "nearest" });
  }
}

function runCommandPaletteActiveAction() {
  const action = commandPaletteState.filtered[commandPaletteState.activeIndex];
  if (!action) return;
  addPaletteHistory(action.label);
  closeCommandPalette();
  action.run();
}

function _cpWireInputEl(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    commandPaletteState.query = input.value;
    commandPaletteState.activeIndex = 0;
    renderCommandPalette();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); moveCommandPaletteSelection(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); moveCommandPaletteSelection(-1); }
    else if (event.key === "Enter") { event.preventDefault(); runCommandPaletteActiveAction(); }
    else if (event.key === "Escape") { event.preventDefault(); closeCommandPalette(); }
  });
}

function _cpWireGlobalKeydown() {
  document.addEventListener("keydown", (event) => {
    const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
    if (isShortcut) {
      event.preventDefault();
      if (commandPaletteState.open) { closeCommandPalette(); }
      else { if (quickSwitcherState.open) closeQuickSwitcher(); openCommandPalette(); }
      return;
    }
    if (!commandPaletteState.open) return;
    if (event.key === "Escape") { event.preventDefault(); closeCommandPalette(); }
  }, true);
}

function initCommandPalette() {
  const overlay = document.getElementById("command-palette-overlay");
  const openBtn = document.getElementById("command-palette-btn");
  const closeBtn = document.getElementById("command-palette-close");
  const input = document.getElementById("command-palette-input");
  if (openBtn) openBtn.onclick = () => openCommandPalette();
  if (closeBtn) closeBtn.onclick = closeCommandPalette;
  if (overlay) overlay.addEventListener("click", (e) => { if (e.target === overlay) closeCommandPalette(); });
  _cpWireInputEl(input);
  _cpWireGlobalKeydown();
}


/* ── Quick Switcher ─────────────────────────────────────────────────────── */

const MAX_RECENT_VIEWS = 8;

const VIEW_ICON_MAP = {
  "view-chat": "messageSquare",
  "view-canvas": "sparkles",
  "view-terminal": "squareTerminal",
  "view-ssh": "server",
  "view-tunnel": "route",
  "view-share": "share2",
  "view-browser": "globe",
  "view-agent": "bot",
  "view-memory": "brain",
  "view-prompt-lab": "sparkles",
  "view-remote": "panelRightOpen",
  "view-docs": "fileText",
  "view-git": "gitBranch",
  "view-api-lab": "send",
  "view-cli-maker": "zap",
  "view-graph": "share2",
  "view-scheduler": "clock",
  "view-workflow": "workflow",
  "view-ide": "code2",
};

const VIEW_NAME_MAP = {
  "view-chat": "Chat",
  "view-canvas": "Canvas",
  "view-terminal": "Terminal",
  "view-ssh": "SSH",
  "view-tunnel": "Tunnel",
  "view-share": "Share",
  "view-browser": "Browser",
  "view-agent": "Agent",
  "view-memory": "Memory",
  "view-prompt-lab": "Prompt Lab",
  "view-remote": "Remote",
  "view-docs": "Docs",
  "view-git": "Git",
  "view-api-lab": "API Lab",
  "view-cli-maker": "CLI Maker",
  "view-graph": "Knowledge Graph",
  "view-scheduler": "Task Scheduler",
  "view-workflow": "Workflow Builder",
  "view-ide": "Mini IDE",
};

const quickSwitcherState = {
  open: false,
  activeIndex: 0,
  recentViews: [],
};

function recordViewSwitch(viewId) {
  quickSwitcherState.recentViews = quickSwitcherState.recentViews.filter((v) => v !== viewId);
  quickSwitcherState.recentViews.unshift(viewId);
  if (quickSwitcherState.recentViews.length > MAX_RECENT_VIEWS * 2) {
    quickSwitcherState.recentViews = quickSwitcherState.recentViews.slice(0, MAX_RECENT_VIEWS * 2);
  }
}

function getRecentViewActions() {
  const current = currentViewId;
  return quickSwitcherState.recentViews
    .filter((v) => v !== current)
    .slice(0, MAX_RECENT_VIEWS)
    .map((viewId) => ({
      viewId,
      label: VIEW_NAME_MAP[viewId] || viewId.replace("view-", ""),
      icon: VIEW_ICON_MAP[viewId] || "globe",
    }));
}

function renderQuickSwitcher() {
  const list = document.getElementById("quick-switcher-list");
  if (!list) return;

  const actions = getRecentViewActions();
  if (!actions.length) {
    list.innerHTML = `<div class="quick-switcher-empty">No recent views</div>`;
    return;
  }

  list.replaceChildren();
  actions.forEach((action, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `quick-switcher-item${index === quickSwitcherState.activeIndex ? " active" : ""}`;
    btn.setAttribute("data-switcher-index", String(index));
    btn.setAttribute("aria-label", `Switch to ${action.label}`);

    const iconSpan = document.createElement("span");
    iconSpan.className = "quick-switcher-item-icon";
    iconSpan.innerHTML = createIcon(action.icon, { size: 20 });

    const label = document.createElement("span");
    label.className = "quick-switcher-item-label";
    label.textContent = action.label;

    btn.appendChild(iconSpan.firstElementChild || iconSpan);
    btn.appendChild(label);

    btn.addEventListener("click", () => {
      quickSwitcherState.activeIndex = index;
      runQuickSwitcherActiveAction();
    });

    list.appendChild(btn);
  });

  // Focus the active item for keyboard accessibility
  const activeBtn = list.querySelector(".quick-switcher-item.active");
  if (activeBtn && quickSwitcherState.open) {
    setTimeout(() => activeBtn.focus({ preventScroll: true }), 0);
  }
}

function openQuickSwitcher() {
  const overlay = document.getElementById("quick-switcher-overlay");
  if (!overlay) return;
  quickSwitcherState.open = true;
  quickSwitcherState.activeIndex = 0;
  overlay.classList.remove("hidden");
  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");
  renderQuickSwitcher();
  // Click outside to close
  overlay.onclick = (e) => {
    if (e.target === overlay) closeQuickSwitcher();
  };
}

function closeQuickSwitcher() {
  const overlay = document.getElementById("quick-switcher-overlay");
  if (!overlay) return;
  quickSwitcherState.open = false;
  overlay.classList.remove("active");
  overlay.setAttribute("aria-hidden", "true");
  overlay.classList.add("hidden");
}

function cycleQuickSwitcher(delta) {
  const actions = getRecentViewActions();
  if (!actions.length) return;
  quickSwitcherState.activeIndex = (quickSwitcherState.activeIndex + delta + actions.length) % actions.length;
  renderQuickSwitcher();
}

function runQuickSwitcherActiveAction() {
  const actions = getRecentViewActions();
  const action = actions[quickSwitcherState.activeIndex];
  if (!action) return;
  closeQuickSwitcher();
  activateViewByName(action.viewId.replace("view-", ""));
}

function initQuickSwitcher() {
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.ctrlKey && event.key === "Tab") {
        event.preventDefault();
        if (quickSwitcherState.open) {
          cycleQuickSwitcher(event.shiftKey ? -1 : 1);
        } else if (!commandPaletteState.open) {
          openQuickSwitcher();
        }
        return;
      }

      if (!quickSwitcherState.open) return;

      if (event.key === "Enter") {
        event.preventDefault();
        runQuickSwitcherActiveAction();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeQuickSwitcher();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        cycleQuickSwitcher(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        cycleQuickSwitcher(-1);
      }
    },
    true,
  );
}

/* --- SEPARATOR --- */

// --- STEAMOS TUNNEL SYSTEM ---
// let tunnelStatus = "offline"; (Moved to state.js)

function logTunnel(direction, text) {
  const logContainer = document.getElementById("tunnel-log");
  if (!logContainer) return;

  const entry = document.createElement("div");
  entry.className = `log-entry ${direction}`;
  entry.innerText = `${new Date().toLocaleTimeString()} [${direction.toUpperCase()}] ${text}`;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function checkTunnelServerStatus(silent = false) {
  const indicator = document.getElementById("tunnel-status-indicator");
  const req = JSON.stringify({ type: "run_cmd", command: "whoami" });

  invoke("send_tunnel_request", { request: req })
    .then((resStr) => {
      try {
        const resp = JSON.parse(resStr);
        if (resp.type === "success") {
          const oldStatus = state.tunnelStatus;
          state.tunnelStatus = "online";
          if (indicator) {
            indicator.innerText = "ONLINE";
            indicator.className = "tunnel-status-indicator online";
          }
          if (!silent || oldStatus !== "online") {
            logTunnel(
              "system",
              `Tunnel server is alive. Running as: ${resp.output.trim()}`,
            );
          }
        } else {
          const oldStatus = state.tunnelStatus;
          state.tunnelStatus = "offline";
          if (indicator) {
            indicator.innerText = "OFFLINE";
            indicator.className = "tunnel-status-indicator offline";
          }
          if (!silent || oldStatus !== "offline") {
            logTunnel("error", `Tunnel server error response: ${resp.message}`);
          }
        }
      } catch (e) {
        const oldStatus = state.tunnelStatus;
        state.tunnelStatus = "offline";
        if (indicator) {
          indicator.innerText = "OFFLINE";
          indicator.className = "tunnel-status-indicator offline";
        }
        if (!silent || oldStatus !== "offline") {
          logTunnel("error", `Invalid response from tunnel: ${resStr}`);
        }
      }
    })
    .catch((err) => {
      const oldStatus = state.tunnelStatus;
      state.tunnelStatus = "offline";
      if (indicator) {
        indicator.innerText = "OFFLINE";
        indicator.className = "tunnel-status-indicator offline";
      }
      if (!silent || oldStatus !== "offline") {
        logTunnel("system", `Tunnel server is not reachable: ${err}`);
      }
    });
}

function sendAndLogTunnelRequest(req, successLabel) {
  invoke("send_tunnel_request", { request: req })
    .then((resStr) => {
      const resp = JSON.parse(resStr);
      if (resp.type === "success") {
        const out = successLabel ? `${successLabel}\n${resp.output}` : resp.output;
        logTunnel("received", out);
      } else {
        logTunnel("error", `Failed:\n${resp.message}`);
      }
    })
    .catch((err) => {
      logTunnel("error", `Request failed: ${err}`);
    });
}

function _tunnelWireToggle(toggleBtn) {
  if (!toggleBtn) return;
  toggleBtn.onclick = function () {
    if (state.tunnelStatus === "offline") {
      logTunnel("system", "Starting local loopback tunnel server...");
      invoke("start_tunnel_server")
        .then((msg) => { logTunnel("received", msg); setTimeout(checkTunnelServerStatus, 500); })
        .catch((err) => logTunnel("error", "Failed to start server: " + err));
    } else {
      logTunnel("system", "Stopping local loopback tunnel server...");
      invoke("stop_tunnel_server")
        .then((msg) => {
          logTunnel("received", msg);
          state.tunnelStatus = "offline";
          const indicator = document.getElementById("tunnel-status-indicator");
          if (indicator) { indicator.innerText = "OFFLINE"; indicator.className = "tunnel-status-indicator offline"; }
        })
        .catch((err) => logTunnel("error", "Failed to stop server: " + err));
    }
  };
}

function initTunnelClient() {
  const checkBtn = document.getElementById("tunnel-check-btn");
  const toggleBtn = document.getElementById("tunnel-toggle-btn");
  const cmdSend = document.getElementById("tunnel-cmd-send");
  const fileSend = document.getElementById("tunnel-file-send");
  const dirSend = document.getElementById("tunnel-dir-send");

  if (checkBtn) { checkBtn.onclick = function () { logTunnel("system", "Checking tunnel server status..."); checkTunnelServerStatus(); }; }
  _tunnelWireToggle(toggleBtn);
  if (cmdSend) {
    cmdSend.onclick = function () {
      const input = document.getElementById("tunnel-cmd-input");
      const command = input.value.trim();
      if (!command) return;
      logTunnel("sent", "Execute command: " + command);
      sendAndLogTunnelRequest(JSON.stringify({ type: "run_cmd", command }), "Stdout:");
      input.value = "";
    };
  }
  if (fileSend) {
    fileSend.onclick = function () {
      const pathInput = document.getElementById("tunnel-filepath-input");
      const contentArea = document.getElementById("tunnel-filecontent-input");
      const path = pathInput.value.trim();
      const content = contentArea.value;
      if (!path) return;
      logTunnel("sent", "Write file: " + path + " (" + content.length + " chars)");
      sendAndLogTunnelRequest(JSON.stringify({ type: "write_file", path, content }));
      pathInput.value = ""; contentArea.value = "";
    };
  }
  if (dirSend) {
    dirSend.onclick = function () {
      const input = document.getElementById("tunnel-dirpath-input");
      const path = input.value.trim();
      if (!path) return;
      logTunnel("sent", "Read dir: " + path);
      sendAndLogTunnelRequest(JSON.stringify({ type: "read_dir", path }), "Contents:");
      input.value = "";
    };
  }
  checkTunnelServerStatus(true);
  setInterval(() => checkTunnelServerStatus(true), 5000);
}

// --- SHARE INNER TAB SWITCHING ---
document.querySelectorAll(".share-inner-tab").forEach((tab) => {
  tab.onclick = function () {
    const panel = this.getAttribute("data-panel");
    document
      .querySelectorAll(".share-inner-tab")
      .forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
    this.classList.add("active");
    this.setAttribute("aria-selected", "true");
    document
      .querySelectorAll(".share-panel-section")
      .forEach((s) => s.classList.remove("active"));
    const el = document.getElementById(`share-panel-${panel}`);
    if (el) el.classList.add("active");
    if (panel === "torrent") {
      import("./torrent.js").then((m) => {
        if (typeof m.initTorrentClient === "function") m.initTorrentClient();
      }).catch(e => console.error("Failed to load torrent client", e));
    }
  };
});

// --- LAN FILE SHARING SYSTEM ---
// let selectedPeerIp = null; (Moved to state.js)
// let pendingTransferId = null; (Moved to state.js)

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function renderPeers(peers) {
  const listEl = document.getElementById("share-peers-list");
  if (!listEl) return;
  listEl.replaceChildren();
  if (!peers || peers.length === 0) {
    const empty = document.createElement("div");
    empty.className = "peer-item-empty";
    empty.textContent = "Scanning local network for active peers...";
    listEl.appendChild(empty);
    state.selectedPeerIp = null;
    updateSendButtonState();
    return;
  }
  peers.forEach((peer) => {
    const item = document.createElement("div");
    item.className = "peer-item";
    if (peer.ip === state.selectedPeerIp) {
      item.classList.add("selected");
    }
    const info = document.createElement("div");
    info.className = "peer-info";
    const name = document.createElement("span");
    name.className = "peer-name";
    name.textContent = String(peer.hostname ?? "");
    const meta = document.createElement("span");
    meta.className = "peer-ip-os";
    meta.textContent = `${String(peer.ip ?? "")} (${String(peer.os ?? "")})`;
    info.append(name, meta);
    const status = document.createElement("span");
    status.className = "peer-status";
    status.textContent = "Online";
    item.append(info, status);
    item.addEventListener("click", function () {
      document
        .querySelectorAll(".peer-item")
        .forEach((el) => el.classList.remove("selected"));
      item.classList.add("selected");
      state.selectedPeerIp = peer.ip;
      updateSendButtonState();
    });
    listEl.appendChild(item);
  });
}

if (!window.transferProgressMap) {
  window.transferProgressMap = new Map();
}

function formatDuration(sec) {
  if (!isFinite(sec) || isNaN(sec) || sec < 0) return "Unknown";
  if (sec < 60) return Math.round(sec) + "s";
  let min = Math.floor(sec / 60);
  let s = Math.round(sec % 60);
  return `${min}m ${s}s`;
}

window.cancelTransfer = function (transferId) {
  invoke("cancel_transfer", { transferId })
    .then(() => {
      invoke("get_active_transfers").then(renderTransfers);
    })
    .catch((err) => {
      console.error("Error cancelling transfer:", err);
      alert("Error: " + err);
    });
};

function calculateTransferSpeedAndEta(t, progress) {
  let speedText = "";
  let etaText = "";
  if (t.status === "Transferring") {
    const now = Date.now();
    let record = window.transferProgressMap.get(t.id);
    if (!record) {
      record = { lastProgress: progress, lastTime: now, currentSpeed: 0 };
      window.transferProgressMap.set(t.id, record);
    } else {
      let elapsed = (now - record.lastTime) / 1000;
      if (elapsed >= 0.5) {
        let delta = progress - record.lastProgress;
        if (delta >= 0) {
          let instantSpeed = delta / elapsed;
          record.currentSpeed = record.currentSpeed
            ? record.currentSpeed * 0.7 + instantSpeed * 0.3
            : instantSpeed;
        }
        record.lastProgress = progress;
        record.lastTime = now;
      }
    }
    if (record.currentSpeed > 0) {
      speedText = ` | ${formatBytes(record.currentSpeed)}/s`;
      let remaining = t.size - progress;
      let eta = remaining / record.currentSpeed;
      etaText = ` | ETA: ${formatDuration(eta)}`;
    } else {
      speedText = ` | 0 B/s`;
      etaText = ` | ETA: Unknown`;
    }
  } else {
    window.transferProgressMap.delete(t.id);
  }
  return { speedText, etaText };
}

function _buildTransferItem(t) {
  const item = document.createElement("div");
  item.className = "transfer-item";
  item.id = "transfer-" + t.id;
  const percent = t.size > 0 ? Math.round((t.progress / t.size) * 100) : 0;
  const progressClass = t.status === "Completed" ? "completed" : (t.status === "Failed" || t.status === "Rejected") ? "failed" : "";
  const { speedText, etaText } = calculateTransferSpeedAndEta(t, t.progress);
  const isCancelable = ["Pending","Accepted","Transferring"].includes(t.status);

  const header = document.createElement("div");
  header.className = "transfer-header";
  const filename = document.createElement("span");
  filename.className = "transfer-filename";
  filename.title = String(t.filename ?? "");
  filename.textContent = String(t.filename ?? "");
  const headerRight = document.createElement("div");
  Object.assign(headerRight.style, { display: "flex", alignItems: "center", gap: "8px" });
  const status = document.createElement("span");
  status.className = "transfer-status " + String(t.status || "").toLowerCase();
  status.textContent = String(t.status ?? "");
  headerRight.appendChild(status);
  if (isCancelable) {
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cancel-transfer-btn";
    cancelBtn.title = "Cancel Transfer";
    cancelBtn.setAttribute("aria-label", "Cancel Transfer");
    cancelBtn.innerHTML = createIcon("x", { size: 12 });
    cancelBtn.addEventListener("click", (e) => { e.stopPropagation(); window.cancelTransfer(t.id); });
    headerRight.appendChild(cancelBtn);
  }
  header.append(filename, headerRight);

  const progressContainer = document.createElement("div");
  progressContainer.className = "transfer-progress-container";
  const progressBg = document.createElement("div");
  progressBg.className = "transfer-progress-bar-bg";
  const progressFill = document.createElement("div");
  progressFill.className = "transfer-progress-bar-fill " + progressClass;
  progressFill.style.width = percent + "%";
  progressBg.appendChild(progressFill);
  const percentEl = document.createElement("span");
  percentEl.className = "transfer-percent";
  percentEl.textContent = percent + "%";
  progressContainer.append(progressBg, percentEl);

  const meta = document.createElement("div");
  meta.className = "transfer-meta";
  const peer = document.createElement("span");
  peer.textContent = (t.direction === "Incoming" ? "From" : "To") + ": " + String(t.peer_name || t.peer_ip || "");
  const stats = document.createElement("span");
  stats.className = "transfer-stats-text";
  stats.textContent = formatBytes(t.progress) + " / " + formatBytes(t.size) + speedText + etaText;
  meta.append(peer, stats);

  item.append(header, progressContainer, meta);
  return item;
}

function renderTransfers(transfers) {
  const listEl = document.getElementById("share-transfers-list");
  if (!listEl) return;
  listEl.replaceChildren();
  if (!transfers || transfers.length === 0) {
    const empty = document.createElement("div");
    empty.className = "transfer-item-empty";
    empty.textContent = "No active or past transfers in this session.";
    listEl.appendChild(empty);
    return;
  }
  if (!window.activeTransfersMap) window.activeTransfersMap = new Map();
  window.activeTransfersMap.clear();
  transfers.sort((a, b) => b.id.localeCompare(a.id));
  transfers.forEach((t) => { window.activeTransfersMap.set(t.id, t); listEl.appendChild(_buildTransferItem(t)); });
}

function updateTransferCardProgress(transferId, progress) {
  if (!window.activeTransfersMap) return;
  const t = window.activeTransfersMap.get(transferId);
  if (!t) {
    invoke("get_active_transfers").then(renderTransfers);
    return;
  }

  t.progress = progress;
  if (t.status === "Pending" || t.status === "Accepted") {
    t.status = "Transferring";
  }

  const item = document.getElementById(`transfer-${transferId}`);
  if (!item) return;

  const statusEl = item.querySelector(".transfer-status");
  if (statusEl) {
    statusEl.className = `transfer-status ${t.status.toLowerCase()}`;
    statusEl.innerText = t.status;
  }

  const percent =
    t.size > 0 ? Math.min(100, Math.round((progress / t.size) * 100)) : 0;

  const barEl = item.querySelector(".transfer-progress-bar-fill");
  if (barEl) {
    barEl.style.width = `${percent}%`;
    if (t.status === "Completed") {
      barEl.className = "transfer-progress-bar-fill completed";
    } else if (t.status === "Failed" || t.status === "Rejected") {
      barEl.className = "transfer-progress-bar-fill failed";
    }
  }

  const pctEl = item.querySelector(".transfer-percent");
  if (pctEl) {
    pctEl.innerText = `${percent}%`;
  }

  const { speedText, etaText } = calculateTransferSpeedAndEta(t, progress);

  const statsEl = item.querySelector(".transfer-stats-text");
  if (statsEl) {
    statsEl.innerText = `${formatBytes(progress)} / ${formatBytes(t.size)}${speedText}${etaText}`;
  }
}

function updateSendButtonState() {
  const sendBtn = document.getElementById("share-send-btn");
  const pathInput = document.getElementById("share-filepath-input");
  if (sendBtn && pathInput) {
    const path = pathInput.value.trim();
    sendBtn.disabled = !(state.selectedPeerIp && path);
  }
}

function _fsWireGroupCode(groupCodeInput, saveGroupCodeBtn) {
  invoke("get_group_code")
    .then((code) => { groupCodeInput.value = code || "DEFAULT"; })
    .catch((err) => console.error("Error fetching group code:", err));
  saveGroupCodeBtn.onclick = function () {
    const code = groupCodeInput.value.trim();
    saveGroupCodeBtn.disabled = true;
    saveGroupCodeBtn.innerText = "Applying...";
    invoke("set_group_code", { code })
      .then(() => {
        saveGroupCodeBtn.disabled = false;
        saveGroupCodeBtn.innerText = "Apply";
        if (typeof addNotification === "function") {
          addNotification("Group Code Updated", `Discovery group set to: ${code}`, "success");
        }
        invoke("get_discovered_peers").then(renderPeers);
      })
      .catch((err) => {
        saveGroupCodeBtn.disabled = false;
        saveGroupCodeBtn.innerText = "Apply";
        console.error("Error setting group code:", err);
        alert("Error: " + err);
      });
  };
}

function _fsHandleTransferResponse(accept, ftCtx) {
  if (state.pendingTransferId) {
    const action = accept ? "accepting" : "rejecting";
    invoke("respond_to_transfer", { transferId: state.pendingTransferId, accept })
      .then(() => {
        const modal = document.getElementById("transfer-modal");
        if (modal) modal.classList.remove("active");
        if (ftCtx.trap) ftCtx.trap.deactivate();
        state.pendingTransferId = null;
        invoke("get_active_transfers").then(renderTransfers);
      })
      .catch((err) => { console.error(`Error ${action} transfer:`, err); alert("Error: " + err); });
  } else {
    const modal = document.getElementById("transfer-modal");
    if (modal) modal.classList.remove("active");
    if (ftCtx.trap) ftCtx.trap.deactivate();
  }
}

function _fsWireModalBtns(acceptBtn, rejectBtn, closeXBtn, ftCtx) {
  if (acceptBtn) acceptBtn.onclick = () => _fsHandleTransferResponse(true, ftCtx);
  if (rejectBtn) rejectBtn.onclick = () => _fsHandleTransferResponse(false, ftCtx);
  if (closeXBtn) closeXBtn.onclick = () => _fsHandleTransferResponse(false, ftCtx);
}

function _fsWireTransferModal(ftCtx) {
  listen("transfer_incoming", (event) => {
    const transfer = event.payload;
    state.pendingTransferId = transfer.id;
    const modal = document.getElementById("transfer-modal");
    const modalPeer = document.getElementById("transfer-modal-peer");
    const modalFilename = document.getElementById("transfer-modal-filename");
    const modalSize = document.getElementById("transfer-modal-size");
    if (modal && modalPeer && modalFilename && modalSize) {
      modalPeer.innerText = `${transfer.peer_name || "Unknown"} (${transfer.peer_ip})`;
      modalFilename.innerText = transfer.filename;
      modalSize.innerText = formatBytes(transfer.size);
      modal.classList.add("active");
      if (!ftCtx.trap) ftCtx.trap = new FocusTrap(modal);
      ftCtx.trap.activate();
    }
    if (typeof addNotification === "function") {
      addNotification("Incoming Transfer Request", `From ${transfer.peer_name || "Unknown"} (${transfer.peer_ip}): ${transfer.filename}`, "info");
    }
    invoke("get_active_transfers").then(renderTransfers);
  });
}

function _fsWireGlobalListeners() {
  listen("transfer_progress", (event) => {
    if (event && event.payload) {
      const [transferId, progress] = event.payload;
      updateTransferCardProgress(transferId, progress);
    } else {
      invoke("get_active_transfers").then(renderTransfers);
    }
  });
  listen("transfer_completed", () => {
    if (typeof addNotification === "function") addNotification("File Transfer Complete", "A LAN file transfer completed successfully.", "success");
    invoke("get_active_transfers").then(renderTransfers);
  });
  listen("transfer_failed", () => {
    if (typeof addNotification === "function") addNotification("File Transfer Failed", "A LAN file transfer has failed.", "error");
    invoke("get_active_transfers").then(renderTransfers);
  });
  listen("agent_thinking", () => { document.getElementById("tool-status").innerText = "Agent thinking..."; });
  listen("agent_step_complete", () => { document.getElementById("tool-status").innerText = "Idle"; });
  listen("agent_step_error", (event) => {
    const err = event.payload?.error || "Agent step failed";
    if (typeof addNotification === "function") addNotification("Agent Error", err, "error");
  });
  listen("plugin_reload_start", () => { if (typeof addNotification === "function") addNotification("Plugins", "Reloading plugin runtime...", "info"); });
  listen("plugin_reload_done", () => { if (typeof addNotification === "function") addNotification("Plugins", "Plugin runtime reloaded.", "success"); });
  listen("plugin_reload_error", (event) => {
    const err = event.payload || "Plugin reload failed";
    if (typeof addNotification === "function") addNotification("Plugins", String(err), "error");
  });
  listen("bmad_install_progress", (event) => {
    const payload = event.payload || {};
    if (payload.stage === "start") { if (typeof addNotification === "function") addNotification("BMAD", `Installing to ${payload.target}...`, "info"); }
    else if (payload.stage === "done") { if (typeof addNotification === "function") addNotification("BMAD", "Installation complete.", "success"); }
    else if (payload.stage === "error") { if (typeof addNotification === "function") addNotification("BMAD", `Install failed: ${payload.reason}`, "error"); }
  });
}

function _fsWireDropzoneSend(dropzone, pathInput, sendBtn) {
  if (dropzone && pathInput) {
    dropzone.addEventListener("dragover", (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add("dragover"); });
    dropzone.addEventListener("dragleave", (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove("dragover"); });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault(); e.stopPropagation(); dropzone.classList.remove("dragover");
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        pathInput.value = file.path || file.name;
        updateSendButtonState();
      }
    });
    pathInput.oninput = function () { updateSendButtonState(); };
  }
  if (sendBtn) {
    sendBtn.onclick = function () {
      if (pathInput) {
        const path = pathInput.value.trim();
        if (state.selectedPeerIp && path) {
          sendBtn.disabled = true;
          sendBtn.innerText = "Initiating... ⏳";
          invoke("start_file_transfer", { peerIp: state.selectedPeerIp, filePath: path })
            .then(() => {
              sendBtn.innerText = "Send File 🚀";
              pathInput.value = "";
              updateSendButtonState();
              invoke("get_active_transfers").then(renderTransfers);
            })
            .catch((err) => {
              sendBtn.innerText = "Send File 🚀";
              updateSendButtonState();
              alert("Error sending file: " + err);
            });
        }
      }
    };
  }
}

function initFileShare() {
  const dropzone = document.getElementById("share-dropzone");
  const pathInput = document.getElementById("share-filepath-input");
  const sendBtn = document.getElementById("share-send-btn");
  const acceptBtn = document.getElementById("transfer-modal-accept");
  const rejectBtn = document.getElementById("transfer-modal-reject");
  const closeXBtn = document.getElementById("transfer-modal-close-x");
  const ftCtx = { trap: null };

  invoke("get_discovered_peers").then(renderPeers).catch((err) => console.error("Error fetching peers:", err));
  invoke("get_active_transfers").then(renderTransfers).catch((err) => console.error("Error fetching transfers:", err));

  const groupCodeInput = document.getElementById("share-group-code-input");
  const saveGroupCodeBtn = document.getElementById("share-group-code-save-btn");
  if (groupCodeInput && saveGroupCodeBtn) _fsWireGroupCode(groupCodeInput, saveGroupCodeBtn);

  listen("peers_updated", (event) => { renderPeers(event.payload); });
  _fsWireTransferModal(ftCtx);
  _fsWireGlobalListeners();
  _fsWireModalBtns(acceptBtn, rejectBtn, closeXBtn, ftCtx);
  _fsWireDropzoneSend(dropzone, pathInput, sendBtn);
}

// --- BUILT-IN WEB BROWSER SYSTEM ---
function _browserParseUrlOrSearch(input) {
  const trimmed = input.trim();
  if (!trimmed) return "neurodeck://home";
  if (/^[a-zA-Z0-9+.-]+:\/\//.test(trimmed)) return trimmed;
  const isDomain =
    /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(trimmed) ||
    /^localhost(:\d+)?(\/.*)?$/.test(trimmed) ||
    /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(trimmed);
  return isDomain ? "https://" + trimmed : "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(trimmed);
}

// Returns the browser viewport area in logical CSS pixels, viewport-relative.
// The native browser window is positioned by Rust using viewport coords + Tauri inner_position().
function _browserGetViewportRect() {
  const view = document.getElementById("view-browser");
  if (!view) return null;
  const toolbar = view.querySelector(".browser-toolbar");
  const toolbarH = toolbar ? toolbar.getBoundingClientRect().height : 52;
  const r = view.getBoundingClientRect();
  return { x: r.left, y: r.top + toolbarH, width: r.width, height: r.height - toolbarH };
}

function _browserRectsEqual(a, b) {
  return a && b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

async function _browserNavigateTo(raw, bCtx, urlInput, homeScreen) {
  const url = _browserParseUrlOrSearch(raw);
  if (url === "neurodeck://home") {
    bCtx.url = "neurodeck://home";
    if (bCtx.open) await invoke("browser_hide").catch(() => {});
    if (homeScreen) homeScreen.classList.remove("hidden");
    if (urlInput) urlInput.value = "";
    return;
  }
  bCtx.url = url;
  if (urlInput) urlInput.value = url;
  const r = _browserGetViewportRect();
  if (!r) return;
  try {
    if (bCtx.open) {
      await invoke("browser_navigate", { url });
    } else {
      await invoke("browser_open", { url, viewportX: r.x, viewportY: r.y, width: r.width, height: r.height });
      bCtx.open = true;
      if (homeScreen) homeScreen.classList.add("hidden");
    }
  } catch (e) {
    console.error("[Browser] Navigation error:", e);
    window.addNotification("Browser Error", String(e), "error");
  }
}

function _browserStartSync(urlInput, bCtx) {
  if (bCtx.syncInt) return;
  bCtx.syncInt = setInterval(async () => {
    if (!bCtx.open) return;
    const r = _browserGetViewportRect();
    if (r && !_browserRectsEqual(r, bCtx.lastRect)) {
      bCtx.lastRect = r;
      await invoke("browser_show", { viewportX: r.x, viewportY: r.y, width: r.width, height: r.height }).catch(() => {});
    }
    try {
      const liveUrl = await invoke("browser_get_url");
      if (liveUrl && liveUrl !== bCtx.url && document.activeElement !== urlInput) {
        bCtx.url = liveUrl;
        if (urlInput) urlInput.value = liveUrl;
      }
      const downloadModelBtn = document.getElementById("browser-download-model-btn");
      if (downloadModelBtn) {
        const match = liveUrl ? liveUrl.match(/huggingface\.co\/([^/]+)\/([^/?#]+)/) : null;
        if (match) {
          const org = match[1];
          const model = match[2];
          if (!["datasets", "spaces", "docs", "blog"].includes(org)) {
            downloadModelBtn.disabled = false;
            downloadModelBtn.dataset.repo = org + "/" + model;
          } else {
            downloadModelBtn.disabled = true;
            delete downloadModelBtn.dataset.repo;
          }
        } else {
          downloadModelBtn.disabled = true;
          delete downloadModelBtn.dataset.repo;
        }
      }
    } catch (_) {}
  }, 250);
}

function _browserStopSync(bCtx) {
  if (bCtx.syncInt) { clearInterval(bCtx.syncInt); bCtx.syncInt = null; }
  bCtx.lastRect = null;
}

function _browserWireTabViz(browserTab, bCtx, urlInput, homeScreen) {
  if (browserTab) {
    browserTab.addEventListener("click", async () => {
      if (bCtx.open && bCtx.url !== "neurodeck://home") {
        const r = _browserGetViewportRect();
        if (r) await invoke("browser_show", { viewportX: r.x, viewportY: r.y, width: r.width, height: r.height }).catch(() => {});
      }
      _browserStartSync(urlInput, bCtx);
    });
  }
  document.querySelectorAll('.nav-tab:not([data-view="browser"])').forEach((tab) => {
    tab.addEventListener("click", () => {
      if (bCtx.open) invoke("browser_hide").catch(() => {});
      _browserStopSync(bCtx);
    });
  });
}

function _browserWireNavBtns(els, bCtx, urlInput, homeScreen) {
  const { backBtn, forwardBtn, refreshBtn, homeBtn, hfBtn, goBtn, clearBtn, openExtBtn } = els;
  if (goBtn && urlInput) {
    goBtn.onclick = () => _browserNavigateTo(urlInput.value, bCtx, urlInput, homeScreen);
    urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") _browserNavigateTo(urlInput.value, bCtx, urlInput, homeScreen); });
  }
  if (clearBtn && urlInput) { clearBtn.onclick = () => { urlInput.value = ""; urlInput.focus(); }; }
  if (backBtn) backBtn.onclick = () => { if (bCtx.open) invoke("browser_exec", { js: "window.history.back()" }).catch(() => {}); };
  if (forwardBtn) forwardBtn.onclick = () => { if (bCtx.open) invoke("browser_exec", { js: "window.history.forward()" }).catch(() => {}); };
  if (refreshBtn) refreshBtn.onclick = () => { if (bCtx.open) invoke("browser_exec", { js: "window.location.reload()" }).catch(() => {}); };
  if (homeBtn) homeBtn.onclick = () => _browserNavigateTo("neurodeck://home", bCtx, urlInput, homeScreen);
  if (hfBtn) hfBtn.onclick = () => _browserNavigateTo("https://huggingface.co/models", bCtx, urlInput, homeScreen);
  if (openExtBtn) {
    openExtBtn.onclick = () => {
      const url = urlInput ? urlInput.value.trim() : bCtx.url;
      const parsed = _browserParseUrlOrSearch(url || bCtx.url);
      if (parsed && parsed !== "neurodeck://home") invoke("open_external", { url: parsed }).catch(() => {});
    };
  }
}

function _browserWireSaveMemory(btn, urlInput, bCtx) {
  if (!btn) return;
  btn.onclick = async () => {
    const url = (urlInput ? urlInput.value.trim() : null) || bCtx.url;
    const parsed = _browserParseUrlOrSearch(url);
    if (!parsed || parsed === "neurodeck://home") return;
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = createIcon("database", { size: 14 }) + "<span>Saving...</span>";
    try {
      const res = await invoke("browser_save_to_memory", { url: parsed });
      btn.innerHTML = createIcon("check", { size: 14 }) + "<span>Saved (" + res.indexed + " chunks)</span>";
      setTimeout(() => { btn.disabled = false; btn.innerHTML = originalHtml; }, 3000);
    } catch (e) {
      console.error("Save memory error:", e);
      btn.innerHTML = createIcon("x", { size: 14 }) + "<span>Failed</span>";
      setTimeout(() => { btn.disabled = false; btn.innerHTML = originalHtml; }, 3000);
    }
  };
}

function _browserWireCopyCitation(btn, urlInput, bCtx) {
  if (!btn) return;
  btn.onclick = async () => {
    const url = (urlInput ? urlInput.value.trim() : null) || bCtx.url;
    const parsed = _browserParseUrlOrSearch(url);
    if (!parsed || parsed === "neurodeck://home") return;
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = createIcon("quote", { size: 14 }) + "<span>Fetching...</span>";
    try {
      const citation = await invoke("browser_get_citation", { url: parsed });
      await navigator.clipboard.writeText(citation);
      btn.innerHTML = createIcon("check", { size: 14 }) + "<span>Copied</span>";
      setTimeout(() => { btn.disabled = false; btn.innerHTML = originalHtml; }, 2000);
    } catch (e) {
      console.error("Copy citation error:", e);
      btn.innerHTML = createIcon("x", { size: 14 }) + "<span>Failed</span>";
      setTimeout(() => { btn.disabled = false; btn.innerHTML = originalHtml; }, 2000);
    }
  };
}

function _browserWireDownloadModel(btn, bCtx) {
  if (!btn) return;
  btn.onclick = () => {
    const repo = btn.dataset.repo;
    if (!repo) return;
    btn.disabled = true;
    const btnSpan = btn.querySelector("span");
    const originalText = btnSpan ? btnSpan.textContent : "Download Model";
    if (btnSpan) btnSpan.textContent = "Checking...";
    const proceedToModelSearch = () => {
      if (bCtx.open) invoke("browser_hide").catch(() => {});
      _browserStopSync(bCtx);
      openSettingsModal();
      activateSettingsPanel("sp-models", "models");
      switchToBrowseTabAndSearch(repo);
      if (btnSpan) btnSpan.textContent = originalText;
      btn.disabled = false;
    };
    invoke("hf_get_model_info", { repoId: repo })
      .then((modelInfo) => {
        if (!modelInfo.steam_deck_compat) {
          const ok = window.confirm(
            "\u26A0\uFE0F Compatibility Warning\n\nThe model \"" + repo + "\" might not run flawlessly on the Steam Deck.\n" +
            "\u2022 Steam Deck has 16GB of unified RAM.\n\u2022 Flawlessly compatible models are usually < 6GB in size and <= 7B parameters.\n\n" +
            "Do you still want to proceed with downloading it?"
          );
          if (!ok) { if (btnSpan) btnSpan.textContent = originalText; btn.disabled = false; return; }
        }
        proceedToModelSearch();
      })
      .catch((err) => {
        const ok = window.confirm(
          "\u26A0\uFE0F Compatibility Check Failed\n\nCould not verify Steam Deck compatibility for \"" + repo + "\" (Error: " + err + ").\n\n" +
          "Do you still want to proceed to the Model Library?"
        );
        if (!ok) { if (btnSpan) btnSpan.textContent = originalText; btn.disabled = false; return; }
        proceedToModelSearch();
      });
  };
}

function _browserWireSpeedDial(cards, bCtx, urlInput, homeScreen) {
  cards.forEach((card) => {
    card.onclick = () => { const url = card.getAttribute("data-url"); if (url) _browserNavigateTo(url, bCtx, urlInput, homeScreen); };
  });
}

function _browserWireHomeSearch(btn, input, bCtx, urlInput, homeScreen) {
  if (!btn || !input) return;
  btn.onclick = () => { const q = input.value.trim(); if (q) _browserNavigateTo(q, bCtx, urlInput, homeScreen); };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { const q = input.value.trim(); if (q) _browserNavigateTo(q, bCtx, urlInput, homeScreen); } });
}

function _browserWireKeyboard(els, bCtx, urlInput) {
  const { refreshBtn, backBtn, forwardBtn } = els;
  document.addEventListener("keydown", (e) => {
    const bv = document.getElementById("view-browser");
    if (!bv || !bv.classList.contains("active")) return;
    if (e.key === "F5") { e.preventDefault(); if (refreshBtn) refreshBtn.click(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "l") { e.preventDefault(); if (urlInput) { urlInput.focus(); urlInput.select(); } }
    if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); if (backBtn) backBtn.click(); }
    if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); if (forwardBtn) forwardBtn.click(); }
  });
}

function initBrowser() {
  const urlInput = document.getElementById("browser-url-input");
  const clearBtn = document.getElementById("browser-url-clear-btn");
  const goBtn = document.getElementById("browser-go-btn");
  const openExtBtn = document.getElementById("browser-open-ext-btn");
  const homeScreen = document.getElementById("browser-home-screen");
  const backBtn = document.getElementById("browser-back-btn");
  const forwardBtn = document.getElementById("browser-forward-btn");
  const refreshBtn = document.getElementById("browser-refresh-btn");
  const homeBtn = document.getElementById("browser-home-btn");
  const hfBtn = document.getElementById("browser-hf-btn");
  const homeSearchInput = document.getElementById("browser-home-search-input");
  const homeSearchBtn = document.getElementById("browser-home-search-btn");
  const saveMemoryBtn = document.getElementById("browser-save-memory-btn");
  const copyCitationBtn = document.getElementById("browser-copy-citation-btn");
  const speedDialCards = document.querySelectorAll(".speed-dial-card");
  const downloadModelBtn = document.getElementById("browser-download-model-btn");
  const browserTab = document.querySelector('.nav-tab[data-view="browser"]');

  const oldIframe = document.getElementById("browser-iframe");
  if (oldIframe) oldIframe.style.display = "none";
  const blockedScreen = document.getElementById("browser-blocked-screen");
  if (blockedScreen) blockedScreen.style.display = "none";

  const bCtx = { open: false, url: "neurodeck://home", syncInt: null, lastRect: null };
  window.browserNavigateTo = (raw) => _browserNavigateTo(raw, bCtx, urlInput, homeScreen);

  _browserWireTabViz(browserTab, bCtx, urlInput, homeScreen);
  _browserWireNavBtns({ backBtn, forwardBtn, refreshBtn, homeBtn, hfBtn, goBtn, clearBtn, openExtBtn }, bCtx, urlInput, homeScreen);
  _browserWireSaveMemory(saveMemoryBtn, urlInput, bCtx);
  _browserWireCopyCitation(copyCitationBtn, urlInput, bCtx);
  _browserWireDownloadModel(downloadModelBtn, bCtx);
  _browserWireSpeedDial(speedDialCards, bCtx, urlInput, homeScreen);
  _browserWireHomeSearch(homeSearchBtn, homeSearchInput, bCtx, urlInput, homeScreen);
  _browserWireKeyboard({ refreshBtn, backBtn, forwardBtn }, bCtx, urlInput);
}

// ==========================================================================
// AUTONOMOUS CODING AGENT — moved to agent.js
// ==========================================================================
// initAgentView is imported from ./agent.js

// --- OLLAMA MODEL MANAGER SYSTEM ---
function _buildOllamaModelRow(m, baseUrl) {
  const isCurrent =
    m.name.includes(localStorage.getItem("settings-ollama-model") || "llama2") ||
    m.name === (document.getElementById("settings-ollama-model")?.value || "llama2");
  const row = document.createElement("div");
  Object.assign(row.style, { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px", borderBottom: "1px solid rgba(255,255,255,0.03)" });
  const item = document.createElement("div");
  Object.assign(item.style, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1", cursor: "pointer" });
  item.className = "settings-ollama-model-item";
  item.setAttribute("data-model", m.name);
  if (isCurrent) {
    const active = document.createElement("span");
    Object.assign(active.style, { color: "var(--accent-color)", fontWeight: "bold", marginRight: "6px" });
    active.textContent = "[Active]";
    item.appendChild(active);
  }
  item.append(" " + m.name + " ");
  const size = document.createElement("span");
  Object.assign(size.style, { opacity: "0.5", fontSize: "0.75rem" });
  size.textContent = "(" + formatBytes(m.size) + ")";
  item.appendChild(size);
  item.onclick = () => {
    const modelInput = document.getElementById("settings-ollama-model");
    if (modelInput) { modelInput.value = m.name; document.getElementById("settings-save-llm-btn")?.click(); }
  };
  const btn = document.createElement("button");
  btn.className = "canvas-btn settings-ollama-delete-btn";
  Object.assign(btn.style, { padding: "2px 8px", fontSize: "0.7rem", borderColor: "#ff3c5a", color: "#ff3c5a" });
  btn.setAttribute("data-model", m.name);
  btn.textContent = "Delete";
  btn.onclick = () => {
    if (confirm("Are you sure you want to delete local model " + m.name + "?")) {
      btn.disabled = true; btn.innerText = "Deleting...";
      invoke("ollama_delete_model", { baseUrl, model: m.name })
        .then(() => refreshOllamaModels())
        .catch((err) => { alert("Delete failed: " + err); refreshOllamaModels(); });
    }
  };
  row.append(item, btn);
  return row;
}

function refreshOllamaModels() {
  const baseUrlInput = document.getElementById("settings-ollama-url");
  const baseUrl = (baseUrlInput?.value || "").trim() || "http://localhost:11434";
  const listEl = document.getElementById("settings-ollama-models-list");
  if (!listEl) return;
  const loading = document.createElement("div");
  Object.assign(loading.style, { opacity: "0.5", fontStyle: "italic" });
  loading.textContent = "Loading models...";
  listEl.replaceChildren(loading);
  invoke("ollama_list_models", { baseUrl })
    .then((models) => {
      if (models.length === 0) {
        const empty = document.createElement("div");
        Object.assign(empty.style, { opacity: "0.5", fontStyle: "italic" });
        empty.textContent = "No local models found.";
        listEl.replaceChildren(empty);
        return;
      }
      listEl.replaceChildren();
      models.forEach((m) => listEl.appendChild(_buildOllamaModelRow(m, baseUrl)));
    })
    .catch((err) => {
      const error = document.createElement("div");
      Object.assign(error.style, { color: "#ff6b6b", fontSize: "0.75rem" });
      error.textContent = "Failed to list models: " + String(err);
      listEl.replaceChildren(error);
    });
}

document
  .getElementById("settings-ollama-pull-btn")
  ?.addEventListener("click", () => {
    const inputEl = document.getElementById("settings-ollama-pull-input");
    const model = (inputEl?.value || "").trim();
    if (!model) {
      alert("Enter a model name to pull first.");
      return;
    }

    const baseUrlInput = document.getElementById("settings-ollama-url");
    const baseUrl =
      (baseUrlInput?.value || "").trim() || "http://localhost:11434";
    const pullBtn = document.getElementById("settings-ollama-pull-btn");
    const progressContainer = document.getElementById(
      "settings-ollama-pull-progress-container",
    );
    const statusEl = document.getElementById("settings-ollama-pull-status");
    const percentEl = document.getElementById("settings-ollama-pull-percent");
    const barEl = document.getElementById("settings-ollama-pull-bar");

    if (pullBtn) pullBtn.disabled = true;
    if (progressContainer) progressContainer.style.display = "block";
    if (statusEl) statusEl.innerText = "Initiating pull...";
    if (percentEl) percentEl.innerText = "0%";
    if (barEl) barEl.style.width = "0%";

    invoke("ollama_pull_model", { baseUrl, model })
      .then(() => {
        // Background task started successfully
      })
      .catch((err) => {
        alert(`Failed to start pull: ${err}`);
        if (pullBtn) pullBtn.disabled = false;
        if (progressContainer) progressContainer.style.display = "none";
      });
  });

listen("ollama_pull_progress", (event) => {
  const payload = event.payload;
  const progressContainer = document.getElementById(
    "settings-ollama-pull-progress-container",
  );
  const statusEl = document.getElementById("settings-ollama-pull-status");
  const percentEl = document.getElementById("settings-ollama-pull-percent");
  const barEl = document.getElementById("settings-ollama-pull-bar");
  const pullBtn = document.getElementById("settings-ollama-pull-btn");

  if (payload.status === "success") {
    if (statusEl) statusEl.innerText = "Pull complete!";
    if (percentEl) percentEl.innerText = "100%";
    if (barEl) barEl.style.width = "100%";

    setTimeout(() => {
      if (pullBtn) pullBtn.disabled = false;
      if (progressContainer) progressContainer.style.display = "none";
      const inputEl = document.getElementById("settings-ollama-pull-input");
      if (inputEl) inputEl.value = "";
      refreshOllamaModels();
    }, 1500);
  } else if (payload.status.startsWith("Error:")) {
    if (statusEl) statusEl.innerText = payload.status;
    if (pullBtn) pullBtn.disabled = false;
  } else {
    if (statusEl) statusEl.innerText = payload.status;
    if (payload.completed && payload.total) {
      const percent = Math.round((payload.completed / payload.total) * 100);
      if (percentEl) percentEl.innerText = `${percent}%`;
      if (barEl) barEl.style.width = `${percent}%`;
    }
  }
});

// --- LUA PLUGINS MANAGER SYSTEM ---
function _buildPluginRow(p) {
  const row = document.createElement("div");
  row.className = "ssh-profile-item";
  row.style.cssText = "padding:6px 8px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px;";
  const left = document.createElement("div");
  left.style.cssText = "display:flex;align-items:center;gap:8px;";
  const chk = document.createElement("input");
  chk.type = "checkbox";
  chk.className = "plugin-toggle-checkbox";
  chk.setAttribute("data-file", p.file_name);
  chk.checked = !!p.enabled;
  chk.style.accentColor = "var(--accent-color)";
  chk.style.cursor = "pointer";
  chk.onchange = () => {
    const enabled = chk.checked;
    const statusEl = document.getElementById("settings-plugin-status");
    if (statusEl) statusEl.innerText = "Toggling plugin...";
    invoke("toggle_plugin", { fileName: p.file_name, enabled })
      .then(() => { if (statusEl) statusEl.innerText = "Plugin " + (enabled ? "enabled" : "disabled") + " successfully."; loadPluginsList(); })
      .catch((err) => { if (statusEl) statusEl.innerText = "Failed to toggle: " + err; chk.checked = !enabled; });
  };
  const name = document.createElement("span");
  name.style.fontWeight = "500";
  name.style.color = p.enabled ? "var(--foreground-color)" : "rgba(255,255,255,0.3)";
  name.textContent = p.name;
  const file = document.createElement("span");
  file.style.cssText = "font-size:0.7rem;opacity:0.5;";
  file.textContent = "(" + p.file_name + ")";
  left.append(chk, name, file);
  const btn = document.createElement("button");
  btn.className = "canvas-btn plugin-edit-btn";
  btn.setAttribute("data-file", p.file_name);
  btn.style.cssText = "padding:3px 8px;font-size:0.75rem;";
  btn.textContent = "Edit";
  btn.onclick = () => {
    const statusEl = document.getElementById("settings-plugin-status");
    if (statusEl) statusEl.innerText = "Reading plugin content...";
    invoke("read_plugin", { fileName: p.file_name })
      .then((content) => {
        document.getElementById("settings-overlay")?.classList.remove("active");
        if (statusEl) statusEl.innerText = "";
        window.neurodeckCanvas.activePluginFile = p.file_name;
        loadCanvasCode("lua", content, p.file_name);
        const canvasTab = document.querySelector('.nav-tab[data-view="canvas"]');
        if (canvasTab) canvasTab.click();
      })
      .catch((err) => { if (statusEl) statusEl.innerText = "Failed to read plugin: " + err; });
  };
  row.append(left, btn);
  return row;
}

function loadPluginsList() {
  const listEl = document.getElementById("settings-plugins-list");
  if (!listEl) return;
  const loading = document.createElement("div");
  loading.style.cssText = "opacity:0.5;font-style:italic;";
  loading.textContent = "Loading plugins...";
  listEl.replaceChildren(loading);
  invoke("list_plugins")
    .then((plugins) => {
      if (plugins.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "opacity:0.5;font-style:italic;padding:5px;";
        empty.textContent = "No plugins found.";
        listEl.replaceChildren(empty);
        return;
      }
      listEl.replaceChildren();
      plugins.forEach((p) => listEl.appendChild(_buildPluginRow(p)));
    })
    .catch((err) => {
      const error = document.createElement("div");
      error.style.cssText = "color:var(--error-color);padding:5px;";
      error.textContent = "Failed to load plugins: " + String(err);
      listEl.replaceChildren(error);
    });
}

const pluginMarketplaceState = {
  plugins: [],
  search: "",
  tag: "",
};

function escapeMarketplaceHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function _buildMarketplaceCard(plugin) {
  const card = document.createElement("div");
  card.className = ("plugin-marketplace-card " + (plugin.installed ? "installed" : "")).trim();
  const title = document.createElement("div");
  title.className = "plugin-marketplace-title";
  const strong = document.createElement("strong");
  strong.textContent = String(plugin.name ?? "");
  const secondary = document.createElement("span");
  secondary.className = "plugin-marketplace-badge";
  const hasUpdate = plugin.installed && plugin.installed_version && plugin.version && plugin.version !== plugin.installed_version;
  if (plugin.installed && !plugin.enabled) { secondary.textContent = "Disabled"; }
  else if (hasUpdate) { secondary.textContent = "Update → v" + plugin.version; secondary.style.cssText = "background:rgba(255,200,87,0.15);color:var(--warning-color);border-color:rgba(255,200,87,0.3);"; }
  else if (plugin.installed) { secondary.textContent = "Installed"; }
  else { secondary.textContent = "v" + String(plugin.version ?? ""); }
  title.append(strong, secondary);
  const meta = document.createElement("div");
  meta.className = "plugin-marketplace-meta";
  meta.textContent = String(plugin.author ?? "") + " · " + String(plugin.lua_file ?? "");
  const desc = document.createElement("div");
  desc.className = "plugin-marketplace-desc";
  desc.textContent = String(plugin.description ?? "");
  const tagsWrap = document.createElement("div");
  tagsWrap.className = "plugin-marketplace-tags";
  (plugin.tags && plugin.tags.length ? plugin.tags : ["utility"]).forEach((tag) => {
    const span = document.createElement("span");
    span.className = "plugin-marketplace-tag";
    span.textContent = String(tag);
    tagsWrap.appendChild(span);
  });
  const actions = document.createElement("div");
  actions.className = "plugin-marketplace-actions";
  const btn = document.createElement("button");
  btn.className = plugin.installed ? "stv-btn-ghost marketplace-uninstall-btn" : "stv-btn-primary marketplace-install-btn";
  btn.setAttribute("data-plugin-id", String(plugin.id));
  btn.textContent = plugin.installed ? "Uninstall" : "Install";
  btn.onclick = async () => {
    const statusEl = document.getElementById("plugin-marketplace-status");
    btn.disabled = true;
    if (plugin.installed) {
      if (!confirm("Uninstall marketplace plugin '" + plugin.id + "'?")) { btn.disabled = false; return; }
      if (statusEl) statusEl.innerText = "Uninstalling marketplace plugin...";
      try { await invoke("uninstall_plugin", { pluginId: plugin.id }); if (statusEl) statusEl.innerText = "Plugin uninstalled and Lua runtime reloaded."; await loadPluginMarketplace(); loadPluginsList(); }
      catch (err) { if (statusEl) statusEl.innerText = "Uninstall failed: " + err; }
      finally { btn.disabled = false; }
    } else {
      if (statusEl) statusEl.innerText = "Installing marketplace plugin...";
      try { await invoke("install_plugin_from_registry", { pluginId: plugin.id }); if (statusEl) statusEl.innerText = "Plugin installed and Lua runtime reloaded."; await loadPluginMarketplace(); loadPluginsList(); }
      catch (err) { if (statusEl) statusEl.innerText = "Install failed: " + err; }
      finally { btn.disabled = false; }
    }
  };
  actions.appendChild(btn);
  card.append(title, meta, desc, tagsWrap, actions);
  return card;
}

function renderPluginMarketplace() {
  const grid = document.getElementById("plugin-marketplace-grid");
  const tagSelect = document.getElementById("plugin-marketplace-tag");
  const categorySelect = document.getElementById("plugin-marketplace-category");
  if (!grid) return;
  const tags = [...new Set(pluginMarketplaceState.plugins.flatMap((p) => p.tags || []))].sort();
  if (tagSelect) {
    const selected = tagSelect.value || pluginMarketplaceState.tag;
    tagSelect.replaceChildren();
    const allOpt = document.createElement("option"); allOpt.value = ""; allOpt.textContent = "All Tags"; tagSelect.appendChild(allOpt);
    tags.forEach((tag) => { const opt = document.createElement("option"); opt.value = String(tag); opt.textContent = String(tag); tagSelect.appendChild(opt); });
    tagSelect.value = tags.includes(selected) ? selected : "";
    pluginMarketplaceState.tag = tagSelect.value;
  }
  const query = pluginMarketplaceState.search.trim().toLowerCase();
  const selectedTag = pluginMarketplaceState.tag;
  const selectedCategory = categorySelect?.value || "";
  const filtered = pluginMarketplaceState.plugins.filter((plugin) => {
    const haystack = (plugin.name + " " + plugin.description + " " + plugin.author + " " + (plugin.tags || []).join(" ") + " " + (plugin.category || "")).toLowerCase();
    return (!query || haystack.includes(query)) && (!selectedTag || (plugin.tags || []).includes(selectedTag)) && (!selectedCategory || (plugin.category || "utility") === selectedCategory);
  });
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "opacity:0.45;font-style:italic;";
    empty.textContent = "No marketplace plugins match this filter.";
    grid.replaceChildren(empty);
    return;
  }
  grid.replaceChildren();
  filtered.forEach((plugin) => grid.appendChild(_buildMarketplaceCard(plugin)));
}

async function loadPluginMarketplace() {
  const grid = document.getElementById("plugin-marketplace-grid");
  const statusEl = document.getElementById("plugin-marketplace-status");
  if (!grid) return;

  grid.innerHTML = `<div class="marketplace-loading">Loading marketplace registry…</div>`;
  if (statusEl) statusEl.innerText = "Fetching plugin registry…";

  try {
    const registry = await invoke("fetch_plugin_registry");
    pluginMarketplaceState.plugins = registry.plugins || [];
    const count = pluginMarketplaceState.plugins.length;
    if (statusEl)
      statusEl.innerText =
        count > 0
          ? `${count} community plugin${count === 1 ? "" : "s"} available.`
          : "Registry is empty — check back soon.";
    renderPluginMarketplace();
  } catch (err) {
    pluginMarketplaceState.plugins = [];
    const error = document.createElement("div");
    error.className = "marketplace-error";
    error.textContent =
      "Could not reach the plugin registry. Check your internet connection and try Refresh.";
    const detail = document.createElement("span");
    detail.style.opacity = "0.5";
    detail.style.fontSize = "0.8em";
    detail.textContent = String(err);
    error.appendChild(document.createElement("br"));
    error.appendChild(detail);
    grid.replaceChildren(error);
    if (statusEl) statusEl.innerText = "Registry unavailable.";
  }
}

function _pluginsWireInstall(installBtn, urlInput, statusEl) {
  if (!installBtn || !urlInput) return;
  installBtn.onclick = () => {
    const url = urlInput.value.trim();
    if (!url) { alert("Please enter a valid plugin URL."); return; }
    if (statusEl) statusEl.innerText = "Downloading and installing plugin...";
    installBtn.disabled = true;
    invoke("install_plugin", { url })
      .then(() => { if (statusEl) statusEl.innerText = "Plugin installed successfully!"; urlInput.value = ""; loadPluginsList(); loadPluginMarketplace(); })
      .catch((err) => { if (statusEl) statusEl.innerText = "Installation failed: " + err; })
      .finally(() => { installBtn.disabled = false; });
  };
}

function _pluginsWireNewBtn(newBtn) {
  if (!newBtn) return;
  newBtn.onclick = () => {
    document.getElementById("settings-overlay")?.classList.remove("active");
    const boilerplate = `-- plugins/new_plugin.lua
-- Template for a new S-Term plugin.

-- 1. Register a custom chat command (type /mycommand in chat)
registerCommand("mycommand", function(args)
    print("Executing mycommand with args: " .. tostring(args))
    return "mycommand executed! Args: " .. tostring(args)
end)

-- 2. Register hooks to inspect or modify messages/responses
-- Available events: onMessage, onAIResponse
registerHook("onMessage", function(text)
    -- This hook runs whenever a user sends a message.
    -- You can modify the text and return it.
    return text
end)

print("[Plugin] New plugin loaded successfully!")
`;
    loadCanvasCode("lua", boilerplate, "");
    const canvasTab = document.querySelector('.nav-tab[data-view="canvas"]');
    if (canvasTab) canvasTab.click();
  };
}

function _pluginsWireReload(reloadBtn, statusEl) {
  if (!reloadBtn) return;
  reloadBtn.onclick = () => {
    if (statusEl) statusEl.innerText = "Reloading plugins in engine...";
    reloadBtn.disabled = true;
    invoke("reload_plugins")
      .then(() => { if (statusEl) statusEl.innerText = "Plugins reloaded successfully!"; loadPluginsList(); loadPluginMarketplace(); })
      .catch((err) => { if (statusEl) statusEl.innerText = "Reload failed: " + err; })
      .finally(() => { reloadBtn.disabled = false; });
  };
}

function initPluginsManager() {
  const installBtn = document.getElementById("settings-plugin-install-btn");
  const urlInput = document.getElementById("settings-plugin-install-url");
  const statusEl = document.getElementById("settings-plugin-status");
  const newBtn = document.getElementById("settings-plugin-new-btn");
  const reloadBtn = document.getElementById("settings-plugin-reload-btn");
  const marketplaceSearch = document.getElementById("plugin-marketplace-search");
  const marketplaceTag = document.getElementById("plugin-marketplace-tag");
  const marketplaceRefresh = document.getElementById("plugin-marketplace-refresh-btn");

  _pluginsWireInstall(installBtn, urlInput, statusEl);
  _pluginsWireNewBtn(newBtn);
  _pluginsWireReload(reloadBtn, statusEl);

  if (marketplaceSearch) marketplaceSearch.oninput = () => { pluginMarketplaceState.search = marketplaceSearch.value || ""; renderPluginMarketplace(); };
  if (marketplaceTag) marketplaceTag.onchange = () => { pluginMarketplaceState.tag = marketplaceTag.value || ""; renderPluginMarketplace(); };
  const marketplaceCategory = document.getElementById("plugin-marketplace-category");
  if (marketplaceCategory) marketplaceCategory.onchange = () => renderPluginMarketplace();
  if (marketplaceRefresh) marketplaceRefresh.onclick = () => loadPluginMarketplace();
  loadPluginMarketplace();
}

function _canvasSavePluginClick() {
  const code = document.getElementById("canvas-editor").value;
  let activeFile = window.neurodeckCanvas.activePluginFile;
  if (activeFile) {
    invoke("save_plugin", { fileName: activeFile, content: code })
      .then(() => { alert(`Plugin '${activeFile}' saved successfully.`); })
      .catch((err) => { alert(`Failed to save plugin: ${err}`); });
  } else {
    const fileNameInput = prompt("Enter filename for the new plugin (must end with .lua):", "my_plugin.lua");
    if (!fileNameInput) return;
    let sanitized = fileNameInput.trim();
    if (!sanitized.endsWith(".lua")) sanitized += ".lua";
    if (sanitized.includes("/") || sanitized.includes("\\") || sanitized.includes("..")) {
      alert("Invalid file name. Do not include path slashes or dots.");
      return;
    }
    invoke("save_plugin", { fileName: sanitized, content: code })
      .then(() => {
        window.neurodeckCanvas.activePluginFile = sanitized;
        const fileTitle = document.getElementById("canvas-file-title");
        if (fileTitle) fileTitle.textContent = sanitized;
        alert(`Plugin '${sanitized}' saved successfully.`);
      })
      .catch((err) => { alert(`Failed to save plugin: ${err}`); });
  }
}

function updateCanvasToolbarButtons() {
  const lang = window.neurodeckCanvas.currentLang;
  let saveBtn = document.getElementById("canvas-save-plugin-btn");
  if (lang === "lua") {
    if (!saveBtn) {
      saveBtn = document.createElement("button");
      saveBtn.className = "canvas-btn";
      saveBtn.id = "canvas-save-plugin-btn";
      saveBtn.innerHTML = `${createIcon("save", { size: 14 })}<span>Save Plugin</span>`;
      saveBtn.style.marginLeft = "8px";
      const runBtn = document.getElementById("canvas-run-btn");
      if (runBtn) runBtn.parentNode.insertBefore(saveBtn, runBtn.nextSibling);
      saveBtn.onclick = () => _canvasSavePluginClick();
    }
    saveBtn.style.display = "inline-block";
  } else {
    if (saveBtn) saveBtn.style.display = "none";
  }
}

// ==========================================================================
// DESKTOP COMPUTER USE
// ==========================================================================
const computerUseState = {
  approveAll: false,
  pendingResolve: null,
  pendingTarget: null,
  lastScreenshot: null,
};

function setComputerStatus(message, tone = "info") {
  const statusEl = document.getElementById("computer-status-line");
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.className = `stv-status-line ${tone}`;
}

function setComputerPreview(screenshot) {
  const img = document.getElementById("computer-preview-img");
  const empty = document.getElementById("computer-preview-empty");
  if (!img || !empty) return;

  if (!screenshot || !screenshot.base64) {
    img.removeAttribute("src");
    img.classList.remove("active");
    empty.style.display = "flex";
    return;
  }

  img.src = `data:${screenshot.mime || "image/png"};base64,${screenshot.base64}`;
  img.classList.add("active");
  empty.style.display = "none";
}

async function captureComputerScreenshot({ showInAgentLog = false } = {}) {
  const screenshot = await invoke("computer_screenshot");
  computerUseState.lastScreenshot = screenshot;
  setComputerPreview(screenshot);
  if (showInAgentLog) appendComputerScreenshotToAgentLog(screenshot);
  return screenshot;
}

function appendComputerScreenshotToAgentLog(screenshot) {
  const logEl = document.getElementById("agent-log");
  if (!logEl || !screenshot?.base64) return;

  const empty = logEl.querySelector(".agent-empty-state");
  if (empty) empty.remove();

  const entry = document.createElement("div");
  entry.className = "agent-log-entry agent-log-info agent-log-computer-feed";
  entry.innerHTML = `<span class="agent-log-icon">🖥️</span>
        <div class="agent-log-body">
            <div class="agent-log-label">Computer Use</div>
            <img class="agent-computer-screenshot" alt="Desktop screenshot" src="data:${screenshot.mime || "image/png"};base64,${screenshot.base64}">
        </div>`;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function positionComputerTargetBox(target) {
  const box = document.getElementById("computer-use-target-box");
  const img = document.getElementById("computer-use-modal-img");
  if (
    !box ||
    !img ||
    !target ||
    !target.width ||
    !target.height ||
    !img.naturalWidth ||
    !img.naturalHeight
  ) {
    if (box) box.style.display = "none";
    return;
  }

  const scaleX = img.clientWidth / img.naturalWidth;
  const scaleY = img.clientHeight / img.naturalHeight;
  box.style.display = "block";
  box.style.left = `${target.x * scaleX}px`;
  box.style.top = `${target.y * scaleY}px`;
  box.style.width = `${Math.max(8, target.width * scaleX)}px`;
  box.style.height = `${Math.max(8, target.height * scaleY)}px`;
}

let computerUseFocusTrap = null;

async function requestComputerUseApproval({ action, details, target } = {}) {
  if (computerUseState.approveAll) return true;

  const modal = document.getElementById("computer-use-modal");
  const actionEl = document.getElementById("computer-use-modal-action");
  const detailsEl = document.getElementById("computer-use-modal-details");
  const img = document.getElementById("computer-use-modal-img");
  const empty = document.getElementById("computer-use-modal-empty");
  if (!modal || !actionEl || !detailsEl || !img || !empty) {
    return false;
  }

  actionEl.textContent = action || "Desktop action requested";
  detailsEl.textContent =
    details || "Review the desktop screenshot before approving.";
  computerUseState.pendingTarget = target || null;

  try {
    const screenshot = await captureComputerScreenshot({
      showInAgentLog: true,
    });
    img.src = `data:${screenshot.mime || "image/png"};base64,${screenshot.base64}`;
    img.classList.add("active");
    empty.style.display = "none";
    img.onload = () =>
      positionComputerTargetBox(computerUseState.pendingTarget);
  } catch (err) {
    img.removeAttribute("src");
    img.classList.remove("active");
    empty.style.display = "flex";
    empty.textContent = `Screenshot unavailable: ${err}`;
    positionComputerTargetBox(null);
  }

  modal.classList.add("active");
  if (!computerUseFocusTrap) computerUseFocusTrap = new FocusTrap(modal);
  computerUseFocusTrap.activate();
  setTimeout(
    () => document.getElementById("computer-use-approve-btn")?.focus(),
    50,
  );

  return new Promise((resolve) => {
    computerUseState.pendingResolve = resolve;
  });
}

function finishComputerUseApproval(approved, approveSession = false) {
  if (approveSession) {
    computerUseState.approveAll = true;
    const toggle = document.getElementById("computer-approve-all-toggle");
    if (toggle) toggle.checked = true;
  }
  const modal = document.getElementById("computer-use-modal");
  if (modal) modal.classList.remove("active");
  if (computerUseFocusTrap) computerUseFocusTrap.deactivate();
  positionComputerTargetBox(null);
  const resolve = computerUseState.pendingResolve;
  computerUseState.pendingResolve = null;
  computerUseState.pendingTarget = null;
  if (resolve) resolve(approved);
}

async function invokeApprovedComputerAction(command, args, approvalMeta) {
  const approved = await requestComputerUseApproval(approvalMeta);
  if (!approved) {
    throw new Error("Computer use action denied.");
  }
  return invoke(command, { ...args, approved: true });
}

function _cuBuildApi() {
  return {
    captureScreenshot: captureComputerScreenshot,
    requestApproval: requestComputerUseApproval,
    mouseMove: (x, y) => invokeApprovedComputerAction("computer_mouse_move", { x, y }, { action: "Move mouse pointer", details: "Move pointer to " + x + ", " + y + ".", target: { x, y, width: 28, height: 28 } }),
    click: (button = "left") => invokeApprovedComputerAction("computer_mouse_click", { button }, { action: "Mouse click", details: "Perform a " + button + " click at the current pointer position." }),
    type: (text) => invokeApprovedComputerAction("computer_type", { text }, { action: "Type text", details: "Type " + String(text || "").length + " character" + (String(text || "").length === 1 ? "" : "s") + " into the focused application." }),
    key: (key) => invokeApprovedComputerAction("computer_key", { key }, { action: "Press keyboard key", details: "Send key: " + key + "." }),
    findText: (text) => invoke("computer_find_text", { text }),
  };
}

function initComputerUse() {
  const captureBtn = document.getElementById("computer-capture-btn");
  const ocrBtn = document.getElementById("computer-ocr-btn");
  const ocrInput = document.getElementById("computer-ocr-input");
  const approveAllToggle = document.getElementById("computer-approve-all-toggle");
  const approveBtn = document.getElementById("computer-use-approve-btn");
  const approveSessionBtn = document.getElementById("computer-use-approve-session-btn");
  const denyBtn = document.getElementById("computer-use-deny-btn");
  const denyX = document.getElementById("computer-use-deny-x");

  if (approveAllToggle) {
    approveAllToggle.checked = computerUseState.approveAll;
    approveAllToggle.onchange = () => { computerUseState.approveAll = approveAllToggle.checked; setComputerStatus(computerUseState.approveAll ? "Computer use auto-approval is active for this session." : "Computer use approval modal is active.", "info"); };
  }
  if (captureBtn) {
    captureBtn.onclick = async () => {
      captureBtn.disabled = true; setComputerStatus("Capturing desktop screenshot...");
      try { await captureComputerScreenshot({ showInAgentLog: true }); setComputerStatus("Screenshot captured.", "ok"); }
      catch (err) { setComputerStatus("Screenshot failed: " + err, "error"); }
      finally { captureBtn.disabled = false; }
    };
  }
  if (ocrBtn && ocrInput) {
    ocrBtn.onclick = async () => {
      const text = ocrInput.value.trim();
      if (!text) { ocrInput.focus(); return; }
      ocrBtn.disabled = true; setComputerStatus("Running OCR over the current desktop...");
      try {
        const match = await invoke("computer_find_text", { text });
        await requestComputerUseApproval({ action: "Found text: " + match.text, details: "Coordinates " + match.x + ", " + match.y + "; confidence " + Math.round(match.confidence) + "%.", target: match });
        setComputerStatus('Found "' + match.text + '" at ' + match.x + ", " + match.y + ".", "ok");
      } catch (err) { setComputerStatus("OCR failed: " + err, "error"); }
      finally { ocrBtn.disabled = false; }
    };
  }
  if (approveBtn) approveBtn.onclick = () => finishComputerUseApproval(true, false);
  if (approveSessionBtn) approveSessionBtn.onclick = () => finishComputerUseApproval(true, true);
  if (denyBtn) denyBtn.onclick = () => finishComputerUseApproval(false, false);
  if (denyX) denyX.onclick = () => finishComputerUseApproval(false, false);
  window.neurodeckComputerUse = _cuBuildApi();
}

// Initialize Plugins Manager event handlers
initPluginsManager();
initComputerUse();

// ============================================================================
// AGENT SWITCHER
// ============================================================================

const TIER_LABEL = {
  fast: "⚡ Fast",
  balanced: "⚖️ Balanced",
  smart: "🧠 Smart",
  "local-fast": "🖥️ Local Fast",
  "local-balanced": "🖥️ Local",
  "local-smart": "🖥️ Local Smart",
};

const PROVIDER_BADGE = {
  gemini: "☁️ Gemini",
  kimi: "🌙 Kimi",
  ollama: "🏠 Ollama",
  huggingface: "🤗 HF",
};

function toggleAgentSwitcher() {
  const panel = document.getElementById("agent-switcher-panel");
  if (!panel) return;
  const isHidden = panel.classList.contains("hidden");
  if (isHidden) {
    panel.classList.remove("hidden");
    renderAgentSwitcher();
    renderRecommendedModels();
  } else {
    panel.classList.add("hidden");
  }
}

function renderAgentSwitcher() {
  const grid = document.getElementById("agent-card-grid");
  if (!grid) return;
  const agents = state.agents;
  if (!agents.length) {
    grid.innerHTML = `<div class="agent-empty">No agents configured. Use the Custom tab to add one.</div>`;
    return;
  }
  grid.replaceChildren();
  agents.forEach((agent) => {
    const active = agent.id === state.activeAgentId;
    const provLabel = PROVIDER_BADGE[agent.provider] || agent.provider;
    const card = document.createElement("div");
    card.className = `agent-card${active ? " active" : ""}`;
    card.addEventListener("click", () => activateAgent(agent.id));

    const top = document.createElement("div");
    top.className = "agent-card-top";
    const name = document.createElement("span");
    name.className = "agent-card-name";
    name.textContent = String(agent.name ?? "");
    const badge = document.createElement("span");
    badge.className = `agent-provider-badge agent-provider-${String(agent.provider ?? "")}`;
    badge.textContent = String(provLabel);
    top.append(name, badge);

    const model = document.createElement("div");
    model.className = "agent-card-model";
    model.textContent = String(agent.model ?? "");
    const desc = document.createElement("div");
    desc.className = "agent-card-desc";
    desc.textContent = String(agent.description ?? "");

    card.append(top, model, desc);

    if (active) {
      const chip = document.createElement("div");
      chip.className = "agent-card-active-chip";
      chip.textContent = "ACTIVE";
      card.appendChild(chip);
    } else {
      const del = document.createElement("button");
      del.className = "agent-card-delete";
      del.title = "Delete agent";
      del.innerHTML = createIcon("x", { size: 12 });
      del.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteAgentById(agent.id);
      });
      card.appendChild(del);
    }

    grid.appendChild(card);
  });
}

function _recBuildModelCard(m) {
  const tierLabel = TIER_LABEL[m.tier] || m.tier;
  const vramStr = m.vram_mb > 0 ? `${m.vram_mb} MB RAM` : "Cloud";
  const card = document.createElement("div");
  card.className = "agent-rec-card";
  card.addEventListener("click", () => instantiateRecommended(m.provider, m.model, m.name));

  const top = document.createElement("div");
  top.className = "agent-rec-top";
  const name = document.createElement("span");
  name.className = "agent-rec-name";
  name.textContent = String(m.name ?? "");
  const tier = document.createElement("span");
  tier.className = "agent-tier-badge";
  tier.textContent = String(tierLabel);
  top.append(name, tier);

  const meta = document.createElement("div");
  meta.className = "agent-rec-meta";
  const providerBadge = document.createElement("span");
  providerBadge.className = `agent-provider-badge agent-provider-${String(m.provider ?? "")}`;
  providerBadge.textContent = String(PROVIDER_BADGE[m.provider] || m.provider);
  const vram = document.createElement("span");
  vram.className = "agent-vram";
  vram.textContent = vramStr;
  const deck = document.createElement("span");
  deck.className = `agent-deck-badge${m.steam_deck_ok ? "" : " warn"}`;
  deck.textContent = m.steam_deck_ok ? "✅ Deck OK" : "⚠️ Heavy";
  meta.append(providerBadge, vram, deck);

  const desc = document.createElement("div");
  desc.className = "agent-rec-desc";
  desc.textContent = String(m.description ?? "");

  const tags = document.createElement("div");
  tags.className = "agent-rec-tags";
  (m.tags || []).filter((t) => ["recommended", "long-context", "multilingual", "code"].includes(t)).forEach((tag) => {
    const span = document.createElement("span");
    span.className = "agent-tag";
    span.textContent = String(tag);
    tags.appendChild(span);
  });

  const modelId = document.createElement("div");
  modelId.className = "agent-rec-model-id";
  modelId.textContent = String(m.model ?? "");

  card.append(top, meta, desc, tags, modelId);
  return card;
}

function renderRecommendedModels() {
  const grid = document.getElementById("agent-rec-grid");
  if (!grid) return;
  grid.innerHTML = `<div class="agent-rec-loading">Loading recommendations…</div>`;
  invoke("get_recommended_models")
    .then((models) => {
      grid.replaceChildren();
      models.forEach((m) => grid.appendChild(_recBuildModelCard(m)));
    })
    .catch(() => {
      grid.innerHTML = `<div class="agent-empty">Failed to load recommendations.</div>`;
    });
}

function activateAgent(id) {
  invoke("switch_agent", { id })
    .then((agent) => {
      state.activeAgentId = agent.id;
      state.activeProvider = agent.provider;
      renderAgentSwitcher();
      const modelNameEl = document.getElementById("model-name");
      if (modelNameEl)
        modelNameEl.innerText = `[ ${agent.name.toUpperCase()} ]`;
      addNotification(
        "Agent switched",
        `Now using ${agent.name} (${agent.model})`,
        "info",
      );
    })
    .catch((err) => addNotification("Agent switch failed", err, "error"));
}

function deleteAgentById(id) {
  invoke("delete_agent", { id })
    .then(() => {
      state.agents = state.agents.filter((a) => a.id !== id);
      renderAgentSwitcher();
    })
    .catch((err) => addNotification("Delete failed", err, "error"));
}

function instantiateRecommended(provider, model, name) {
  // Build a slug from the model name
  const id = model
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  const existing = state.agents.find((a) => a.id === id || a.model === model);
  if (existing) {
    activateAgent(existing.id);
    return;
  }
  const ollamaUrl = "http://localhost:11434";
  const agent = {
    id,
    name,
    provider,
    model,
    base_url: provider === "ollama" ? ollamaUrl : "",
    description: "",
  };
  invoke("add_agent", { agent })
    .then(() => {
      invoke("list_agents").then((agents) => {
        state.agents = agents;
        activateAgent(id);
      });
    })
    .catch((err) => addNotification("Add agent failed", err, "error"));
}

// Expose agent switcher functions for inline onclick handlers
window.toggleAgentSwitcher = toggleAgentSwitcher;
document.getElementById("model-name")?.addEventListener("click", toggleAgentSwitcher);
window.activateAgent = activateAgent;
window.deleteAgentById = deleteAgentById;
window.instantiateRecommended = instantiateRecommended;

// Agent custom form — show/hide URL field by provider
document.addEventListener("change", (e) => {
  if (e.target.id === "new-agent-provider") {
    const urlRow = document.getElementById("new-agent-url-row");
    if (urlRow)
      urlRow.style.display = e.target.value === "ollama" ? "" : "none";
  }
});

function handleAddAgent() {
  const id = document.getElementById("new-agent-id")?.value.trim() || "";
  const name = document.getElementById("new-agent-name")?.value.trim() || "";
  const provider =
    document.getElementById("new-agent-provider")?.value || "gemini";
  const model = document.getElementById("new-agent-model")?.value.trim() || "";
  const base_url =
    document.getElementById("new-agent-url")?.value.trim() ||
    "http://localhost:11434";
  const description =
    document.getElementById("new-agent-desc")?.value.trim() || "";
  const statusEl = document.getElementById("new-agent-status");

  if (!id || !name || !model) {
    if (statusEl) {
      statusEl.className = "agent-form-status error";
      statusEl.innerText = "ID, Name, and Model are required.";
    }
    return;
  }

  invoke("add_agent", {
    agent: { id, name, provider, model, base_url, description },
  })
    .then(() => {
      invoke("list_agents").then((agents) => {
        state.agents = agents;
        renderAgentSwitcher();
        if (statusEl) {
          statusEl.className = "agent-form-status ok";
          statusEl.innerText = `Agent "${name}" added.`;
        }
        // Clear form
        [
          "new-agent-id",
          "new-agent-name",
          "new-agent-model",
          "new-agent-url",
          "new-agent-desc",
        ].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
      });
    })
    .catch((err) => {
      if (statusEl) {
        statusEl.className = "agent-form-status error";
        statusEl.innerText = err;
      }
    });
}

// Tab switching inside agent switcher panel
document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-atab]");
  if (!tab) return;
  const panel = document.getElementById("agent-switcher-panel");
  if (!panel || !panel.contains(tab)) return;
  const target = tab.dataset.atab;
  panel
    .querySelectorAll(".agent-tab")
    .forEach((t) => t.classList.toggle("active", t.dataset.atab === target));
  panel
    .querySelectorAll(".agent-tab-body")
    .forEach((b) => b.classList.add("hidden"));
  const body = document.getElementById(`agent-tab-${target}`);
  if (body) body.classList.remove("hidden");
  if (target === "recommended") renderRecommendedModels();
});

// Keyboard Shortcuts Cheat Sheet
let shortcutsFocusTrap = null;
function openShortcutsOverlay() {
  const overlay = document.getElementById("shortcuts-overlay");
  if (!overlay) return;
  renderShortcutsOverlay();
  overlay.classList.remove("hidden");
  if (!shortcutsFocusTrap) shortcutsFocusTrap = new FocusTrap(overlay);
  shortcutsFocusTrap.activate();
}
function closeShortcutsOverlay() {
  const overlay = document.getElementById("shortcuts-overlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
  if (shortcutsFocusTrap) shortcutsFocusTrap.deactivate();
}

// Close agent switcher on Escape or click outside
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const panel = document.getElementById("agent-switcher-panel");
    if (panel && !panel.classList.contains("hidden"))
      panel.classList.add("hidden");
    const shortcuts = document.getElementById("shortcuts-overlay");
    if (shortcuts && !shortcuts.classList.contains("hidden")) {
      e.preventDefault();
      closeShortcutsOverlay();
      return;
    }
  }
  if (e.ctrlKey && e.shiftKey && e.key === "M") {
    e.preventDefault();
    toggleAgentSwitcher();
  }
  // ? key opens shortcuts when not typing in an input
  if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const tag = document.activeElement?.tagName;
    const isEditable =
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      document.activeElement?.isContentEditable;
    if (!isEditable) {
      e.preventDefault();
      openShortcutsOverlay();
    }
  }
  // F1 opens the App Manual from any view
  if (e.key === "F1" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    document.getElementById("manual-btn")?.click();
  }
});

document.addEventListener("click", (e) => {
  const panel = document.getElementById("agent-switcher-panel");
  const modelBtn = document.getElementById("model-name");
  if (!panel || panel.classList.contains("hidden")) return;
  const target = e.target instanceof Element ? e.target : null;
  if (target?.closest(".agent-switcher-close")) {
    panel.classList.add("hidden");
    return;
  }
  if (target && !panel.contains(target) && target !== modelBtn) {
    panel.classList.add("hidden");
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SESSION BROWSER — Sprint 9.1
// ═══════════════════════════════════════════════════════════════════════════
function _sbFormatDate(isoStr) {
  try {
    const d = new Date(isoStr), now = new Date(), diff = now - d;
    if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 7 * 86_400_000) return d.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch { return isoStr || ""; }
}

function _sbBuildSessionItem(session, loadSessions) {
  const item = document.createElement("div");
  item.className = "session-browser-item";
  item.dataset.id = session.id;
  const title = document.createElement("div");
  title.className = "session-browser-title";
  title.textContent = session.name || _sbFormatDate(session.created_at);
  const meta = document.createElement("div");
  meta.className = "session-browser-meta";
  meta.textContent = session.message_count + " msgs" + (session.preview ? " · " + session.preview : "");
  const actions = document.createElement("div");
  actions.className = "session-browser-actions";
  const openBtn = document.createElement("button");
  openBtn.className = "session-browser-btn"; openBtn.title = "Restore session"; openBtn.innerHTML = createIcon("cornerDownLeft", { size: 12 });
  openBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    invoke("load_session_by_id", { id: session.id })
      .then((data) => { activateViewByName("chat"); if (typeof window.restoreSessionMessages === "function") window.restoreSessionMessages(data); addNotification("Session Restored", "Loaded: " + (session.name || session.id), "success"); })
      .catch((err) => addNotification("Session Error", String(err), "error"));
  });
  const renameBtn = document.createElement("button");
  renameBtn.className = "session-browser-btn"; renameBtn.title = "Rename"; renameBtn.innerHTML = createIcon("pencil", { size: 12 });
  renameBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const newName = prompt("Rename session:", session.name || "");
    if (newName === null) return;
    invoke("rename_session", { id: session.id, name: newName.trim() }).then(() => loadSessions()).catch((err) => addNotification("Rename Error", String(err), "error"));
  });
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "session-browser-btn session-browser-btn--danger"; deleteBtn.title = "Delete"; deleteBtn.innerHTML = createIcon("trash2", { size: 12 });
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!confirm('Delete session "' + (session.name || session.id) + '"?')) return;
    invoke("delete_session", { id: session.id }).then(() => loadSessions()).catch((err) => addNotification("Delete Error", String(err), "error"));
  });
  actions.append(openBtn, renameBtn, deleteBtn);
  item.append(title, meta, actions);
  item.addEventListener("click", () => openBtn.click());
  return item;
}

function _sbRenderSessionList(sessions, list, loadSessions) {
  list.innerHTML = "";
  if (!sessions || sessions.length === 0) {
    const empty = document.createElement("div"); empty.className = "session-browser-empty"; empty.textContent = "No saved sessions yet."; list.appendChild(empty); return;
  }
  sessions.forEach(session => list.appendChild(_sbBuildSessionItem(session, loadSessions)));
}

function initSessionBrowser() {
  const toggleBtn = document.getElementById("session-browser-toggle");
  const list = document.getElementById("session-browser-list");
  const chevron = document.getElementById("session-browser-chevron");
  if (!toggleBtn || !list) return;
  let loaded = false;
  const loadSessions = () => invoke("list_sessions_meta").then(sessions => _sbRenderSessionList(sessions, list, loadSessions)).catch(() => { list.innerHTML = '<div class="session-browser-empty" style="color:var(--error-color)">Failed to load sessions.</div>'; });
  toggleBtn.addEventListener("click", () => {
    const isHidden = list.classList.contains("hidden");
    list.classList.toggle("hidden", !isHidden);
    toggleBtn.setAttribute("aria-expanded", String(isHidden));
    if (chevron) chevron.style.transform = isHidden ? "rotate(90deg)" : "rotate(0deg)";
    if (isHidden && !loaded) { loaded = true; loadSessions(); }
  });
  document.addEventListener("neurodeck:session-saved", loadSessions);
}

// expose for chat.js to refresh the list after auto-save
window.refreshSessionBrowser = function() {
  const list = document.getElementById("session-browser-list");
  if (list && !list.classList.contains("hidden")) {
    invoke("list_sessions_meta")
      .then((sessions) => {
        if (typeof initSessionBrowser !== "undefined") {
          const event = new CustomEvent("neurodeck:session-saved");
          document.dispatchEvent(event);
        }
      })
      .catch(() => {});
  }
};

function initNotificationCenter() {
  const notifBtn = document.getElementById("notif-btn");
  const notifModal = document.getElementById("notif-modal");
  const closeX = document.getElementById("close-notif-x");
  const closeBtn = document.getElementById("close-notif-btn");
  const clearAllBtn = document.getElementById("notif-clear-all-btn");
  let notifFocusTrap = null;

  if (notifBtn && notifModal) {
    notifBtn.onclick = () => {
      notifModal.classList.add("active");
      if (!notifFocusTrap) notifFocusTrap = new FocusTrap(notifModal);
      notifFocusTrap.activate();
      state.unreadNotifCount = 0;
      updateNotifBadge();
      renderNotificationsList();
    };
  }

  const dismiss = () => {
    if (notifModal) {
      notifModal.classList.remove("active");
      if (notifFocusTrap) notifFocusTrap.deactivate();
    }
  };

  if (closeX) closeX.onclick = dismiss;
  if (closeBtn) closeBtn.onclick = dismiss;

  if (clearAllBtn) {
    clearAllBtn.onclick = () => {
      state.notifications = [];
      state.unreadNotifCount = 0;
      updateNotifBadge();
      renderNotificationsList();
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SHORTCUT CUSTOMIZATION — Sprint 9.6
// ═══════════════════════════════════════════════════════════════════════════
function _scFormatKeys(keys) {
  return keys.map((k) => '<kbd style="font-size:0.7rem;padding:2px 6px;border:1px solid rgba(255,255,255,0.15);border-radius:4px;background:rgba(255,255,255,0.06);font-family:var(--font-mono)">' + escapeHtml(k) + '</kbd>').join(" + ");
}

function _scBuildShortcutRow(sc, overrides, table) {
  const effectiveKeys = overrides[sc.action] || sc.keys;
  const isCustom = !!overrides[sc.action];
  const row = document.createElement("div");
  row.className = "shortcut-row-custom";
  row.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer;border:1px solid transparent;transition:background 0.12s,border-color 0.12s;";
  const actionSpan = document.createElement("span");
  actionSpan.style.cssText = "flex:1;font-size:0.78rem;color:rgba(255,255,255,0.7);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
  actionSpan.textContent = sc.action;
  if (sc.scope !== "global") {
    const scope = document.createElement("span");
    scope.style.cssText = "font-size:0.65rem;opacity:0.4;margin-left:6px;font-family:var(--font-mono)";
    scope.textContent = "[" + sc.scope + "]";
    actionSpan.appendChild(scope);
  }
  const keysSpan = document.createElement("span");
  keysSpan.style.cssText = "display:flex;gap:3px;align-items:center;flex-shrink:0;";
  keysSpan.innerHTML = _scFormatKeys(effectiveKeys);
  if (isCustom) {
    const badge = document.createElement("span");
    badge.style.cssText = "font-size:0.6rem;color:var(--warning-color);margin-left:4px;opacity:0.8;";
    badge.textContent = "✎";
    keysSpan.appendChild(badge);
  }
  const resetBtn = document.createElement("button");
  resetBtn.style.cssText = "background:transparent;border:none;color:rgba(255,255,255,0.3);cursor:pointer;padding:2px 5px;border-radius:4px;font-size:0.65rem;display:" + (isCustom ? "block" : "none") + ";";
  resetBtn.title = "Reset to default"; resetBtn.textContent = "↺";
  resetBtn.addEventListener("click", (e) => { e.stopPropagation(); resetShortcutOverride(sc.action); _scRenderTable(table); });
  row.append(actionSpan, keysSpan, resetBtn);
  row.addEventListener("click", () => {
    row.style.background = "rgba(var(--accent-rgb),0.1)";
    row.style.borderColor = "rgba(var(--accent-rgb),0.3)";
    keysSpan.innerHTML = '<span style="font-size:0.72rem;color:var(--accent-color);font-family:var(--font-mono)">Press keys…</span>';
    const onKey = (e) => {
      if (e.key === "Escape") { document.removeEventListener("keydown", onKey, true); _scRenderTable(table); return; }
      const keys = [];
      if (e.ctrlKey || e.metaKey) keys.push("Ctrl");
      if (e.shiftKey) keys.push("Shift");
      if (e.altKey) keys.push("Alt");
      if (!["Control","Shift","Alt","Meta"].includes(e.key)) keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      if (keys.length > 0 && !keys.every((k) => ["Ctrl","Shift","Alt"].includes(k))) { e.preventDefault(); e.stopPropagation(); document.removeEventListener("keydown", onKey, true); saveShortcutOverride(sc.action, keys); _scRenderTable(table); }
    };
    document.addEventListener("keydown", onKey, true);
  });
  row.addEventListener("mouseenter", () => { row.style.background = "rgba(255,255,255,0.03)"; row.style.borderColor = "var(--border-color)"; });
  row.addEventListener("mouseleave", () => { row.style.background = ""; row.style.borderColor = "transparent"; });
  return row;
}

function _scRenderTable(table) {
  const overrides = getShortcutOverrides();
  table.innerHTML = "";
  KEYBOARD_SHORTCUTS.filter((s) => s.scope !== "radial" && s.scope !== "browser").forEach((sc) => table.appendChild(_scBuildShortcutRow(sc, overrides, table)));
}

function initShortcutCustomization() {
  const table = document.getElementById("shortcut-customization-table");
  if (!table) return;
  _scRenderTable(table);
}

function initShortcutsOverlay() {
  const overlay = document.getElementById("shortcuts-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeShortcutsOverlay();
    });
  }
  // Validate shortcut registry in development
  if (import.meta.env?.DEV) {
    import("./shortcuts.js").then((m) => {
      if (m.validateShortcuts) m.validateShortcuts();
    });
  }
}

function initOsThemeSync() {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  function applyOsTheme(e) {
    // Map OS dark/light to nearest built-in theme
    const themeName = e.matches ? "BLACKSITE" : "SOLARIZED";
    invoke("set_theme", { name: themeName })
      .then((theme) => {
        if (theme) window.applyThemeColors(theme);
      })
      .catch(() => {});
  }
  // Only apply on first boot if user hasn't set a custom theme
  const userTheme = localStorage.getItem("neurodeckTheme");
  if (!userTheme && mql.matches !== undefined) {
    applyOsTheme(mql);
  }
  mql.addEventListener("change", (e) => {
    if (!localStorage.getItem("neurodeckTheme")) {
      applyOsTheme(e);
    }
  });
}

// --- GAME CONTEXT PANEL SYSTEM ---
function _gcApplyHeaderState(headerImg, fallbackEl, fallbackNameEl, appId, name) {
  if (!headerImg || !fallbackEl) return;
  const fallbackName = name || "No Active Game";
  if (fallbackNameEl) fallbackNameEl.innerText = fallbackName;
  if (!appId || appId === "-") {
    headerImg.removeAttribute("src");
    headerImg.style.display = "none";
    fallbackEl.classList.add("active");
    return;
  }
  fallbackEl.classList.remove("active");
  headerImg.style.display = "block";
  headerImg.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

function _gcHandleBadgeClick(gameBadge, gameModal, headerImg, fallbackEl, fallbackNameEl, gcCtx) {
  if (!gameBadge || !gameModal) return;
  gameBadge.onclick = () => {
    invoke("get_game_context")
      .then((ctx) => {
        const nameEl = document.getElementById("game-context-name");
        const appidEl = document.getElementById("game-context-appid");
        const statusEl = document.getElementById("game-context-status");
        const notesEl = document.getElementById("game-context-notes");
        const promptView = document.getElementById("game-context-prompt-view");
        const sessionNotesEl = document.getElementById("game-session-notes");

        const name = ctx.name || "None Detected";
        const appId = ctx.app_id || "-";
        const isRunning = ctx.is_running === "true";
        const notes = ctx.notes || "No optimization profile found.";

        if (nameEl) nameEl.innerText = name;
        if (appidEl) appidEl.innerText = appId;
        if (statusEl) {
          statusEl.innerText = isRunning ? "Running" : "Offline";
          statusEl.style.color = isRunning ? "var(--response-color)" : "rgba(255,255,255,0.4)";
        }
        if (notesEl) notesEl.innerText = notes;
        _gcApplyHeaderState(headerImg, fallbackEl, fallbackNameEl, appId, name);
        if (promptView) {
          promptView.value = `[Active SteamOS Game Context]\nThe user is currently playing the game: ${name} (Steam AppID: ${appId}).\nSteam Deck Optimization Notes: ${notes}\nPlease adapt your answers to help the user with this game if applicable, keeping their hardware context in mind.`;
        }
        if (sessionNotesEl && appId !== "-") {
          invoke("get_game_notes", { appId })
            .then((savedNotes) => { sessionNotesEl.value = savedNotes || ""; sessionNotesEl.dataset.appId = appId; })
            .catch(() => { sessionNotesEl.value = ""; sessionNotesEl.dataset.appId = appId; });
        }
        gameModal.classList.add("active");
        if (!gcCtx.trap) gcCtx.trap = new FocusTrap(gameModal);
        gcCtx.trap.activate();
      })
      .catch((err) => { console.error("Error loading game context panel:", err); });
  };
}

function initGameContextPanel() {
  const gameBadge = document.getElementById("game-badge");
  const gameModal = document.getElementById("game-context-modal");
  const closeX = document.getElementById("close-game-context-x");
  const closeBtn = document.getElementById("close-game-context");
  const headerImg = document.getElementById("game-context-header");
  const fallbackEl = document.getElementById("game-context-fallback");
  const fallbackNameEl = document.getElementById("game-context-fallback-name");
  const gcCtx = { trap: null };

  const dismiss = () => { if (gameModal) { gameModal.classList.remove("active"); if (gcCtx.trap) gcCtx.trap.deactivate(); } };

  if (headerImg && fallbackEl) {
    headerImg.addEventListener("load", () => { fallbackEl.classList.remove("active"); headerImg.style.display = "block"; });
    headerImg.addEventListener("error", () => { headerImg.style.display = "none"; fallbackEl.classList.add("active"); });
  }

  _gcHandleBadgeClick(gameBadge, gameModal, headerImg, fallbackEl, fallbackNameEl, gcCtx);

  const sessionNotesEl = document.getElementById("game-session-notes");
  const saveIndicator = document.getElementById("game-notes-save-indicator");
  if (sessionNotesEl) {
    sessionNotesEl.addEventListener("blur", () => {
      const appId = sessionNotesEl.dataset.appId;
      if (!appId || appId === "-") return;
      invoke("save_game_note", { appId, content: sessionNotesEl.value })
        .then(() => { if (saveIndicator) { saveIndicator.style.opacity = "1"; setTimeout(() => { saveIndicator.style.opacity = "0"; }, 1500); } })
        .catch((err) => { console.error("Failed to save game note:", err); });
    });
  }

  if (closeX) closeX.onclick = dismiss;
  if (closeBtn) closeBtn.onclick = dismiss;
  if (gameModal) gameModal.addEventListener("click", (e) => { if (e.target === gameModal) dismiss(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && gameModal?.classList.contains("active")) dismiss(); });
}

const _MANUAL_VIEW_MAPPING = {
  "chat": "chat", "canvas": "canvas", "terminal": "terminal",
  "ssh": "ssh", "tunnel": "tunnel", "share": "share", "browser": "browser",
  "agent": "agent", "memory": "memory", "prompt lab": "prompt-lab",
  "remote": "remote", "docs": "docs", "git": "git", "api lab": "api-lab",
  "cli maker": "cli-maker", "graph": "graph", "scheduler": "scheduler",
  "flow": "workflow", "ide": "ide", "settings": "settings",
  "plugins marketplace": "plugins", "prompt sidebar": "prompt-sidebar"
};

function _mmCloseManual(mmCtx) {
  mmCtx.modal.classList.remove("active");
  if (mmCtx.trap) mmCtx.trap.deactivate();
}

function _mmWireAccordions(contentContainer) {
  contentContainer.querySelectorAll(".manual-accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      const card = header.closest(".manual-accordion-card");
      const wasExpanded = card.classList.contains("expanded");
      contentContainer.querySelectorAll(".manual-accordion-card.expanded").forEach(otherCard => {
        if (otherCard !== card) {
          otherCard.classList.remove("expanded");
          otherCard.querySelector(".manual-accordion-header").setAttribute("aria-expanded", "false");
          otherCard.querySelector(".manual-accordion-body").style.maxHeight = null;
        }
      });
      card.classList.toggle("expanded", !wasExpanded);
      header.setAttribute("aria-expanded", !wasExpanded ? "true" : "false");
      const body = card.querySelector(".manual-accordion-body");
      body.style.maxHeight = !wasExpanded ? body.scrollHeight + "px" : null;
    });
  });
}

function _mmWireLaunchBtns(contentContainer, mmCtx) {
  contentContainer.querySelectorAll(".launch-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const vid = btn.getAttribute("data-view");
      _mmCloseManual(mmCtx);
      if (vid === "settings") { openSettingsModal(); }
      else if (vid === "plugins") { openSettingsModal(); setTimeout(() => activateSettingsPanel("sp-extensions"), 50); }
      else if (vid === "prompt-sidebar") { openCtrlPromptOverlay(); }
      else { const tab = document.querySelector('.nav-tab[data-view="' + vid + '"]'); if (tab) tab.click(); }
    });
  });
}

function _mmWireAiBtns(contentContainer, mmCtx) {
  contentContainer.querySelectorAll(".ai-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const feature = btn.getAttribute("data-feature");
      _mmCloseManual(mmCtx);
      const chatTab = document.querySelector('.nav-tab[data-view="chat"]');
      if (chatTab) chatTab.click();
      const chatInput = document.getElementById("user-input");
      if (chatInput) {
        chatInput.value = "How do I use the " + feature + " feature in NEURODECK?";
        chatInput.dispatchEvent(new Event("input", { bubbles: true }));
        chatInput.focus();
      }
    });
  });
}

function _mmBuildUI(contentContainer, mmCtx) {
  if (!contentContainer) return;
  const parts = manualContent.split(/\n##\s+/);
  const introMarkdown = parts[0];
  const sections = parts.slice(1);

  let html = '<div class="manual-intro-banner">' + marked.parse(introMarkdown) + '</div>';
  html += '<div class="manual-accordions-list">';

  sections.forEach((sec) => {
    const secLines = sec.split("\n");
    const headingLine = secLines[0].trim();
    const contentMarkdown = secLines.slice(1).join("\n").trim();
    const headingMatch = headingLine.match(/^(\d+)\.\s*([^\s]+)\s+(.*)$/);
    let number = "", emoji = "\u{1F4D6}", title = headingLine;
    if (headingMatch) { number = headingMatch[1]; emoji = headingMatch[2]; title = headingMatch[3]; }
    const cleanTitle = title.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9\s]/g, "").trim();
    const viewId = _MANUAL_VIEW_MAPPING[cleanTitle] || "";
    const renderedContent = marked.parse(contentMarkdown);
    html += `
      <div class="manual-accordion-card" data-title="${escapeHtml(title)}" data-content="${escapeHtml(contentMarkdown.toLowerCase())}">
        <button class="manual-accordion-header" aria-expanded="false">
          <span class="manual-header-emoji">${emoji}</span>
          <span class="manual-header-title"><span class="manual-header-num">${number}.</span> ${escapeHtml(title)}</span>
          <span class="manual-header-chevron">${createIcon("chevronDown", { size: 14 })}</span>
        </button>
        <div class="manual-accordion-body">
          <div class="manual-accordion-inner">
            <div class="manual-markdown-content">${renderedContent}</div>
            <div class="manual-actions-row">
              ${viewId ? `<button class="manual-action-btn launch-btn" data-view="${viewId}">${createIcon("externalLink", { size: 12 })}<span>Launch ${escapeHtml(title.replace(/\s*\(.*\)/g, ""))}</span></button>` : ""}
              <button class="manual-action-btn ai-btn" data-feature="${escapeHtml(title.replace(/\s*\(.*\)/g, ""))}">${createIcon("sparkles", { size: 12 })}<span>Ask AI</span></button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  contentContainer.innerHTML = html;
  _mmWireAccordions(contentContainer);
  _mmWireLaunchBtns(contentContainer, mmCtx);
  _mmWireAiBtns(contentContainer, mmCtx);
}

async function _mmRunHealthDiagnostics() {
  const ptyDot = document.getElementById("manual-health-pty");
  const netDot = document.getElementById("manual-health-net");
  const keyDot = document.getElementById("manual-health-key");
  const refreshBtn = document.getElementById("manual-health-refresh");
  if (!ptyDot || !netDot || !keyDot) return;
  ptyDot.className = "health-dot pending";
  netDot.className = "health-dot pending";
  keyDot.className = "health-dot pending";
  if (refreshBtn) refreshBtn.classList.add("spinning");
  try {
    const result = await invoke("run_onboarding_diagnostics");
    ptyDot.className = "health-dot " + (result.pty_ok ? "success" : "error");
    ptyDot.title = result.pty_details || (result.pty_ok ? "PTY working correctly" : "PTY failed");
    netDot.className = "health-dot " + (result.network_ok ? "success" : "error");
    netDot.title = result.network_details || (result.network_ok ? "Network working correctly" : "Network failed");
    keyDot.className = "health-dot " + (result.keychain_ok ? "success" : "error");
    keyDot.title = result.keychain_details || (result.keychain_ok ? "Keychain working correctly" : "Keychain failed");
  } catch (err) {
    console.error("Manual health diagnostics failed:", err);
    [ptyDot, netDot, keyDot].forEach(dot => { dot.className = "health-dot error"; dot.title = String(err); });
  } finally {
    if (refreshBtn) refreshBtn.classList.remove("spinning");
  }
}

function _mmWireSearch(searchInput, contentContainer) {
  if (!searchInput || !contentContainer) return;
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const introBanner = contentContainer.querySelector(".manual-intro-banner");
    if (introBanner) introBanner.style.display = query ? "none" : "";
    contentContainer.querySelectorAll(".manual-accordion-card").forEach(card => {
      const title = card.getAttribute("data-title").toLowerCase();
      const content = card.getAttribute("data-content");
      card.style.display = (title.includes(query) || content.includes(query)) ? "" : "none";
    });
  });
}

function initManualModal() {
  const manualBtn = document.getElementById("manual-btn");
  const manualModal = document.getElementById("manual-modal");
  const closeX = document.getElementById("close-manual-x");
  const closeBtn = document.getElementById("close-manual-btn");
  const contentContainer = document.getElementById("manual-content-container");
  if (!manualBtn || !manualModal) return;

  const mmCtx = { modal: manualModal, trap: null };

  manualBtn.addEventListener("click", () => {
    manualModal.classList.add("active");
    if (!mmCtx.trap) mmCtx.trap = new FocusTrap(manualModal);
    mmCtx.trap.activate();
    if (contentContainer && contentContainer.innerHTML.trim() === "") _mmBuildUI(contentContainer, mmCtx);
    _mmRunHealthDiagnostics();
  });

  const refreshBtn = document.getElementById("manual-health-refresh");
  if (refreshBtn) refreshBtn.addEventListener("click", _mmRunHealthDiagnostics);

  _mmWireSearch(document.getElementById("manual-search"), contentContainer);
  if (closeX) closeX.addEventListener("click", () => _mmCloseManual(mmCtx));
  if (closeBtn) closeBtn.addEventListener("click", () => _mmCloseManual(mmCtx));
}

/* --- SEPARATOR --- */

// --- PROMPT LAB (SPRINT 6/7) ---

// ── Prompt Lab: Formula Definitions (module-scope constant) ──────────────────
const PROMPT_LAB_FORMULAS = [
  { id: "default",  icon: "fileText",    label: "Default",  desc: "Standard structure: Persona → Task → Context → Constraints → Format." },
  { id: "aida",     icon: "messageSquare", label: "AIDA",   desc: "Attention, Interest, Desire, Action. Best for persuasive copy and marketing." },
  { id: "scqa",     icon: "search",      label: "SCQA",     desc: "Situation, Complication, Question, Answer. Ideal for consulting and structured analysis." },
  { id: "pastor",   icon: "sparkles",    label: "PASTOR",   desc: "Problem, Amplify, Story, Transformation, Offer, Response. Landing pages and pitches." },
  { id: "pas",      icon: "zap",         label: "PAS",      desc: "Problem, Agitate, Solution. Punchy copywriting that highlights pain points." },
  { id: "cot",      icon: "brain",       label: "CoT",      desc: "Chain of Thought. Decomposes complex reasoning step-by-step. Great for logic and code." },
  { id: "tot",      icon: "sparkles",    label: "ToT",      desc: "Tree of Thought. Branches, evaluates, and searches solution paths. Best for design." },
  { id: "star",     icon: "sparkles",    label: "STAR",     desc: "Situation, Task, Action, Result. Perfect for case studies and narrative examples." },
  { id: "rice",     icon: "chartColumn", label: "RICE",     desc: "Reach, Impact, Confidence, Effort. Structured prioritization and product decisions." },
  { id: "icio",     icon: "refreshCw",   label: "ICIO",     desc: "Input, Constraints, Instructions, Output. Precision engineering for technical tasks." },
  { id: "react",    icon: "bot",         label: "ReAct",    desc: "Reason + Act loop. Forces explicit reasoning before each action step. Agent tasks." },
  { id: "spin",     icon: "messageSquare", label: "SPIN",   desc: "Situation, Problem, Implication, Need-Payoff. Sales-grade interrogation framework." },
  { id: "rtf",      icon: "fileText",    label: "RTF",      desc: "Role, Task, Format. Ultra-minimal 3-part prompt for quick structured generation." },
  { id: "expert",   icon: "sparkles",    label: "Expert",   desc: "Expert persona activation with domain calibration, constraints, and output spec." },
  { id: "socratic", icon: "brain",       label: "Socratic", desc: "Guided discovery through questions. Forces the AI to reason by questioning assumptions." },
];

// ── Prompt Lab: Template Gallery Data (module-scope constant) ────────────────
const PROMPT_LAB_TEMPLATES = [
  {
    label: "Game Design",
    templates: [
      { title: "Endless Runner Concept", desc: "Mobile cyberpunk endless runner for kids 8-14", tag: "Game Dev",
        data: { persona: "You are a creative game designer.", task: "Design an endless runner game concept for mobile devices.", context: "Target audience: kids, ages 8-14. Theme: Cyberpunk.", tone: "Upbeat, energetic, and concise.", constraints: "- List 3 unique gameplay mechanics\n- Max 150 words total", format: "JSON with keys: title, mechanics, art_style", formula: "default" } },
      { title: "Roguelike Dungeon System", desc: "Procedural dungeon generation design doc", tag: "Game Dev",
        data: { persona: "You are a senior game systems designer.", task: "Design a procedural dungeon generation system for a 2D roguelike.", context: "Unity engine, pixel art aesthetic. Single dev project.", tone: "Technical and detailed.", constraints: "- Cover room types, corridors, and difficulty scaling\n- Include spawner logic", format: "Markdown with H2 sections", formula: "cot" } },
      { title: "Game Economy Balancer", desc: "Balance a free-to-play currency economy", tag: "F2P",
        data: { persona: "You are an expert game economist.", task: "Analyze and balance a free-to-play game economy with two currencies.", context: "Soft currency earned via gameplay. Hard currency purchased. Retention focus.", tone: "Analytical, structured.", constraints: "- Avoid pay-to-win\n- Include daily login bonuses and event structures", format: "Table + written rationale", formula: "rice" } },
    ],
  },
  {
    label: "Engineering",
    templates: [
      { title: "Lua Script Template", desc: "Extract email addresses from text with Lua", tag: "Lua",
        data: { persona: "You are a senior Lua developer.", task: "Write a Lua script that parses a string and extracts all email addresses.", context: "Data processing pipeline. No external libraries.", tone: "Technical and precise.", constraints: "- Comment the regex\n- Single function: extract_emails(text)", format: "Lua code block only", formula: "default" } },
      { title: "Rust API Endpoint", desc: "Design a RESTful endpoint in Tauri/Axum", tag: "Rust",
        data: { persona: "You are a Rust systems engineer.", task: "Design a REST API endpoint for user authentication with JWT.", context: "Tauri desktop app. Axum framework. Async Rust.", tone: "Precise, security-conscious.", constraints: "- Include error handling\n- Use map_err, no unwrap()\n- Include request/response types", format: "Complete Rust code with types", formula: "icio" } },
      { title: "SQL Query Optimizer", desc: "Optimize a slow database query", tag: "SQL",
        data: { persona: "You are a database performance engineer.", task: "Analyze and optimize a slow SQL query for a user activity dashboard.", context: "PostgreSQL 15. Table has 10M+ rows. No query cache.", tone: "Technical, explanatory.", constraints: "- Explain each optimization\n- Show EXPLAIN ANALYZE output interpretation", format: "SQL + Markdown explanation", formula: "scqa" } },
      { title: "Code Review Checklist", desc: "Generate a thorough code review", tag: "DevOps",
        data: { persona: "You are a senior software engineer and CISO.", task: "Review the following code for bugs, security vulnerabilities, and performance issues.", context: "Production Rust/TypeScript codebase. Solo developer.", tone: "Methodical, constructive.", constraints: "- Prioritize by severity (Critical > High > Medium)\n- Include fix suggestions", format: "Markdown table with columns: Issue, Severity, Fix", formula: "expert" } },
    ],
  },
  {
    label: "Product & Strategy",
    templates: [
      { title: "Product Feature List", desc: "Minimalist to-do app feature breakdown", tag: "Product",
        data: { persona: "You are an expert product manager.", task: "Create a feature list for a minimalist To-Do list app.", context: "Target: busy professionals who hate complexity.", tone: "Professional and structured.", constraints: "- Exactly 5 features\n- Short name + 1 sentence description each", format: "Markdown bulleted list", formula: "default" } },
      { title: "Competitive Analysis", desc: "SCQA-structured competitor teardown", tag: "Strategy",
        data: { persona: "You are a strategic consultant.", task: "Analyze the competitive landscape for a solo-dev AI terminal app.", context: "Competitors: GitHub Copilot CLI, Cursor, Warp terminal.", tone: "Executive, data-driven.", constraints: "- Focus on gaps and opportunities\n- Max 400 words", format: "Markdown with SWOT table", formula: "scqa" } },
      { title: "Sprint Backlog Generator", desc: "Convert a feature idea into sprint tasks", tag: "Agile",
        data: { persona: "You are an Agile coach and staff engineer.", task: "Convert a feature description into a prioritized sprint backlog.", context: "Solo developer, 2-week sprints, Tauri desktop app.", tone: "Structured, actionable.", constraints: "- Max 8 tasks\n- Include acceptance criteria per task\n- Mark dependencies", format: "Markdown checklist with AC and deps", formula: "rice" } },
    ],
  },
  {
    label: "✍️ Content & Copy",
    templates: [
      { title: "Landing Page Hero Copy", desc: "AIDA-structured hero section for a SaaS", tag: "Marketing",
        data: { persona: "You are a world-class conversion copywriter.", task: "Write hero section copy for a solo-dev AI terminal application.", context: "Product: NEURODECK — AI-native terminal OS for Steam Deck.", tone: "Bold, energetic, technical-cool.", constraints: "- Headline ≤12 words\n- Subheadline ≤25 words\n- 3 CTA variants", format: "Structured copy block", formula: "aida" } },
      { title: "Tech Blog Post Outline", desc: "Structured outline for a technical article", tag: "Content",
        data: { persona: "You are a senior developer and technical writer.", task: "Create a detailed outline for a blog post about building a Tauri desktop app.", context: "Target audience: intermediate Rust developers.", tone: "Educational, engaging.", constraints: "- 6-8 sections\n- Include code snippet placeholders\n- End with key takeaways", format: "Markdown H2/H3 outline", formula: "star" } },
      { title: "Cold Email Sequence", desc: "3-email outreach sequence (SPIN framework)", tag: "Sales",
        data: { persona: "You are a B2B sales strategist.", task: "Write a 3-email cold outreach sequence for an indie dev selling a productivity tool.", context: "Target: CTOs and engineering leads at 10-50 person startups.", tone: "Professional, empathetic, direct.", constraints: "- Each email ≤150 words\n- Progressive value escalation\n- Clear CTAs", format: "Email 1 / Email 2 / Email 3 blocks", formula: "spin" } },
    ],
  },
  {
    label: "🧪 AI & Research",
    templates: [
      { title: "Socratic Reasoning Session", desc: "Guide AI through a problem via questions", tag: "Research",
        data: { persona: "You are a Socratic tutor.", task: "Guide me through understanding transformer attention mechanisms using only questions.", context: "I have intermediate ML knowledge but haven't built a transformer from scratch.", tone: "Patient, inquisitive, Socratic.", constraints: "- Never state answers directly\n- Ask only one question at a time\n- Build towards understanding", format: "Dialogue format", formula: "socratic" } },
      { title: "ReAct Agent Task", desc: "Multi-step reasoning + action agent prompt", tag: "Agents",
        data: { persona: "You are an autonomous AI agent.", task: "Research and summarize the latest developments in Rust async runtimes.", context: "I need a decision on whether to switch from tokio to async-std for a new project.", tone: "Methodical, evidence-based.", constraints: "- Show Thought/Action/Observation steps\n- Cite sources\n- End with Recommendation", format: "ReAct trace + Final Answer", formula: "react" } },
      { title: "Dataset Generation Prompt", desc: "Generate synthetic training data", tag: "ML",
        data: { persona: "You are an ML data engineer.", task: "Generate 20 synthetic question-answer pairs for fine-tuning a coding assistant.", context: "Focus on Rust error handling patterns. Difficulty: intermediate to advanced.", tone: "Technical, precise.", constraints: "- Diverse error types (Result, Option, ?, panic)\n- Realistic code snippets\n- Include edge cases", format: "JSONL with fields: question, answer, difficulty", formula: "icio" } },
    ],
  },
];

// ── Prompt Lab: Pure helpers (module-scope) ───────────────────────────────────

function _plTokenCount(tokenCounter, text) {
  if (!tokenCounter) return;
  const tokens = Math.ceil((text || "").length / 4);
  tokenCounter.textContent = `~${tokens} tokens`;
  tokenCounter.classList.toggle("warn", tokens > 1500 && tokens <= 3000);
  tokenCounter.classList.toggle("high", tokens > 3000);
}

function _plGetSchema(ctx) {
  return {
    persona:     ctx.personaInput.value.trim(),
    task:        ctx.taskInput.value.trim(),
    context:     ctx.contextInput.value.trim(),
    tone:        ctx.toneInput.value.trim(),
    constraints: ctx.constraintsInput.value.trim(),
    format:      ctx.formatInput.value.trim(),
    examples:    ctx.examplesInput.value.trim(),
    formula:     ctx.formulaHidden.value,
  };
}

async function _plAssemblePrompt(ctx) {
  const { personaInput: pi, taskInput: ti, contextInput: ci, toneInput: ni,
          constraintsInput: ki, formatInput: fi, examplesInput: ei,
          formulaHidden, resultPrompt, tokenCounter } = ctx;
  const [persona, task, context, tone, constraints, format, examples, formula] =
    [pi.value, ti.value, ci.value, ni.value, ki.value, fi.value, ei.value, formulaHidden.value];
  try {
    const assembled = await invoke("assemble_prompt_via_lua_cmd",
      { persona, task, context, tone, constraints, format, examples, formula });
    resultPrompt.value = assembled;
    _plTokenCount(tokenCounter, assembled);
  } catch {
    const parts = [];
    if (persona.trim())     parts.push(`**Role/Persona:**\n${persona.trim()}`);
    if (task.trim())        parts.push(`**Task/Objective:**\n${task.trim()}`);
    if (context.trim())     parts.push(`**Context/Background:**\n${context.trim()}`);
    if (tone.trim())        parts.push(`**Tone/Style:**\n${tone.trim()}`);
    if (constraints.trim()) parts.push(`**Constraints:**\n${constraints.trim()}`);
    if (format.trim())      parts.push(`**Output Format:**\n${format.trim()}`);
    const fallback = parts.join("\n\n");
    resultPrompt.value = fallback;
    _plTokenCount(tokenCounter, fallback);
  }
}

function _plUpdateStrength(ctx) {
  const { personaInput, taskInput, contextInput, toneInput,
          constraintsInput, formatInput, strengthBarFill, strengthLabel } = ctx;
  let score = 0;
  if (personaInput.value.trim().length > 5)     score++;
  if (taskInput.value.trim().length > 5)         score++;
  if (contextInput.value.trim().length > 5)      score++;
  if (toneInput.value.trim().length > 2)         score++;
  if (constraintsInput.value.trim().length > 5 ||
      formatInput.value.trim().length > 5)       score++;
  if (!strengthBarFill) return;
  strengthBarFill.style.width = (score / 5) * 100 + "%";
  if (score <= 2) {
    strengthBarFill.style.background = "var(--error-color)";
    if (strengthLabel) { strengthLabel.style.color = "var(--error-color)";   strengthLabel.textContent = `Weak (${score}/5)`; }
  } else if (score <= 4) {
    strengthBarFill.style.background = "var(--accent-color)";
    if (strengthLabel) { strengthLabel.style.color = "var(--accent-color)";  strengthLabel.textContent = `Moderate (${score}/5)`; }
  } else {
    strengthBarFill.style.background = "var(--response-color)";
    if (strengthLabel) { strengthLabel.style.color = "var(--response-color)"; strengthLabel.textContent = `Optimized (${score}/5) ✨`; }
  }
}

function _plSelectFormula(id, ctx) {
  const { formulaHidden, formulaBadge, formulaInfo, formulaGrid } = ctx;
  formulaHidden.value = id;
  const f = PROMPT_LAB_FORMULAS.find((x) => x.id === id);
  if (formulaBadge) formulaBadge.textContent = f ? f.label : id.toUpperCase();
  if (formulaInfo)  formulaInfo.textContent  = f ? f.desc  : "";
  formulaGrid.querySelectorAll(".pl-formula-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.formulaId === id);
  });
  _plAssemblePrompt(ctx);
}

// ── Prompt Lab: Section initializers (module-scope) ───────────────────────────

function _plInitFormulaSection(ctx) {
  const { formulaGrid } = ctx;
  if (!formulaGrid) return;
  formulaGrid.innerHTML = "";
  PROMPT_LAB_FORMULAS.forEach((f) => {
    const card = document.createElement("div");
    card.className = "pl-formula-card" + (f.id === "default" ? " active" : "");
    card.dataset.formulaId = f.id;
    card.innerHTML = `<div class="pl-formula-card-icon">${createIcon(f.icon, { size: 18 })}</div>` +
                     `<div class="pl-formula-card-label">${f.label}</div>`;
    card.addEventListener("click", () => _plSelectFormula(f.id, ctx));
    formulaGrid.appendChild(card);
  });
}

function _plInitHistorySection(ctx) {
  const { historyBtn, historyDrawer, historyClear, historyList, resultPrompt, tokenCounter } = ctx;
  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = "";
    if (ctx.promptHistory.length === 0) {
      historyList.innerHTML = `<div style="padding:10px 12px;font-size:0.75rem;color:rgba(255,255,255,0.3)">No history yet.</div>`;
      return;
    }
    ctx.promptHistory.forEach((p, i) => {
      const el = document.createElement("div");
      el.className = "pl-history-item";
      el.innerHTML = `<div class="pl-history-item-meta">#${i + 1} · ${p.length} chars</div>` +
                     `${p.substring(0, 90)}${p.length > 90 ? "…" : ""}`;
      el.addEventListener("click", () => {
        resultPrompt.value = p;
        _plTokenCount(tokenCounter, p);
        historyDrawer.classList.add("hidden");
      });
      historyList.appendChild(el);
    });
  }
  ctx._renderHistory = renderHistory;
  if (historyBtn)   historyBtn.addEventListener("click",   () => historyDrawer.classList.toggle("hidden"));
  if (historyClear) historyClear.addEventListener("click", () => { ctx.promptHistory = []; renderHistory(); });
}

function _plInitGallerySection(ctx) {
  const { openGalleryBtn, galleryClose, galleryOverlay,
          gallerySearch, galleryBody, galleryDrawer } = ctx;

  function renderGallery(query) {
    if (!galleryBody) return;
    const q = query.toLowerCase().trim();
    galleryBody.innerHTML = "";
    PROMPT_LAB_TEMPLATES.forEach((cat) => {
      const filtered = q
        ? cat.templates.filter((t) =>
            t.title.toLowerCase().includes(q) ||
            t.desc.toLowerCase().includes(q) ||
            t.tag.toLowerCase().includes(q))
        : cat.templates;
      if (!filtered.length) return;
      const section = document.createElement("div");
      section.className = "pl-gallery-category";
      section.innerHTML = `<div class="pl-gallery-category-label">${cat.label}</div>`;
      filtered.forEach((tmpl) => {
        const card = document.createElement("div");
        card.className = "pl-gallery-card";
        card.innerHTML = `<div class="pl-gallery-card-title">${tmpl.title}<span class="pl-gallery-card-tag">${tmpl.tag}</span></div>` +
                         `<div class="pl-gallery-card-desc">${tmpl.desc}</div>`;
        card.addEventListener("click", () => _plApplyTemplate(tmpl.data, ctx, galleryDrawer));
        section.appendChild(card);
      });
      galleryBody.appendChild(section);
    });
    if (!galleryBody.children.length) {
      galleryBody.innerHTML = `<div style="padding:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:0.85rem">No templates match "${query}"</div>`;
    }
  }

  const openGallery  = () => {
    if (!galleryDrawer) return;
    galleryDrawer.classList.remove("hidden");
    renderGallery("");
    if (gallerySearch) { gallerySearch.value = ""; gallerySearch.focus(); }
  };
  const closeGallery = () => { if (galleryDrawer) galleryDrawer.classList.add("hidden"); };

  if (openGalleryBtn) openGalleryBtn.addEventListener("click", openGallery);
  if (galleryClose)   galleryClose.addEventListener("click", closeGallery);
  if (galleryOverlay) galleryOverlay.addEventListener("click", closeGallery);
  if (gallerySearch)  gallerySearch.addEventListener("input", (e) => renderGallery(e.target.value));
}

function _plApplyTemplate(data, ctx, galleryDrawer) {
  const { personaInput, taskInput, contextInput, toneInput,
          constraintsInput, formatInput, examplesInput } = ctx;
  if (personaInput)     personaInput.value     = data.persona     || "";
  if (taskInput)        taskInput.value        = data.task        || "";
  if (contextInput)     contextInput.value     = data.context     || "";
  if (toneInput)        toneInput.value        = data.tone        || "";
  if (constraintsInput) constraintsInput.value = data.constraints || "";
  if (formatInput)      formatInput.value      = data.format      || "";
  if (examplesInput)    examplesInput.value    = data.examples    || "";
  _plSelectFormula(data.formula || "default", ctx);
  _plAssemblePrompt(ctx);
  _plUpdateStrength(ctx);
  if (galleryDrawer) galleryDrawer.classList.add("hidden");
  addNotification("Prompt Lab", "Template loaded.", "success");
}

function _plInitChipsAndStrength(ctx) {
  document.querySelectorAll(".pl-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const target = document.getElementById(chip.dataset.target);
      if (!target) return;
      const val = chip.textContent.trim();
      target.value = target.value ? target.value.trimEnd() + ", " + val : val;
      _plAssemblePrompt(ctx);
      _plUpdateStrength(ctx);
    });
  });
}

function _plInitPresetSection(ctx) {
  const { togglePresetInputBtn, presetNameInput, savePresetBtn } = ctx;
  function refreshPresets() {
    invoke("load_prompt_presets")
      .then((p) => { ctx.loadedCustomPresets = p; })
      .catch((err) => console.error("Error loading presets:", err));
  }
  refreshPresets();
  if (togglePresetInputBtn) {
    togglePresetInputBtn.addEventListener("click", () => {
      if (presetNameInput.style.display === "none") {
        presetNameInput.style.display = "block";
        savePresetBtn.style.display   = "block";
        togglePresetInputBtn.textContent = "Cancel";
      } else {
        presetNameInput.style.display = "none";
        savePresetBtn.style.display   = "none";
        presetNameInput.value = "";
        togglePresetInputBtn.innerHTML = `${createIcon("upload", { size: 13 })}`;
      }
    });
  }
  if (savePresetBtn) {
    savePresetBtn.addEventListener("click", () => {
      const name = presetNameInput.value.trim();
      if (!name) { addNotification("Prompt Lab", "Enter a preset name.", "error"); return; }
      invoke("save_prompt_preset", { name, schemaJson: JSON.stringify(_plGetSchema(ctx)) })
        .then(() => {
          addNotification("Prompt Lab", `Preset "${name}" saved!`, "success");
          presetNameInput.style.display = "none";
          savePresetBtn.style.display   = "none";
          presetNameInput.value = "";
          togglePresetInputBtn.innerHTML = `${createIcon("upload", { size: 13 })}`;
          refreshPresets();
        })
        .catch((err) => addNotification("Prompt Lab", "Failed: " + err, "error"));
    });
  }
}

function _plInitAiOptimize(ctx) {
  const { optimizeAiBtn, personaInput, taskInput, contextInput,
          toneInput, constraintsInput, formatInput } = ctx;
  if (!optimizeAiBtn) return;
  optimizeAiBtn.addEventListener("click", async () => {
    if (!taskInput.value.trim()) { addNotification("Prompt Lab", "Add a task first.", "error"); return; }
    optimizeAiBtn.disabled = true;
    const orig = optimizeAiBtn.innerHTML;
    optimizeAiBtn.innerHTML = `${createIcon("zap", { size: 13 })}<span>Working...</span>`;
    try {
      const schema = await invoke("optimize_raw_prompt", { rawText: taskInput.value.trim() });
      personaInput.value     = schema.persona;
      taskInput.value        = schema.task;
      contextInput.value     = schema.context;
      toneInput.value        = schema.tone;
      constraintsInput.value = schema.constraints;
      formatInput.value      = schema.format;
      addNotification("Prompt Lab", "AI Optimization done!", "success");
      _plAssemblePrompt(ctx);
      _plUpdateStrength(ctx);
    } catch (err) {
      addNotification("Prompt Lab", "Optimization failed: " + err, "error");
    } finally {
      optimizeAiBtn.disabled  = false;
      optimizeAiBtn.innerHTML = orig;
    }
  });
}

function _plInitAssemblySection(ctx) {
  const { advancedToggle, advancedFields, generateBtn, resultPrompt,
          personaInput, taskInput, contextInput, toneInput,
          constraintsInput, formatInput, examplesInput } = ctx;
  if (advancedToggle) {
    advancedToggle.addEventListener("click", () => {
      advancedFields.classList.toggle("hidden");
      const hidden = advancedFields.classList.contains("hidden");
      advancedToggle.innerHTML = hidden
        ? `${createIcon("settings2", { size: 14 })}<span>Few-Shot Examples</span>`
        : `${createIcon("settings2", { size: 14 })}<span>Hide Examples</span>`;
    });
  }
  generateBtn.addEventListener("click", () => {
    _plAssemblePrompt(ctx).then(() => {
      const txt = resultPrompt.value;
      if (txt.trim() && ctx.promptHistory[0] !== txt) {
        ctx.promptHistory.unshift(txt);
        if (ctx.promptHistory.length > 20) ctx.promptHistory.pop();
        if (ctx._renderHistory) ctx._renderHistory();
      }
      addNotification("Prompt Lab", "Prompt generated.", "success");
    });
  });
  [personaInput, taskInput, contextInput, toneInput,
   constraintsInput, formatInput, examplesInput].forEach((el) => {
    el.addEventListener("input", () => { _plAssemblePrompt(ctx); _plUpdateStrength(ctx); });
  });
}

function _plInitJpeSection(ctx) {
  const { explainBtn, jpeLevelSelect, resultPrompt, resultJpe } = ctx;
  explainBtn.addEventListener("click", async () => {
    const text = resultPrompt.value.trim();
    if (!text) { addNotification("Prompt Lab", "Generate a prompt first.", "error"); return; }
    resultJpe.innerHTML = `<span class="pl-empty-text">Generating explanation…</span>`;
    explainBtn.disabled = true;
    const level = jpeLevelSelect ? jpeLevelSelect.value : "grade8";
    try {
      const explanation = await invoke("generate_jpe_explanation_with_level",
        { promptText: text, readingLevel: level });
      resultJpe.innerHTML = `<div class="jpe-content"></div>`;
      resultJpe.querySelector(".jpe-content").innerHTML =
        window.sanitizeHtml(explanation).replace(/\n/g, "<br>");
    } catch (err) {
      resultJpe.innerHTML = `<span class="pl-empty-text" style="color:var(--error-color)"></span>`;
      resultJpe.querySelector(".pl-empty-text").textContent = `Error: ${err}`;
      addNotification("Prompt Lab", "Explanation failed.", "error");
    } finally {
      explainBtn.disabled = false;
    }
  });
}

function _plInitOutputSection(ctx) {
  const { copyPromptBtn, copyJpeBtn, sendChatBtn,
          exportJsonBtn, exportLuaBtn, resultPrompt, resultJpe } = ctx;
  copyPromptBtn.addEventListener("click", () => {
    if (resultPrompt.value) {
      navigator.clipboard.writeText(resultPrompt.value);
      addNotification("Prompt Lab", "Prompt copied.", "success");
    }
  });
  copyJpeBtn.addEventListener("click", () => {
    if (resultJpe.innerText && !resultJpe.innerText.includes("Generate")) {
      navigator.clipboard.writeText(resultJpe.innerText);
      addNotification("Prompt Lab", "Explanation copied.", "success");
    }
  });
  sendChatBtn.addEventListener("click", () => {
    if (!resultPrompt.value) return;
    document.querySelector('.nav-tab[data-view="chat"]')?.click();
    const chatInput = document.getElementById("user-input");
    if (chatInput) {
      chatInput.value = resultPrompt.value;
      chatInput.focus();
      chatInput.style.height = "auto";
      chatInput.style.height = Math.min(chatInput.scrollHeight, 300) + "px";
      addNotification("Prompt Lab", "Prompt sent to Chat.", "info");
    }
  });
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", () => {
      if (!resultPrompt.value.trim()) { addNotification("Prompt Lab", "Generate first.", "error"); return; }
      navigator.clipboard.writeText(JSON.stringify({ ..._plGetSchema(ctx), assembled_prompt: resultPrompt.value }, null, 2));
      addNotification("Prompt Lab", "JSON Schema copied.", "success");
    });
  }
  if (exportLuaBtn) {
    exportLuaBtn.addEventListener("click", () => {
      if (!resultPrompt.value.trim()) { addNotification("Prompt Lab", "Generate first.", "error"); return; }
      const esc = resultPrompt.value
        .replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
      const lua = `-- S-Term Prompt Lab Macro\n-- ${new Date().toISOString()}\n` +
                  `local prompt = "${esc}"\nprint("[Macro] Sending prompt...")\n` +
                  `local response = sendPrompt(prompt)\nprint("[Macro] Response:")\nprint(response)\n`;
      navigator.clipboard.writeText(lua);
      addNotification("Prompt Lab", "Lua macro copied.", "success");
    });
  }
}

function _plBuildCtx() {
  return {
    generateBtn:          document.getElementById("pl-generate-btn"),
    explainBtn:           document.getElementById("pl-explain-jpe-btn"),
    copyPromptBtn:        document.getElementById("pl-copy-prompt-btn"),
    sendChatBtn:          document.getElementById("pl-send-chat-btn"),
    copyJpeBtn:           document.getElementById("pl-copy-jpe-btn"),
    personaInput:         document.getElementById("pl-persona"),
    taskInput:            document.getElementById("pl-task"),
    contextInput:         document.getElementById("pl-context"),
    toneInput:            document.getElementById("pl-tone"),
    constraintsInput:     document.getElementById("pl-constraints"),
    formatInput:          document.getElementById("pl-format"),
    examplesInput:        document.getElementById("pl-examples"),
    formulaHidden:        document.getElementById("pl-formula"),
    resultPrompt:         document.getElementById("pl-result-prompt"),
    resultJpe:            document.getElementById("pl-result-jpe"),
    advancedToggle:       document.getElementById("pl-advanced-toggle"),
    advancedFields:       document.getElementById("pl-advanced-fields"),
    optimizeAiBtn:        document.getElementById("pl-optimize-ai-btn"),
    jpeLevelSelect:       document.getElementById("pl-jpe-level-select"),
    savePresetBtn:        document.getElementById("pl-save-preset-btn"),
    togglePresetInputBtn: document.getElementById("pl-toggle-preset-input-btn"),
    presetNameInput:      document.getElementById("pl-preset-name"),
    exportJsonBtn:        document.getElementById("pl-export-json-btn"),
    exportLuaBtn:         document.getElementById("pl-export-lua-btn"),
    strengthBarFill:      document.getElementById("pl-strength-bar-fill"),
    strengthLabel:        document.getElementById("pl-strength-label"),
    tokenCounter:         document.getElementById("pl-token-counter"),
    formulaBadge:         document.getElementById("pl-formula-badge"),
    formulaGrid:          document.getElementById("pl-formula-grid"),
    formulaInfo:          document.getElementById("pl-formula-info"),
    historyBtn:           document.getElementById("pl-history-btn"),
    historyDrawer:        document.getElementById("pl-history-drawer"),
    historyClear:         document.getElementById("pl-history-clear"),
    historyList:          document.getElementById("pl-history-list"),
    openGalleryBtn:       document.getElementById("pl-open-gallery-btn"),
    galleryOverlay:       document.getElementById("pl-gallery-overlay"),
    galleryClose:         document.getElementById("pl-gallery-close"),
    galleryDrawer:        document.getElementById("pl-template-gallery"),
    galleryBody:          document.getElementById("pl-gallery-body"),
    gallerySearch:        document.getElementById("pl-gallery-search"),
    promptHistory: [],
    loadedCustomPresets: {},
    _renderHistory: null,
  };
}

function initPromptLab() {
  const ctx = _plBuildCtx();
  if (!ctx.generateBtn) return;

  _plInitFormulaSection(ctx);
  _plInitHistorySection(ctx);
  _plInitGallerySection(ctx);
  _plInitChipsAndStrength(ctx);
  _plInitPresetSection(ctx);
  _plInitAiOptimize(ctx);
  _plInitAssemblySection(ctx);
  _plInitJpeSection(ctx);
  _plInitOutputSection(ctx);
  _plUpdateStrength(ctx);
}

// Onboarding Wizard Implementation
async function checkOnboarding() {
  // Wait for the boot screen to finish — hard timeout (8s) so we never block forever
  await new Promise((resolve) => {
    if (!document.getElementById("boot-overlay")) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, 8000);
    document.addEventListener(
      "neurodeck-boot-complete",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

  try {
    const completed = localStorage.getItem("neurodeck_onboarding_complete");
    let geminiKey = "";
    try {
      geminiKey = await invoke("get_gemini_api_key");
    } catch (e) {
      console.warn("Failed to check gemini api key status on boot:", e);
    }
    const hasKey = geminiKey && geminiKey.trim().length > 0;

    if (!hasKey && completed !== "true") {
      showOnboardingWizard();
    }
  } catch (e) {
    console.error("Failed to check onboarding state:", e);
  }
}

async function showOnboardingWizard() {
  const overlay = document.createElement("div");
  overlay.id = "onboarding-overlay";
  overlay.className = "onboarding-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "onboarding-title");
  const onboardingFocusTrap = new FocusTrap(overlay);
  overlay.innerHTML = _obBuildHtml();
  document.getElementById("app").appendChild(overlay);
  onboardingFocusTrap.activate();

  const obs = {
    currentStep: 1, selectedProvider: "gemini-key", selectedPersona: "Default",
    selectedThemeName: "BLACKSITE", isProviderVerified: false,
    isDiagnosticsPassed: false, oauthPollAbortController: null,
    diagRunning: false, overlay, onboardingFocusTrap,
    btnPrev:     document.getElementById("ob-btn-prev"),
    btnNext:     document.getElementById("ob-btn-next"),
    logViewport: document.getElementById("ob-validation-log"),
  };
  obs.resetActiveState = (selector) => {
    document.querySelectorAll(selector).forEach((c) => {
      c.classList.remove("active");
      c.setAttribute("aria-pressed", "false");
    });
  };

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); if (obs.currentStep > 1) obs.btnPrev.click(); }
  });

  _obInitSlide1Animations();
  _obInitNavigation(obs);
  _obInitProviders(obs);
  _obInitVoice();
  await _obInitPersonaTheme(obs);
  _obUpdateStepUI(obs);
}

// ── Onboarding: HTML builder (module-scope) ───────────────────────────────────

function _obBuildHtml() {
  return `
        <div class="onboarding-container">
            <header class="onboarding-header">
                <h2 class="onboarding-title" id="onboarding-title">NEURODECK // INITIAL_BOOT_SETUP</h2>
                <div class="onboarding-steps-indicator" role="progressbar" aria-valuenow="1" aria-valuemin="1" aria-valuemax="11" aria-valuetext="Step 1 of 11" id="onboarding-progress">
                    <span class="onboarding-step-dot active" data-step="1"></span>
                    <span class="onboarding-step-dot" data-step="2"></span>
                    <span class="onboarding-step-dot" data-step="3"></span>
                    <span class="onboarding-step-dot" data-step="4"></span>
                    <span class="onboarding-step-dot" data-step="5"></span>
                    <span class="onboarding-step-dot" data-step="6"></span>
                    <span class="onboarding-step-dot" data-step="7"></span>
                    <span class="onboarding-step-dot" data-step="8"></span>
                    <span class="onboarding-step-dot" data-step="9"></span>
                    <span class="onboarding-step-dot" data-step="10"></span>
                    <span class="onboarding-step-dot" data-step="11"></span>
                </div>
            </header>
            <div class="onboarding-content">
                ${_obSlide1()}
                ${_obSlide2()}
                ${_obSlide3()}
                ${_obSlide4()}
                ${_obSlide5()}
                ${_obSlide6()}
                ${_obSlide7()}
                ${_obSlide8()}
                ${_obSlide9()}
                ${_obSlide10()}
                ${_obSlide11()}
            </div>
            <footer class="onboarding-footer">
                <button class="onboarding-btn secondary" id="ob-btn-prev" disabled>Back</button>
                <button class="onboarding-btn" id="ob-btn-next">Next</button>
            </footer>
        </div>
    `;
}

function _obSlide1() {
  return `
                <div class="onboarding-slide active" id="slide-1">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 8px;">WELCOME TO NEURODECK OS</h3>
                    <p class="onboarding-welcome-text" id="onboarding-welcome-typing" style="min-height: 2.5rem;"></p>
                    <div class="ob-stats-row">
                        <div class="ob-stat"><span class="ob-stat-number" id="ob-stat-features">0</span><span class="ob-stat-label">Features</span></div>
                        <div class="ob-stat"><span class="ob-stat-number" id="ob-stat-views">0</span><span class="ob-stat-label">Views</span></div>
                        <div class="ob-stat"><span class="ob-stat-number" id="ob-stat-deck">1</span><span class="ob-stat-label">Deck</span></div>
                    </div>
                    <div class="ob-tags">
                        <span class="ob-tag">AI Chat</span><span class="ob-tag">RAG Memory</span>
                        <span class="ob-tag">Live Canvas</span><span class="ob-tag">PTY Shell</span>
                        <span class="ob-tag">SSH Client</span><span class="ob-tag">Gamepad Native</span>
                        <span class="ob-tag">Gemini / Ollama</span><span class="ob-tag">Warpinator gRPC</span>
                        <span class="ob-tag">Lua Plugins</span><span class="ob-tag">Knowledge Base</span>
                        <span class="ob-tag">Prompt Lab</span><span class="ob-tag">1280×800</span>
                    </div>
                </div>`;
}

function _obSlide2() {
  const cards = [
    ["messageSquare","Chat","LLM streaming chat with RAG memory injection and game context awareness."],
    ["sparkles","Canvas","Live HTML/JS preview. Run Python, Bash, Lua. LAN collaboration mode."],
    ["squareTerminal","Terminal","Multi-session real shell. AI autocomplete Ctrl+Space. History search Ctrl+H."],
    ["server","SSH","Full SSH client. Password + key auth. Saved profiles. Session tab per connection."],
    ["route","Tunnel","TCP bridge between SteamOS Desktop Mode and Game Mode."],
    ["globe","Browser","Native WebView overlay. Speed-dial bookmarks, URL bar, DuckDuckGo search."],
    ["bot","Agent","5-step autonomous loop: plan → write → run → check → iterate. Roundtable mode."],
    ["brain","Memory","Vector DB with cosine similarity. RAG search + local doc indexing."],
    ["share2","Share","LAN P2P mDNS transfer. FTP/SFTP browser. Warpinator gRPC server."],
    ["sparkles","Prompt Lab","Visual prompt engineering studio. 7 formulas (AIDA, SCQA, CoT, ToT…). JPE explain mode."],
    ["panelRightOpen","Remote","iPhone WebSocket control. QR pairing. Send commands from Safari on your LAN."],
    ["fileText","Docs","Knowledge Base with semantic search. Index local folders and query documents via RAG embeddings."],
  ].map(([ic, name, desc], i) =>
    `<div class="ob-feature-card" style="animation-delay:${0.02 + i * 0.05}s">` +
    `<span class="ob-feature-icon">${createIcon(ic, { size: 18 })}</span>` +
    `<span class="ob-feature-name">${name}</span><span class="ob-feature-desc">${desc}</span></div>`
  ).join("");
  return `
                <div class="onboarding-slide" id="slide-2">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 4px;">SYSTEM_FEATURE_MANIFEST</h3>
                    <p style="font-size: 0.72rem; opacity: 0.7; margin: 0 0 12px;">12 integrated views. One fullscreen command center.</p>
                    <div class="ob-feature-grid">${cards}</div>
                </div>`;
}

function _obSlide3ProviderSetupPanels() {
  return `
                    <div id="container-gemini-key" class="provider-setup-container">
                        <div class="onboarding-input-wrapper">
                            <label for="ob-gemini-key">GEMINI API KEY</label>
                            <input type="password" id="ob-gemini-key" class="onboarding-input" placeholder="AIzaSy..." autocomplete="off">
                        </div>
                    </div>
                    <div id="container-gemini-oauth" class="provider-setup-container" style="display:none;text-align:center;">
                        <p style="font-size:0.8rem;margin-bottom:10px;">Scan the QR code or visit the link to log in:</p>
                        <div id="ob-oauth-qr-wrapper" style="background:white;padding:10px;display:inline-block;border-radius:6px;margin-bottom:10px;"><canvas id="ob-oauth-qr"></canvas></div>
                        <p id="ob-oauth-link-text" style="font-size:0.75rem;margin:5px 0;">Visit: <a href="#" id="ob-oauth-url" target="_blank" style="color:var(--accent-color);">Requesting...</a></p>
                        <div style="font-size:0.8rem;font-weight:bold;background:rgba(0,240,255,0.1);padding:8px;display:inline-block;border-radius:4px;" id="ob-oauth-code-box">CODE: ----</div>
                    </div>
                    <div id="container-kimi" class="provider-setup-container" style="display:none;">
                        <div class="onboarding-input-wrapper"><label for="ob-kimi-key">KIMI API KEY</label><input type="password" id="ob-kimi-key" class="onboarding-input" placeholder="sk-..." autocomplete="off"></div>
                        <div class="onboarding-input-wrapper"><label for="ob-kimi-model">KIMI MODEL</label><input type="text" id="ob-kimi-model" class="onboarding-input" value="kimi-k2.5" placeholder="e.g. kimi-k2.5, kimi-k2-turbo-preview"></div>
                    </div>
                    <div id="container-ollama" class="provider-setup-container" style="display:none;">
                        <div id="ob-ollama-install-banner" style="display:none;background:rgba(255,170,0,0.1);border:1px solid rgba(255,170,0,0.4);border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:0.75rem;">
                            <strong style="color:#ffaa00">Ollama not detected</strong><br>
                            <span style="opacity:0.85">Ollama must be installed and running before NEURODECK can use it locally.</span><br>
                            <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
                                <button class="onboarding-btn primary" id="ob-btn-install-ollama" style="font-size:0.72rem;padding:5px 12px;">Download Ollama Installer</button>
                                <button class="onboarding-btn secondary" id="ob-btn-recheck-ollama" style="font-size:0.72rem;padding:5px 12px;">Re-check</button>
                            </div>
                        </div>
                        <div class="onboarding-input-wrapper"><label for="ob-ollama-url">OLLAMA BASE URL</label><input type="text" id="ob-ollama-url" class="onboarding-input" value="http://localhost:11434"></div>
                        <div class="onboarding-input-wrapper"><label for="ob-ollama-model">OLLAMA MODEL NAME</label><input type="text" id="ob-ollama-model" class="onboarding-input" value="hermes3:8b" placeholder="e.g. hermes3:8b, llama3.2:1b, mistral"></div>
                        <div style="display:flex;gap:8px;margin-top:4px;align-items:center;flex-wrap:wrap;">
                            <button class="onboarding-btn secondary" id="ob-btn-pull-model" style="font-size:0.72rem;padding:5px 12px;">Pull Model Now</button>
                            <span id="ob-pull-status" style="font-size:0.7rem;opacity:0.75;"></span>
                        </div>
                    </div>`;
}

function _obSlide3() {
  return `
                <div class="onboarding-slide" id="slide-3">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 4px;">PROVIDER_AUTHENTICATION</h3>
                    <p style="font-size: 0.72rem; opacity: 0.7; margin: 0 0 10px;">Choose your LLM backend — powers Chat, Agent, RAG memory, and AI autocomplete.</p>
                    <div class="onboarding-choice-container" style="margin-bottom: 12px;">
                        <div class="onboarding-choice-card active" data-provider="gemini-key" role="button" tabindex="0" aria-pressed="true">
                            <span class="onboarding-choice-icon">${createIcon("shieldCheck", { size: 16 })}</span>
                            <span class="onboarding-choice-title">Gemini API Key</span>
                            <span class="onboarding-choice-desc">Manual entry of Google Gemini API key. Saved to secure OS keychain.</span>
                        </div>
                        <div class="onboarding-choice-card" data-provider="gemini-oauth" role="button" tabindex="0" aria-pressed="false">
                            <span class="onboarding-choice-icon">${createIcon("panelRightOpen", { size: 16 })}</span>
                            <span class="onboarding-choice-title">Google Login (QR)</span>
                            <span class="onboarding-choice-desc">Authenticate via device code grant. Scan QR code with your phone.</span>
                        </div>
                        <div class="onboarding-choice-card" data-provider="kimi" role="button" tabindex="0" aria-pressed="false">
                            <span class="onboarding-choice-icon">${createIcon("moon", { size: 16 })}</span>
                            <span class="onboarding-choice-title">Kimi (Moonshot)</span>
                            <span class="onboarding-choice-desc">Moonshot AI cloud models. Strong reasoning and ultra-long context.</span>
                        </div>
                        <div class="onboarding-choice-card" data-provider="ollama" role="button" tabindex="0" aria-pressed="false">
                            <span class="onboarding-choice-icon">${createIcon("server", { size: 16 })}</span>
                            <span class="onboarding-choice-title">Ollama (Offline)</span>
                            <span class="onboarding-choice-desc">Local Ollama server on Steam Deck. Completely offline operation.</span>
                        </div>
                    </div>
                    ${_obSlide3ProviderSetupPanels()}
                    <div class="onboarding-log-viewport" id="ob-validation-log"><div class="onboarding-log-line">[SYS] Awaiting input credentials...</div></div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
                        <button class="onboarding-btn secondary" id="ob-btn-skip-setup" style="opacity:0.7;font-size:0.72rem;">Skip — Configure Later</button>
                        <button class="onboarding-btn primary" id="ob-btn-verify">Verify & Save</button>
                    </div>
                </div>`;
}

function _obSlide4() {
  return `
                <div class="onboarding-slide" id="slide-4">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 5px;">PERSONA & THEME SELECT</h3>
                    <p style="font-size: 0.75rem; opacity: 0.8; margin-top: 0; margin-bottom: 12px;">Choose your default AI guide and look. Applies live in the background.</p>
                    <label style="font-size:0.75rem;color:rgba(255,255,255,0.6);margin-bottom:4px;display:block;">SELECT PERSONA</label>
                    <div class="onboarding-carousel" id="ob-persona-carousel"></div>
                    <label style="font-size:0.75rem;color:rgba(255,255,255,0.6);margin-bottom:6px;display:block;">SELECT THEME</label>
                    <div class="onboarding-theme-grid" id="ob-theme-grid"></div>
                </div>`;
}

function _obSlide5() {
  return `
                <div class="onboarding-slide" id="slide-5">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 8px;">CONTROLLER & GAMEPAD GUIDE</h3>
                    <p style="font-size: 0.75rem; opacity: 0.8; margin-top: 0; margin-bottom: 12px;">Full Steam Deck &amp; gamepad support is built-in. No configuration needed.</p>
                    <div class="ob-controller-grid">
                        <div class="ob-ctrl-section">
                            <div class="ob-ctrl-header">NAVIGATION</div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">D-Pad</span><span class="ob-ctrl-desc">Navigate lists, chat history, menus</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">L-Stick</span><span class="ob-ctrl-desc">Scroll chat / terminal output</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">L1 / R1</span><span class="ob-ctrl-desc">Previous / Next tab</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">L2 / R2</span><span class="ob-ctrl-desc">Open radial menu / Confirm action</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">SELECT</span><span class="ob-ctrl-desc">Toggle sidebar open/closed</span></div>
                        </div>
                        <div class="ob-ctrl-section">
                            <div class="ob-ctrl-header">ACTIONS</div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge ob-ctrl-a">A</span><span class="ob-ctrl-desc">Confirm / Select / Send message</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge ob-ctrl-b">B</span><span class="ob-ctrl-desc">Cancel / Back / Close overlay</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge ob-ctrl-x">X</span><span class="ob-ctrl-desc">Open prompt picker (ctrl prompt)</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge ob-ctrl-y">Y</span><span class="ob-ctrl-desc">Toggle virtual keyboard</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">START</span><span class="ob-ctrl-desc">New chat session</span></div>
                        </div>
                        <div class="ob-ctrl-section">
                            <div class="ob-ctrl-header">RADIAL MENU <span style="opacity:0.5;font-size:0.65rem;">(L2 or backtick)</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-desc" style="color:var(--accent-color);">12 quick-access views: Chat, Canvas, Terminal, SSH, Tunnel, Share, Browser, Agent, Memory, Prompt Lab, Remote, Docs</span></div>
                            <div class="ob-ctrl-header" style="margin-top:8px;">PROMPT PICKER <span style="opacity:0.5;font-size:0.65rem;">(X button)</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-desc" style="color:var(--accent-color);">Browse &amp; send AI prompts without typing. D-Pad to navigate, A to send, L1/R1 to switch categories.</span></div>
                        </div>
                    </div>
                    <div style="margin-top:10px;padding:8px;background:rgba(0,240,255,0.05);border:1px solid rgba(0,240,255,0.15);border-radius:6px;font-size:0.72rem;color:rgba(255,255,255,0.7);">
                        <strong style="color:var(--accent-color);">STEAM INPUT:</strong> For best gamepad experience activate the NEURODECK Steam Input profile via Steam → Controller Settings.
                    </div>
                </div>`;
}

function _obSlide6() {
  return `
                <div class="onboarding-slide" id="slide-6">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 4px;">TOUCH & GESTURE CONTROLS</h3>
                    <p style="font-size: 0.72rem; opacity: 0.7; margin: 0 0 12px;">Built for Steam Deck's 1280×800 touchscreen. No configuration needed.</p>
                    <div class="ob-touch-grid">
                        <div class="ob-touch-card"><div class="ob-touch-demo"><div class="ob-touch-tap-ring"></div></div><span class="ob-touch-name">Tap</span><span class="ob-touch-desc">Select buttons, tabs, and list items.</span></div>
                        <div class="ob-touch-card"><div class="ob-touch-demo"><div class="ob-touch-swipe-arrow"></div></div><span class="ob-touch-name">Swipe / Fling</span><span class="ob-touch-desc">Momentum scroll in chat, terminal, and lists.</span></div>
                        <div class="ob-touch-card"><div class="ob-touch-demo"><div class="ob-touch-kb-keys">ABC</div></div><span class="ob-touch-name">Virtual Keyboard</span><span class="ob-touch-desc">Tap any text field to open the QWERTY panel.</span></div>
                        <div class="ob-touch-card"><div class="ob-touch-demo"><div class="ob-touch-radial-seg"></div></div><span class="ob-touch-name">Radial Menu</span><span class="ob-touch-desc">Tap a segment to jump directly to a view.</span></div>
                    </div>
                    <div class="ob-touch-practice">
                        <button class="onboarding-btn primary" id="ob-btn-try-radial">
                            ${createIcon("gamepad2", { size: 16 })} Try the Radial Menu
                        </button>
                        <p style="font-size:0.7rem;opacity:0.6;margin:8px 0 0;">
                            Press <kbd style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:3px;font-family:inherit;">\`</kbd> or tap the button above
                        </p>
                    </div>
                </div>`;
}

function _obSlide7() {
  return `
                <div class="onboarding-slide" id="slide-7">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 4px;">VOICE I/O CALIBRATION</h3>
                    <p style="font-size: 0.72rem; opacity: 0.7; margin: 0 0 12px;">Test your microphone and text-to-speech engine. Both are optional.</p>
                    <div class="ob-voice-grid">
                        <div class="ob-voice-card">
                            <div class="ob-voice-demo"><div class="ob-voice-waveform" id="ob-mic-waveform"><span></span><span></span><span></span><span></span><span></span></div></div>
                            <span class="ob-voice-name">Microphone</span>
                            <span class="ob-voice-desc" id="ob-mic-status">Tap record and speak for 3 seconds.</span>
                            <button class="onboarding-btn secondary" id="ob-btn-test-mic" style="margin-top:8px;font-size:0.72rem;padding:6px 14px;">${createIcon("mic", { size: 14 })} Test Mic</button>
                            <div class="ob-voice-result" id="ob-mic-result"></div>
                        </div>
                        <div class="ob-voice-card">
                            <div class="ob-voice-demo"><div class="ob-voice-speaker" id="ob-tts-speaker"><div class="ob-voice-speaker-cone"></div></div></div>
                            <span class="ob-voice-name">Text-to-Speech</span>
                            <span class="ob-voice-desc" id="ob-tts-status">Tap to hear a sample phrase.</span>
                            <button class="onboarding-btn secondary" id="ob-btn-test-tts" style="margin-top:8px;font-size:0.72rem;padding:6px 14px;">${createIcon("volume2", { size: 14 })} Test TTS</button>
                            <div class="ob-voice-result" id="ob-tts-result"></div>
                        </div>
                    </div>
                </div>`;
}

function _obSlide8() {
  const cards = [
    ["shieldCheck","OS Keychain","API keys live in your OS secure store — never on disk as plain text."],
    ["globe","Offline Ready","Ollama runs entirely on-device with zero network access."],
    ["x","No Telemetry","No analytics, crash reporters, or remote logging. Ever."],
    ["server","MCP Auth","Tool-server connections require a Bearer token with constant-time validation."],
    ["brain","Local RAG","Embeddings and chat history persist only on your local disk."],
    ["zap","CSP Hardened","Content Security Policy blocks inline scripts and restricts network origins."],
  ].map(([ic, name, desc]) =>
    `<div class="ob-sec-card"><div class="ob-sec-icon">${createIcon(ic, { size: 20 })}</div>` +
    `<span class="ob-sec-name">${name}</span><span class="ob-sec-desc">${desc}</span></div>`
  ).join("");
  return `
                <div class="onboarding-slide" id="slide-8">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 4px;">TRUST & PRIVACY</h3>
                    <p style="font-size: 0.72rem; opacity: 0.7; margin: 0 0 12px;">Your data stays local. No telemetry. No cloud lock-in.</p>
                    <div class="ob-sec-grid">${cards}</div>
                    <div class="ob-sec-footer"><strong style="color:var(--accent-color);">NEURODECK is local-first by design.</strong><br>Your conversations, documents, and credentials never leave this device unless you explicitly choose a cloud LLM provider.</div>
                </div>`;
}

function _obSlide9() {
  return `
                <div class="onboarding-slide" id="slide-9">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 4px;">LOCAL SANDBOXING & BOUNDARIES</h3>
                    <p style="font-size: 0.72rem; opacity: 0.7; margin: 0 0 12px;">Understand what the Agent and Terminal can access on your system.</p>
                    <div class="ob-sandbox-grid">
                        <div class="ob-sandbox-card"><div class="ob-sandbox-icon">${createIcon("folderTree", { size: 24 })}</div><span class="ob-sandbox-name">Workspace Sandboxing</span><span class="ob-sandbox-desc">By default, the AI Agent operates strictly within the current workspace directory. It cannot read or modify files outside this boundary without explicit user elevation.</span></div>
                        <div class="ob-sandbox-card"><div class="ob-sandbox-icon">${createIcon("squareTerminal", { size: 24 })}</div><span class="ob-sandbox-name">PTY Terminal Access</span><span class="ob-sandbox-desc">The Terminal view is a real PTY shell. Commands you execute here run with your user account privileges. The AI can propose commands, but you must approve them.</span></div>
                        <div class="ob-sandbox-card"><div class="ob-sandbox-icon">${createIcon("shieldAlert", { size: 24 })}</div><span class="ob-sandbox-name">Execution Pauses</span><span class="ob-sandbox-desc">When the autonomous Agent attempts to run a potentially destructive command (e.g. deletion, global installs), it will pause and request human-in-the-loop approval.</span></div>
                    </div>
                    <div class="ob-sec-footer" style="margin-top:16px;"><strong style="color:var(--accent-color);">Your system, your rules.</strong><br>Review the Trust &amp; Safety center in Settings anytime to audit data handling and permissions.</div>
                </div>`;
}

function _obSlide10() {
  const rows = [
    ["plusCircle","Plugin Marketplace","One-click install Lua plugins from the community registry."],
    ["users","Canvas Collaboration","Host or join a live coding session over your LAN."],
    ["zap","AI Terminal Autocomplete","Ctrl+Space ghost-text completion in any PTY session."],
    ["clock3","AI History Search","Ctrl+H semantic search across bash/zsh/fish history."],
    ["gamepad2","Game-Aware Mode","Auto-detects your Steam game and injects optimization context."],
    ["columns","Model Switcher","Compare Gemini vs Ollama outputs side-by-side in chat."],
    ["search","Command Palette","Ctrl+K for instant navigation to any tab or settings panel."],
    ["folderOpen","Document Indexing","Point at a folder — embeddings generate in one click."],
    ["bot","Cinematic Boot","Animated startup sequence showing real system state."],
    ["squareTerminal","Virtual Keyboard","Full QWERTY overlay with sticky modifiers for touch."],
  ].map(([ic, name, desc]) =>
    `<div class="ob-deep-row"><div class="ob-deep-icon">${createIcon(ic, { size: 14 })}</div>` +
    `<div class="ob-deep-text"><span class="ob-deep-name">${name}</span><span class="ob-deep-desc">${desc}</span></div></div>`
  ).join("");
  return `
                <div class="onboarding-slide" id="slide-10">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 4px;">POWER USER TOOLKIT</h3>
                    <p style="font-size: 0.72rem; opacity: 0.7; margin: 0 0 12px;">Capabilities that make NEURODECK more than a chat app.</p>
                    <div class="ob-deep-grid">${rows}</div>
                </div>`;
}

function _obSlide11() {
  return `
                <div class="onboarding-slide" id="slide-11">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 10px;">FINAL SYSTEM CHECK</h3>
                    <div class="onboarding-diagnostic-list">
                        <div class="onboarding-diagnostic-item"><div class="onboarding-diagnostic-label"><span class="onboarding-diagnostic-icon">${createIcon("squareTerminal", { size: 16 })}</span><span>PTY Shell Spawning Subsystem</span></div><span class="onboarding-diagnostic-status pending" id="ob-diag-pty">PENDING</span></div>
                        <div class="onboarding-diagnostic-item"><div class="onboarding-diagnostic-label"><span class="onboarding-diagnostic-icon">${createIcon("globe", { size: 16 })}</span><span>External LLM Network Endpoint Reachability</span></div><span class="onboarding-diagnostic-status pending" id="ob-diag-net">PENDING</span></div>
                        <div class="onboarding-diagnostic-item"><div class="onboarding-diagnostic-label"><span class="onboarding-diagnostic-icon">${createIcon("shieldCheck", { size: 16 })}</span><span>OS Keychain Secure Storage Access</span></div><span class="onboarding-diagnostic-status pending" id="ob-diag-key">PENDING</span></div>
                        <div class="onboarding-diagnostic-item"><div class="onboarding-diagnostic-label"><span class="onboarding-diagnostic-icon">${createIcon("mic", { size: 16 })}</span><span>Audio Capture (arecord / Voice STT)</span></div><span class="onboarding-diagnostic-status pending" id="ob-diag-audio">PENDING</span></div>
                        <div class="onboarding-diagnostic-item"><div class="onboarding-diagnostic-label"><span class="onboarding-diagnostic-icon">${createIcon("server", { size: 16 })}</span><span>SSH Binary (OpenSSH Client)</span></div><span class="onboarding-diagnostic-status pending" id="ob-diag-ssh">PENDING</span></div>
                        <div class="onboarding-diagnostic-item"><div class="onboarding-diagnostic-label"><span class="onboarding-diagnostic-icon">${createIcon("volume2", { size: 16 })}</span><span>TTS Engine (espeak / Voice Output)</span></div><span class="onboarding-diagnostic-status pending" id="ob-diag-tts">PENDING</span></div>
                    </div>
                    <div class="onboarding-log-viewport" id="ob-diagnostic-log" style="height:100px;max-height:100px;margin-top:8px;">
                        <div class="onboarding-log-line">[SYS] Initializing diagnostic scans...</div>
                    </div>
                </div>`;
}

// ── Onboarding: Logic helpers (module-scope) ──────────────────────────────────

function _obAppendLog(viewport, text, isError = false) {
  const line = document.createElement("div");
  line.className = "onboarding-log-line";
  line.style.color = isError ? "var(--error-color)" : "var(--response-color)";
  line.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
  viewport.appendChild(line);
  viewport.scrollTop = viewport.scrollHeight;
}

function _obUpdateStepUI(obs) {
  const { btnPrev, btnNext } = obs;
  document.querySelectorAll(".onboarding-slide").forEach((slide, idx) => {
    slide.classList.toggle("active", idx + 1 === obs.currentStep);
  });
  document.querySelectorAll(".onboarding-step-dot").forEach((dot, idx) => {
    const n = idx + 1;
    dot.classList.toggle("active",    n === obs.currentStep);
    dot.classList.toggle("completed", n < obs.currentStep);
  });
  const progressEl = document.getElementById("onboarding-progress");
  if (progressEl) {
    progressEl.setAttribute("aria-valuenow",   obs.currentStep);
    progressEl.setAttribute("aria-valuetext", `Step ${obs.currentStep} of 11`);
  }
  btnPrev.disabled = obs.currentStep === 1;
  if (obs.currentStep === 11) {
    btnNext.innerText = "Launch NEURODECK";
    btnNext.classList.add("primary");
    btnNext.disabled = !obs.isDiagnosticsPassed;
    _obRunDiagnostics(obs);
  } else {
    btnNext.innerText = "Next";
    btnNext.classList.remove("primary");
    const needsVerify = obs.currentStep === 3 && !obs.isProviderVerified && obs.selectedProvider !== "ollama";
    btnNext.disabled = needsVerify;
  }
}

function _obInitSlide1Animations() {
  const welcomeText = "NEURODECK is a fullscreen AI OS for Steam Deck. LLM chat, autonomous agent, live canvas, real shell, SSH client, browser, Prompt Lab, vector memory, and a Lua plugin marketplace — all in one 1280×800 window.";
  const typingEl = document.getElementById("onboarding-welcome-typing");
  let charIdx = 0;
  function typeChar() {
    if (charIdx < welcomeText.length) {
      typingEl.textContent += welcomeText.charAt(charIdx++);
      setTimeout(typeChar, 22);
    }
  }
  typeChar();
  function animateCounter(el, target, duration) {
    let start = 0;
    const step = Math.ceil(target / (duration / 40));
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      el.textContent = start;
      if (start >= target) clearInterval(timer);
    }, 40);
  }
  setTimeout(() => {
    animateCounter(document.getElementById("ob-stat-features"), 56, 900);
    animateCounter(document.getElementById("ob-stat-views"), 12, 600);
  }, 300);
}

function _obFocusFirstInSlide(step) {
  const slide = document.getElementById(`slide-${step}`);
  if (!slide) return;
  const focusable = slide.querySelector(
    'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  );
  if (focusable) focusable.focus({ preventScroll: true });
}

function _obInitNavigation(obs) {
  const { btnPrev, btnNext, overlay, onboardingFocusTrap } = obs;
  btnPrev.onclick = () => {
    if (obs.oauthPollAbortController) { obs.oauthPollAbortController.abort(); obs.oauthPollAbortController = null; }
    if (obs.currentStep > 1) { obs.currentStep--; _obUpdateStepUI(obs); _obFocusFirstInSlide(obs.currentStep); }
  };
  btnNext.onclick = () => {
    if (obs.currentStep === 11) {
      localStorage.setItem("neurodeck_onboarding_complete", "true");
      onboardingFocusTrap.deactivate();
      overlay.classList.add("hidden");
      setTimeout(() => {
        overlay.remove();
        const termInput = document.getElementById("user-input");
        if (termInput) termInput.focus();
      }, 500);
      addNotification("System Initialized", "Welcome to NEURODECK OS.", "success");
    } else {
      obs.currentStep++;
      _obUpdateStepUI(obs);
      _obFocusFirstInSlide(obs.currentStep);
    }
  };
  document.getElementById("ob-btn-skip-setup").onclick = () => {
    obs.logViewport.innerHTML = `<div class="onboarding-log-line" style="color:var(--warning-color)">[SYS] Provider setup skipped. Configure via Settings → LLM Config later.</div>`;
    obs.isProviderVerified = true;
    btnNext.disabled = false;
    btnNext.click();
  };
}

function _obInitProviderCards(obs) {
  const choiceCards = document.querySelectorAll(".onboarding-choice-card");
  choiceCards.forEach((card) => {
    const select = () => {
      obs.resetActiveState(".onboarding-choice-card");
      card.classList.add("active"); card.setAttribute("aria-pressed", "true");
      obs.selectedProvider = card.dataset.provider;
      document.getElementById("container-gemini-key").style.display   = obs.selectedProvider === "gemini-key"   ? "block" : "none";
      document.getElementById("container-gemini-oauth").style.display = obs.selectedProvider === "gemini-oauth" ? "block" : "none";
      document.getElementById("container-kimi").style.display         = obs.selectedProvider === "kimi"         ? "block" : "none";
      document.getElementById("container-ollama").style.display       = obs.selectedProvider === "ollama"       ? "block" : "none";
      obs.isProviderVerified = false;
      obs.btnNext.disabled = obs.selectedProvider !== "ollama";
      obs.logViewport.innerHTML = `<div class="onboarding-log-line">[SYS] Awaiting input credentials for ${obs.selectedProvider.toUpperCase()}...</div>`;
      if (obs.selectedProvider === "ollama") _obCheckOllama(obs);
    };
    card.onclick = select;
    card.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } };
  });
}

function _obCheckOllama(obs) {
  const banner = document.getElementById("ob-ollama-install-banner");
  if (!banner) return;
  banner.style.display = "none";
  invoke("test_llm_connection", {
    provider: "ollama",
    model: document.getElementById("ob-ollama-model").value.trim() || "hermes3:8b",
    url:   document.getElementById("ob-ollama-url").value.trim()   || "http://localhost:11434",
    key: null,
  }).catch(() => { banner.style.display = "block"; });
}

function _obInitOllamaButtons(obs) {
  const btnInstall = document.getElementById("ob-btn-install-ollama");
  const btnRecheck = document.getElementById("ob-btn-recheck-ollama");
  const btnPull    = document.getElementById("ob-btn-pull-model");
  const pullStatus = document.getElementById("ob-pull-status");
  if (btnInstall) btnInstall.onclick = () => {
    try { invoke("open_external", { url: "https://ollama.com/download" }); } catch (_) {}
    _obAppendLog(obs.logViewport, "Opening Ollama download page... Install it, run 'ollama serve', then click Re-check.");
  };
  if (btnRecheck) btnRecheck.onclick = () => _obCheckOllama(obs);
  if (btnPull) btnPull.onclick = async () => {
    const url   = document.getElementById("ob-ollama-url").value.trim()   || "http://localhost:11434";
    const model = document.getElementById("ob-ollama-model").value.trim() || "hermes3:8b";
    btnPull.disabled = true;
    if (pullStatus) pullStatus.textContent = "Starting pull...";
    _obAppendLog(obs.logViewport, `Pulling model '${model}' from Ollama registry. This may take a while...`);
    try {
      const unlisten = await listen("ollama_pull_progress", (ev) => {
        const p = ev.payload;
        if (pullStatus) {
          const pct = p.total ? Math.round(((p.completed || 0) / p.total) * 100) : 0;
          pullStatus.textContent = p.status === "success" ? "Done!" : `${p.status}${p.total ? ` ${pct}%` : ""}`;
        }
        if (p.status === "success") {
          _obAppendLog(obs.logViewport, `Model '${model}' pulled successfully. Ready to use.`);
          btnPull.disabled = false; _obCheckOllama(obs); if (unlisten) unlisten();
        }
      });
      await invoke("ollama_pull_model", { baseUrl: url, model });
    } catch (err) {
      _obAppendLog(obs.logViewport, `Pull failed: ${err}. Ensure Ollama is running ('ollama serve').`, true);
      btnPull.disabled = false;
      if (pullStatus) pullStatus.textContent = "Failed";
    }
  };
}

async function _obVerifyGeminiKey(obs) {
  const keyInput = document.getElementById("ob-gemini-key").value.trim();
  if (!keyInput) { _obAppendLog(obs.logViewport, "Error: Please enter a Gemini API Key.", true); return; }
  _obAppendLog(obs.logViewport, "Initiating live validation request...");
  try {
    const status = await invoke("test_llm_connection", { provider: "gemini", model: "gemini-1.5-flash", url: "", key: keyInput });
    _obAppendLog(obs.logViewport, status);
    _obAppendLog(obs.logViewport, "Saving Gemini API Key to secure OS Keychain...");
    await invoke("save_gemini_api_key", { key: keyInput });
    await invoke("set_config", { key: "llm.default_provider", value: "gemini" });
    _obAppendLog(obs.logViewport, "Success! Configuration finalized.");
    obs.isProviderVerified = true; obs.btnNext.disabled = false;
  } catch (err) { _obAppendLog(obs.logViewport, `Failed to verify key: ${err}`, true); }
}

async function _obVerifyKimiKey(obs) {
  const keyInput   = document.getElementById("ob-kimi-key").value.trim();
  const modelInput = document.getElementById("ob-kimi-model").value.trim();
  if (!keyInput) { _obAppendLog(obs.logViewport, "Error: Please enter a Kimi API Key.", true); return; }
  _obAppendLog(obs.logViewport, "Initiating live validation request...");
  try {
    const status = await invoke("test_llm_connection", { provider: "kimi", model: modelInput || "kimi-k2.5", url: "", key: keyInput });
    _obAppendLog(obs.logViewport, status);
    _obAppendLog(obs.logViewport, "Saving Kimi API Key to secure OS Keychain...");
    await invoke("save_kimi_api_key", { key: keyInput });
    await invoke("set_config", { key: "llm.default_provider", value: "kimi" });
    await invoke("set_config", { key: "llm.kimi_model", value: modelInput || "kimi-k2.5" });
    _obAppendLog(obs.logViewport, "Success! Configuration finalized.");
    obs.isProviderVerified = true; obs.btnNext.disabled = false;
  } catch (err) { _obAppendLog(obs.logViewport, `Failed to verify key: ${err}`, true); }
}

async function _obVerifyOAuth(obs) {
  _obAppendLog(obs.logViewport, "Initializing OAuth 2.0 Device Authorization flow...");
  try {
    const data = await invoke("start_oauth_flow");
    document.getElementById("ob-oauth-url").href      = data.verification_uri;
    document.getElementById("ob-oauth-url").innerText = data.verification_uri;
    document.getElementById("ob-oauth-code-box").innerText = `CODE: ${data.user_code}`;
    await QRCode.toCanvas(document.getElementById("ob-oauth-qr"),
      data.verification_uri_complete || data.verification_uri, { width: 140, margin: 1 });
    _obAppendLog(obs.logViewport, "OAuth device flow active. Awaiting user authorization...");
    obs.oauthPollAbortController = new AbortController();
    invoke("poll_oauth_token", { deviceCode: data.device_code, interval: data.interval })
      .then(async () => {
        _obAppendLog(obs.logViewport, "OAuth code approved! Retrieving access token...");
        _obAppendLog(obs.logViewport, "Retrieved token successfully validated and saved to OS Keychain!");
        await invoke("set_config", { key: "llm.default_provider", value: "gemini" });
        obs.isProviderVerified = true; obs.btnNext.disabled = false;
      })
      .catch((err) => { if (obs.oauthPollAbortController) _obAppendLog(obs.logViewport, `OAuth failed or canceled: ${err}`, true); });
  } catch (err) { _obAppendLog(obs.logViewport, `Failed to initialize OAuth: ${err}`, true); }
}

async function _obVerifyOllama(obs) {
  const urlInput   = document.getElementById("ob-ollama-url").value.trim();
  const modelInput = document.getElementById("ob-ollama-model").value.trim();
  if (!urlInput || !modelInput) { _obAppendLog(obs.logViewport, "Error: Both url and model name are required.", true); return; }
  _obAppendLog(obs.logViewport, `Pinging local Ollama service at ${urlInput} with model ${modelInput}...`);
  try {
    await invoke("set_config", { key: "llm.default_provider", value: "ollama" });
    await invoke("set_config", { key: "llm.ollama_base_url", value: urlInput });
    await invoke("set_config", { key: "llm.ollama_model",    value: modelInput });
    _obAppendLog(obs.logViewport, "Ollama configuration saved.");
  } catch (saveErr) { _obAppendLog(obs.logViewport, `Config save error: ${saveErr}`, true); }
  try {
    const status = await invoke("test_llm_connection", { provider: "ollama", model: modelInput, url: urlInput, key: null });
    _obAppendLog(obs.logViewport, `Connection test: ${status}`);
  } catch (_) {
    _obAppendLog(obs.logViewport, "WARNING: Ollama not reachable right now. Start it before chatting.");
    _obAppendLog(obs.logViewport, "Config saved. You can start Ollama after launch.");
  }
  obs.isProviderVerified = true; obs.btnNext.disabled = false;
}

function _obInitProviders(obs) {
  _obInitProviderCards(obs);
  _obInitOllamaButtons(obs);
  document.getElementById("ob-btn-verify").onclick = async () => {
    obs.isProviderVerified = false; obs.btnNext.disabled = true;
    if      (obs.selectedProvider === "gemini-key")   await _obVerifyGeminiKey(obs);
    else if (obs.selectedProvider === "kimi")         await _obVerifyKimiKey(obs);
    else if (obs.selectedProvider === "gemini-oauth") await _obVerifyOAuth(obs);
    else if (obs.selectedProvider === "ollama")       await _obVerifyOllama(obs);
    const tryRadial = document.getElementById("ob-btn-try-radial");
    if (tryRadial) tryRadial.onclick = () => {
      if (window.showRadialMenu) { window.showRadialMenu(); setTimeout(() => { if (window.hideRadialMenu) window.hideRadialMenu(); }, 3000); }
    };
  };
}

function _obInitVoice() {
  const btnTestMic  = document.getElementById("ob-btn-test-mic");
  const micStatus   = document.getElementById("ob-mic-status");
  const micResult   = document.getElementById("ob-mic-result");
  const micWaveform = document.getElementById("ob-mic-waveform");
  if (btnTestMic) btnTestMic.onclick = async () => {
    btnTestMic.disabled = true;
    if (micResult)   micResult.textContent = "";
    if (micWaveform) micWaveform.classList.add("active");
    try {
      const startMsg = await invoke("start_recording");
      if (startMsg.includes("only supported on Linux")) {
        if (micStatus)   micStatus.textContent = "Voice recording requires Linux / SteamOS.";
        if (micWaveform) micWaveform.classList.remove("active");
        btnTestMic.disabled = false; return;
      }
      if (micStatus) micStatus.textContent = "Recording... speak now!";
      await new Promise((r) => setTimeout(r, 3000));
      if (micStatus) micStatus.textContent = "Transcribing...";
      const text = await invoke("stop_recording");
      if (micWaveform) micWaveform.classList.remove("active");
      if (micStatus)   micStatus.textContent = "Microphone working!";
      if (micResult)   micResult.innerHTML = `<span style="color:var(--response-color)">"${text}"</span>`;
    } catch (err) {
      if (micWaveform) micWaveform.classList.remove("active");
      if (micStatus)   micStatus.textContent = "Mic test failed.";
      if (micResult)   micResult.innerHTML = `<span style="color:var(--error-color);font-size:0.7rem;">${err}</span>`;
    }
    btnTestMic.disabled = false;
  };

  const btnTestTts = document.getElementById("ob-btn-test-tts");
  const ttsStatus  = document.getElementById("ob-tts-status");
  const ttsResult  = document.getElementById("ob-tts-result");
  const ttsSpeaker = document.getElementById("ob-tts-speaker");
  if (btnTestTts) btnTestTts.onclick = async () => {
    btnTestTts.disabled = true;
    if (ttsResult)  ttsResult.textContent = "";
    if (ttsSpeaker) ttsSpeaker.classList.add("active");
    if (ttsStatus)  ttsStatus.textContent = "Speaking...";
    try {
      await invoke("speak_text", { text: "NEURODECK voice output test. Your TTS engine is working." });
      if (ttsSpeaker) ttsSpeaker.classList.remove("active");
      if (ttsStatus)  ttsStatus.textContent = "TTS engine ready!";
      if (ttsResult)  ttsResult.innerHTML = `<span style="color:var(--response-color);font-size:0.7rem;">✓ Audio played successfully</span>`;
    } catch (err) {
      if (ttsSpeaker) ttsSpeaker.classList.remove("active");
      if (ttsStatus)  ttsStatus.textContent = "TTS test failed.";
      if (ttsResult)  ttsResult.innerHTML = `<span style="color:var(--error-color);font-size:0.7rem;">${err}</span>`;
    }
    btnTestTts.disabled = false;
  };
}

async function _obInitPersonaTheme(obs) {
  const personaCarousel = document.getElementById("ob-persona-carousel");
  const themeGrid       = document.getElementById("ob-theme-grid");
  const personaIconMap = { Default:"bot", Developer:"squareTerminal", Cyberpunk:"zap", John:"fileText", Sally:"sparkles", Winston:"panelRightOpen", Amelia:"server", Paige:"fileText", Mary:"chartColumn" };
  const personaDescMap = { Default:"Helpful, balanced assistant.", Developer:"Clean code, engineering precision.", Cyberpunk:"Terminal lingo, edgy AI construct.", John:"Product Manager — PRDs & user stories.", Sally:"UX Designer — elegant interfaces.", Winston:"System Architect — modular design.", Amelia:"Senior Dev — Rust & JS expert.", Paige:"Technical Writer — docs & wikis.", Mary:"Business Analyst — epics & acceptance criteria." };

  let allPersonas = ["Default"];
  try { allPersonas = await invoke("get_personas"); } catch (_) {}
  personaCarousel.innerHTML = allPersonas.map((name) =>
    `<div class="onboarding-persona-card ${name === obs.selectedPersona ? "active" : ""}" data-name="${name}" role="button" tabindex="0" aria-pressed="${name === obs.selectedPersona ? "true" : "false"}">` +
    `<span class="onboarding-persona-icon">${createIcon(personaIconMap[name] || "bot", { size: 18 })}</span>` +
    `<span class="onboarding-persona-name">${name}</span>` +
    `<span class="onboarding-persona-desc">${personaDescMap[name] || "Custom persona."}</span></div>`
  ).join("");
  _obBindPersonaCards(obs);

  let allThemeNames = ["BLACKSITE"];
  try { allThemeNames = await invoke("get_themes"); } catch (_) {}
  const themeColorCache = {};
  for (const tname of allThemeNames) {
    try { const colors = await invoke("set_theme", { name: tname }); if (colors) themeColorCache[tname] = colors; } catch (_) {}
  }
  const currentTheme = localStorage.getItem("selectedTheme") || "BLACKSITE";
  if (themeColorCache[currentTheme]) {
    const tc = themeColorCache[currentTheme];
    document.documentElement.style.setProperty("--bg-color",       tc.Background);
    document.documentElement.style.setProperty("--accent-color",   tc.Accent);
    document.documentElement.style.setProperty("--response-color", tc.Response);
  }
  themeGrid.innerHTML = allThemeNames.map((tname) => {
    const tc = themeColorCache[tname] || {};
    return `<div class="onboarding-theme-card ${tname === obs.selectedThemeName ? "active" : ""}" data-name="${tname}" role="button" tabindex="0" aria-pressed="${tname === obs.selectedThemeName ? "true" : "false"}">` +
           `<div style="font-weight:bold;margin-bottom:4px;font-size:0.7rem;">${tname}</div>` +
           `<div class="onboarding-theme-swatch"><span style="background:${tc.Accent||"#00f0ff"}"></span><span style="background:${tc.Background||"#050505"}"></span><span style="background:${tc.Foreground||"#d9f7ff"}"></span></div></div>`;
  }).join("");
  _obBindThemeCards(obs);
}

function _obBindPersonaCards(obs) {
  const cards = Array.from(document.querySelectorAll(".onboarding-persona-card"));
  cards.forEach((card, index) => {
    const select = async () => {
      obs.resetActiveState(".onboarding-persona-card");
      card.classList.add("active"); card.setAttribute("aria-pressed", "true");
      obs.selectedPersona = card.dataset.name;
      try { await invoke("set_persona", { name: obs.selectedPersona }); } catch (e) { console.error("Failed to set persona", e); }
    };
    card.onclick = select;
    card.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); (cards[index + 1] || cards[0]).focus(); }
      else if (e.key === "ArrowLeft")  { e.preventDefault(); (cards[index - 1] || cards[cards.length - 1]).focus(); }
    };
  });
}

function _obBindThemeCards(obs) {
  const cards = Array.from(document.querySelectorAll(".onboarding-theme-card"));
  cards.forEach((card, index) => {
    const select = async () => {
      obs.resetActiveState(".onboarding-theme-card");
      card.classList.add("active"); card.setAttribute("aria-pressed", "true");
      obs.selectedThemeName = card.dataset.name;
      localStorage.setItem("selectedTheme", obs.selectedThemeName);
      try { const theme = await invoke("set_theme", { name: obs.selectedThemeName }); if (theme) window.applyThemeColors(theme); }
      catch (e) { console.error("Failed to apply theme live", e); }
    };
    card.onclick = select;
    card.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); (cards[index + 1] || cards[0]).focus(); }
      else if (e.key === "ArrowLeft")  { e.preventDefault(); (cards[index - 1] || cards[cards.length - 1]).focus(); }
    };
  });
}

async function _obRunDiagnostics(obs) {
  if (obs.diagRunning) return;
  obs.diagRunning = true;
  obs.isDiagnosticsPassed = false;
  obs.btnNext.disabled = true;
  const diagLog = document.getElementById("ob-diagnostic-log");
  diagLog.innerHTML = `<div class="onboarding-log-line">[SYS] Initiating diagnostics sequence...</div>`;
  ["ob-diag-pty","ob-diag-net","ob-diag-key","ob-diag-audio","ob-diag-ssh","ob-diag-tts"].forEach((id) => {
    const el = document.getElementById(id);
    el.className = "onboarding-diagnostic-status pending"; el.innerText = "RUNNING";
  });
  await new Promise((r) => setTimeout(r, 700));
  try {
    const result = await invoke("run_onboarding_diagnostics");
    function applyCheck(id, ok, detail) {
      const el = document.getElementById(id);
      el.className = "onboarding-diagnostic-status " + (ok ? "success" : "error");
      el.innerText = ok ? "OK" : "WARN";
      _obAppendLog(diagLog, `${ok ? "✓" : "!"} ${detail}`);
    }
    applyCheck("ob-diag-pty",   result.pty_ok,      result.pty_details      || "PTY allocation test");
    await new Promise((r) => setTimeout(r, 350));
    applyCheck("ob-diag-net",   result.network_ok,  result.network_details  || "Network reachability");
    await new Promise((r) => setTimeout(r, 350));
    applyCheck("ob-diag-key",   result.keychain_ok, result.keychain_details || "OS keychain access");
    await new Promise((r) => setTimeout(r, 350));
    const audioOk  = result.audio_ok  !== undefined ? result.audio_ok  : true;
    const sshOk    = result.ssh_ok    !== undefined ? result.ssh_ok    : true;
    const ttsOk    = result.tts_ok    !== undefined ? result.tts_ok    : true;
    applyCheck("ob-diag-audio", audioOk, result.audio_details || (audioOk ? "arecord available"  : "arecord not found — Voice STT unavailable"));
    await new Promise((r) => setTimeout(r, 350));
    applyCheck("ob-diag-ssh",   sshOk,   result.ssh_details   || (sshOk   ? "ssh binary found"   : "ssh not found — install OpenSSH client"));
    await new Promise((r) => setTimeout(r, 350));
    applyCheck("ob-diag-tts",   ttsOk,   result.tts_details   || (ttsOk   ? "espeak available"   : "espeak not found — Voice TTS unavailable"));
    await new Promise((r) => setTimeout(r, 400));
    if (result.pty_ok && result.keychain_ok) {
      obs.isDiagnosticsPassed = true; obs.btnNext.disabled = false;
      const warn = !result.network_ok || !audioOk || !sshOk || !ttsOk;
      _obAppendLog(diagLog, warn ? "CORE SYSTEMS OK. Some optional features have warnings — see above." : "ALL SYSTEMS NOMINAL. READY TO LAUNCH.");
    } else {
      _obAppendLog(diagLog, "CRITICAL CHECK FAILED. Review errors above.", true);
    }
  } catch (e) {
    _obAppendLog(diagLog, `Diagnostics engine error: ${e}`, true);
    obs.isDiagnosticsPassed = true; obs.btnNext.disabled = false;
  } finally {
    obs.diagRunning = false;
  }
}




// ==========================================================================

// ==========================================================================

// ==========================================================================
// SPRINT A — TOUCH SCROLL & TAP POLISH
// ==========================================================================
(function initTouchScroll() {
  // Selectors for every overflow-y:auto container in the app
  const SCROLL_SELECTORS = [
    "#chat-viewport",
    "#sidebar-history",
    "#agent-log",
    "#memory-list",
    "#ftp-file-list",
    "#sftp-file-list",
    "#transfer-log",
    ".onboarding-log-viewport",
    ".ob-diagnostic-log",
    ".onboarding-carousel",
    ".settings-content",
    ".memory-doc-list",
    ".prompt-lab-output",
  ];

  function attachTouchScroll(el) {
    if (!el || el._touchScrollAttached) return;
    el._touchScrollAttached = true;
    let startY = 0;
    let startScrollTop = 0;
    let velocityY = 0;
    let lastY = 0;
    let lastT = 0;
    let momentumId = null;

    el.addEventListener(
      "touchstart",
      (e) => {
        if (momentumId) {
          cancelAnimationFrame(momentumId);
          momentumId = null;
        }
        startY = e.touches[0].clientY;
        startScrollTop = el.scrollTop;
        lastY = startY;
        lastT = Date.now();
        velocityY = 0;
      },
      { passive: true },
    );

    el.addEventListener(
      "touchmove",
      (e) => {
        const dy = startY - e.touches[0].clientY;
        el.scrollTop = startScrollTop + dy;
        const now = Date.now();
        const dt = now - lastT || 1;
        velocityY = (lastY - e.touches[0].clientY) / dt;
        lastY = e.touches[0].clientY;
        lastT = now;
      },
      { passive: true },
    );

    el.addEventListener(
      "touchend",
      () => {
        // Momentum fling
        let v = velocityY * 16; // pixels per frame at ~60fps
        function fling() {
          if (Math.abs(v) < 0.5) return;
          el.scrollTop += v;
          v *= 0.92;
          momentumId = requestAnimationFrame(fling);
        }
        fling();
      },
      { passive: true },
    );
  }

  // Attach to all known scroll containers after DOM is ready
  function attach() {
    SCROLL_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach(attachTouchScroll);
    });
  }

  // Run on load and again after a short delay (for dynamically created elements)
  document.addEventListener("DOMContentLoaded", attach);
  setTimeout(attach, 2500);

  // Expose so dynamically created containers can opt-in
  window._attachTouchScroll = attachTouchScroll;
})();

// Double-tap on radial backdrop closes the menu
(function initRadialTouchDismiss() {
  let lastTap = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      if (!state.radialMenuVisible) return;
      const t = Date.now();
      if (e.target.closest(".radial-item")) {
        // Single tap on a segment = activate it
        const seg = e.target.closest(".radial-item");
        if (seg) {
          const idx = parseInt(seg.dataset.segment, 10);
          activateRadialSegment(idx);
          hideRadialMenu();
        }
        return;
      }
      if (t - lastTap < 300) {
        hideRadialMenu();
      }
      lastTap = t;
    },
    { passive: true },
  );
})();

// ==========================================================================
// SPRINT B — VIRTUAL KEYBOARD OVERLAY
// ==========================================================================
(function initVirtualKeyboard() {
  // Track whether last input event was a touch (vs physical key)
  let lastInputWasTouch = false;
  document.addEventListener(
    "touchstart",
    () => {
      lastInputWasTouch = true;
    },
    { passive: true },
  );
  document.addEventListener("keydown", () => {
    lastInputWasTouch = false;
  });

  // Modifier state
  let vkShift = false;
  let vkCtrl = false;
  let vkAlt = false;
  let vkCapsLock = false;

  // Current target input element
  let vkTarget = null;

  // Key layout definition
  // Each row is an array of [displayNormal, displayShifted, keyCode, keyValue]
  // Special keys: type "special", value = action name
  const ROWS = [
    // Number row
    [
      ["1", "!", "Digit1", "1"],
      ["2", "@", "Digit2", "2"],
      ["3", "#", "Digit3", "3"],
      ["4", "$", "Digit4", "4"],
      ["5", "%", "Digit5", "5"],
      ["6", "^", "Digit6", "6"],
      ["7", "&", "Digit7", "7"],
      ["8", "*", "Digit8", "8"],
      ["9", "(", "Digit9", "9"],
      ["0", ")", "Digit0", "0"],
      ["-", "_", "Minus", "-"],
      ["=", "+", "Equal", "="],
      { type: "special", label: "⌫", action: "Backspace", cls: "vk-wide" },
    ],
    // QWERTY row
    [
      { type: "special", label: "Tab", action: "Tab", cls: "vk-wide" },
      ["q", "Q", "KeyQ", "q"],
      ["w", "W", "KeyW", "w"],
      ["e", "E", "KeyE", "e"],
      ["r", "R", "KeyR", "r"],
      ["t", "T", "KeyT", "t"],
      ["y", "Y", "KeyY", "y"],
      ["u", "U", "KeyU", "u"],
      ["i", "I", "KeyI", "i"],
      ["o", "O", "KeyO", "o"],
      ["p", "P", "KeyP", "p"],
      ["[", "{", "BracketLeft", "["],
      ["]", "}", "BracketRight", "]"],
      ["\\", "|", "Backslash", "\\"],
    ],
    // ASDF row
    [
      {
        type: "special",
        label: "Caps",
        action: "CapsLock",
        cls: "vk-wide vk-mod",
        id: "vk-caps",
      },
      ["a", "A", "KeyA", "a"],
      ["s", "S", "KeyS", "s"],
      ["d", "D", "KeyD", "d"],
      ["f", "F", "KeyF", "f"],
      ["g", "G", "KeyG", "g"],
      ["h", "H", "KeyH", "h"],
      ["j", "J", "KeyJ", "j"],
      ["k", "K", "KeyK", "k"],
      ["l", "L", "KeyL", "l"],
      [";", ":", "Semicolon", ";"],
      ["'", '"', "Quote", "'"],
      { type: "special", label: "↵", action: "Enter", cls: "vk-xwide" },
    ],
    // ZXCV row
    [
      {
        type: "special",
        label: "⇧",
        action: "Shift",
        cls: "vk-xwide vk-mod",
        id: "vk-shift",
      },
      ["z", "Z", "KeyZ", "z"],
      ["x", "X", "KeyX", "x"],
      ["c", "C", "KeyC", "c"],
      ["v", "V", "KeyV", "v"],
      ["b", "B", "KeyB", "b"],
      ["n", "N", "KeyN", "n"],
      ["m", "M", "KeyM", "m"],
      [",", "<", "Comma", ","],
      [".", ">", "Period", "."],
      ["/", "?", "Slash", "/"],
      { type: "special", label: "⇧", action: "Shift", cls: "vk-xwide vk-mod" },
    ],
    // Bottom strip
    [
      {
        type: "special",
        label: "Ctrl",
        action: "Ctrl",
        cls: "vk-wide vk-mod",
        id: "vk-ctrl",
      },
      {
        type: "special",
        label: "Alt",
        action: "Alt",
        cls: "vk-wide vk-mod",
        id: "vk-alt",
      },
      { type: "special", label: "Space", action: "Space", cls: "vk-space" },
      { type: "special", label: "←", action: "ArrowLeft", cls: "vk-wide" },
      { type: "special", label: "→", action: "ArrowRight", cls: "vk-wide" },
      { type: "special", label: "↑", action: "ArrowUp", cls: "" },
      { type: "special", label: "↓", action: "ArrowDown", cls: "" },
      { type: "special", label: "Esc", action: "Escape", cls: "vk-wide" },
    ],
  ];

  function buildKeyboard() {
    // Build overlay HTML
    const overlay = document.createElement("div");
    overlay.id = "vk-overlay";
    overlay.setAttribute("role", "toolbar");
    overlay.setAttribute("aria-label", "Virtual Keyboard");

    // Dismiss bar
    const dismissBar = document.createElement("div");
    dismissBar.className = "vk-dismiss-bar";
    const dismissBtn = document.createElement("button");
    dismissBtn.className = "vk-dismiss-btn";
    dismissBtn.textContent = "⌄ Hide Keyboard";
    dismissBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      hideVirtualKeyboard();
    });
    dismissBar.appendChild(dismissBtn);
    overlay.appendChild(dismissBar);

    ROWS.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "vk-row";

      row.forEach((key) => {
        const btn = document.createElement("button");
        btn.className = "vk-key";

        if (key.type === "special") {
          btn.classList.add(...(key.cls || "").split(" ").filter(Boolean));
          btn.textContent = key.label;
          if (key.id) btn.id = key.id;
          btn.dataset.action = key.action;
        } else {
          btn.dataset.normal = key[0];
          btn.dataset.shifted = key[1];
          btn.dataset.code = key[2];
          btn.dataset.value = key[3];
          btn.textContent = key[0];
        }

        // Use pointerdown so response is instant, prevent focus steal
        btn.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          btn.classList.add("vk-pressed");
          handleKeyPress(btn);
        });
        btn.addEventListener("pointerup", () =>
          btn.classList.remove("vk-pressed"),
        );
        btn.addEventListener("pointerleave", () =>
          btn.classList.remove("vk-pressed"),
        );

        rowEl.appendChild(btn);
      });

      overlay.appendChild(rowEl);
    });

    document.body.appendChild(overlay);

    // Attach touch scroll to overlay itself (for very small screens)
    overlay.addEventListener("touchmove", (e) => e.stopPropagation(), {
      passive: true,
    });
  }

  function handleKeyPress(btn) {
    const action = btn.dataset.action;

    // Handle modifier toggles
    if (action === "Shift") {
      vkShift = !vkShift;
      updateModifierVisuals();
      return;
    }
    if (action === "CapsLock") {
      vkCapsLock = !vkCapsLock;
      updateModifierVisuals();
      return;
    }
    if (action === "Ctrl") {
      vkCtrl = !vkCtrl;
      updateModifierVisuals();
      return;
    }
    if (action === "Alt") {
      vkAlt = !vkAlt;
      updateModifierVisuals();
      return;
    }

    // Determine target element — fallback to document.activeElement
    const target = vkTarget || document.activeElement;
    if (!target) return;

    if (action) {
      // Special key — dispatch real KeyboardEvent
      dispatchKey(target, action, action);
    } else {
      // Character key
      const shifted = vkShift !== vkCapsLock; // XOR: caps inverts shift
      const char = shifted ? btn.dataset.shifted : btn.dataset.normal;
      const code = btn.dataset.code;

      dispatchKey(target, code, char);

      // Also insert character directly for inputs/textareas
      insertCharAtCursor(target, char);

      // Auto-release shift after one character (sticky shift behaviour)
      if (vkShift) {
        vkShift = false;
        updateModifierVisuals();
      }
    }

    // Keep focus on target
    if (target && target.focus) target.focus();
  }

  function dispatchKey(target, code, key) {
    const opts = {
      key,
      code,
      bubbles: true,
      cancelable: true,
      shiftKey: vkShift,
      ctrlKey: vkCtrl,
      altKey: vkAlt,
    };
    target.dispatchEvent(new KeyboardEvent("keydown", opts));
    target.dispatchEvent(new KeyboardEvent("keypress", opts));
    target.dispatchEvent(new KeyboardEvent("keyup", opts));
  }

  function insertCharAtCursor(el, char) {
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      if (char === "Backspace") {
        el.value =
          el.value.slice(0, Math.max(0, start - 1)) + el.value.slice(end);
        el.setSelectionRange(Math.max(0, start - 1), Math.max(0, start - 1));
      } else if (char.length === 1) {
        el.value = el.value.slice(0, start) + char + el.value.slice(end);
        el.setSelectionRange(start + 1, start + 1);
      }
      // Trigger input event so React/Vue/Svelte state syncs (and our own handlers)
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (el.isContentEditable) {
      // ContentEditable — let the KeyboardEvent handle it naturally
    }
  }

  function updateModifierVisuals() {
    // Update shifted labels on character keys
    const isShifted = vkShift !== vkCapsLock;
    document
      .querySelectorAll("#vk-overlay .vk-key[data-normal]")
      .forEach((btn) => {
        btn.textContent = isShifted ? btn.dataset.shifted : btn.dataset.normal;
      });
    // Toggle active class on modifier keys
    const shiftBtns = document.querySelectorAll(
      "#vk-overlay [data-action='Shift']",
    );
    const capsBtns = document.querySelectorAll(
      "#vk-overlay [data-action='CapsLock']",
    );
    const ctrlBtns = document.querySelectorAll(
      "#vk-overlay [data-action='Ctrl']",
    );
    const altBtns = document.querySelectorAll(
      "#vk-overlay [data-action='Alt']",
    );
    shiftBtns.forEach((b) => b.classList.toggle("vk-active", vkShift));
    capsBtns.forEach((b) => b.classList.toggle("vk-active", vkCapsLock));
    ctrlBtns.forEach((b) => b.classList.toggle("vk-active", vkCtrl));
    altBtns.forEach((b) => b.classList.toggle("vk-active", vkAlt));
  }

  function showVirtualKeyboard(targetEl) {
    triggerHaptic("light");
    vkTarget = targetEl;
    const overlay = document.getElementById("vk-overlay");
    if (overlay) overlay.classList.add("vk-visible");
  }

  function hideVirtualKeyboard() {
    triggerHaptic("light");
    vkTarget = null;
    const overlay = document.getElementById("vk-overlay");
    if (overlay) overlay.classList.remove("vk-visible");
    // Reset one-shot modifiers
    vkShift = false;
    vkCtrl = false;
    vkAlt = false;
    updateModifierVisuals();
  }

  function shouldShowKeyboard() {
    // Only show in touch context — not when physical keyboard is in use
    return lastInputWasTouch;
  }

  // Trigger keyboard on focus for inputs/textareas in touch mode
  function initTriggers() {
    // Use event delegation on document — covers dynamically added inputs
    document.addEventListener("focusin", (e) => {
      const el = e.target;
      const isTextInput =
        (el.tagName === "INPUT" &&
          ![
            "button",
            "submit",
            "reset",
            "checkbox",
            "radio",
            "file",
            "range",
          ].includes(el.type)) ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable;
      if (isTextInput && shouldShowKeyboard()) {
        showVirtualKeyboard(el);
      }
    });

    document.addEventListener("focusout", (e) => {
      // Only hide if focus moves outside of the virtual keyboard itself
      setTimeout(() => {
        const active = document.activeElement;
        const vkEl = document.getElementById("vk-overlay");
        if (vkEl && vkEl.contains(active)) return; // focus went to a key button
        // Check if new active element is still a text input
        const stillInput =
          active &&
          ((active.tagName === "INPUT" &&
            ![
              "button",
              "submit",
              "reset",
              "checkbox",
              "radio",
              "file",
              "range",
            ].includes(active.type)) ||
            active.tagName === "TEXTAREA" ||
            active.isContentEditable);
        if (!stillInput) hideVirtualKeyboard();
      }, 100);
    });
  }

  // Build keyboard DOM and wire triggers after page load
  buildKeyboard();
  initTriggers();

  // Expose for programmatic control (e.g., gamepad B button could toggle)
  window.showVirtualKeyboard = showVirtualKeyboard;
  window.hideVirtualKeyboard = hideVirtualKeyboard;
})();

// ==========================================================================
// CINEMATIC BOOT SEQUENCE
// ==========================================================================
// Uses a single `get_boot_diagnostics` invoke to obtain a dynamic pipeline.
// New backend features auto-render by pushing a BootPipelineStep into the
// `pipeline` vec — no frontend code changes required.
// ==========================================================================
function _bootEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function _bootToken(value, cls = "boot-val") {
  return `<span class="${cls}">${_bootEscapeHtml(value)}</span>`;
}

function _bootStatusToken(label, tone = "boot-ok") {
  return `<span class="${tone}">${_bootEscapeHtml(label)}</span>`;
}

function _bootNextAddr(bCtx) {
  return `[0x${(bCtx.addrIndex++).toString(16).padStart(4, "0")}]`;
}

function _bootSetProgress(progressFill, progressPct, progressLabel, pct, label) {
  const clamped = Math.min(pct, 100);
  if (progressFill) progressFill.style.width = `${clamped}%`;
  if (progressPct) progressPct.textContent = `${Math.round(clamped)}%`;
  if (label && progressLabel) progressLabel.textContent = label.toUpperCase().slice(0, 48);
}

function _bootAddLine(logScroll, addr, html, extraClass) {
  const line = document.createElement("div");
  line.className = `boot-log-line${extraClass ? ` ${extraClass}` : ""}`;
  line.innerHTML = `<span class="boot-addr">${addr}</span>  ${html}`;
  logScroll.appendChild(line);
  logScroll.scrollTop = logScroll.scrollHeight;
}

function _bootAdvanceProgress(bCtx, progressFill, progressPct, progressLabel, totalSteps, labelText) {
  bCtx.step += 1;
  const pct = Math.min((bCtx.step / Math.max(totalSteps, 1)) * 100, 97);
  _bootSetProgress(progressFill, progressPct, progressLabel, pct, labelText);
}

async function _bootRenderPipeline(bCtx, logScroll, progressFill, progressPct, progressLabel, pipeline, totalSteps, delay) {
  const toneMap = { ok: "boot-ok", warn: "boot-warn", err: "boot-err", info: "boot-info", neutral: "boot-neutral" };
  for (const entry of pipeline) {
    const tone = toneMap[entry.status] || "boot-ok";
    let html;
    if (entry.category === "plugin") {
      const detail = entry.detail ? ` <span style="opacity:0.42">// ${_bootEscapeHtml(entry.detail)}</span>` : "";
      html = `${_bootEscapeHtml(entry.label)}${detail}`;
    } else {
      const detail = entry.detail ? ` · ${_bootEscapeHtml(entry.detail)}` : "";
      html = `${_bootEscapeHtml(entry.label)}${detail}`;
    }
    _bootAddLine(logScroll, _bootNextAddr(bCtx), html);
    _bootAdvanceProgress(bCtx, progressFill, progressPct, progressLabel, totalSteps, entry.label);
    await delay(entry.category === "plugin" ? 110 : 140);
  }
}

async function _bootLlmHandshake(bCtx, logScroll, progressFill, progressPct, progressLabel, diag, totalSteps, delay) {
  const provider = diag?.provider ?? "ollama";
  const model = diag?.model ?? "llama2";
  _bootAddLine(logScroll, _bootNextAddr(bCtx), `Running provider handshake against ${_bootToken(provider.toUpperCase())}…`);
  _bootAdvanceProgress(bCtx, progressFill, progressPct, progressLabel, totalSteps, "Provider handshake");
  await delay(120);
  const llmResult = await invoke("test_llm_connection", { provider, model, url: diag?.ollama_base_url ?? "http://localhost:11434", key: null })
    .then((message) => ({ ok: true, message }))
    .catch((error) => ({ ok: false, message: String(error) }));
  const llmTone = llmResult.ok ? "boot-ok" : "boot-warn";
  const llmLabel = llmResult.ok ? "CONNECTED" : "DEGRADED";
  _bootAddLine(logScroll, _bootNextAddr(bCtx), `LLM session ${_bootStatusToken(llmLabel, llmTone)} · ${_bootToken(model)} <span style="opacity:0.52">${_bootEscapeHtml(llmResult.message)}</span>`);
  _bootAdvanceProgress(bCtx, progressFill, progressPct, progressLabel, totalSteps, "LLM session");
  await delay(200);
  return llmResult;
}

(async function runBootSequence() {
  const overlay = document.getElementById("boot-overlay");
  const logScroll = document.getElementById("boot-log-scroll");
  const progressFill = document.getElementById("boot-progress-fill");
  const progressPct = document.getElementById("boot-progress-pct");
  const progressLabel = document.getElementById("boot-progress-label-text");

  if (!overlay || !logScroll) {
    document.dispatchEvent(new CustomEvent("neurodeck-boot-complete"));
    return;
  }

  try {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const bCtx = { step: 0, addrIndex: 1 };

    const diag = await invoke("get_boot_diagnostics").catch((e) => {
      console.error("[Boot] get_boot_diagnostics failed:", e);
      return null;
    });
    const pipeline = Array.isArray(diag?.pipeline) ? diag.pipeline : [];
    const totalSteps = Math.max(pipeline.length, 1) + 2;

    await _bootRenderPipeline(bCtx, logScroll, progressFill, progressPct, progressLabel, pipeline, totalSteps, delay);
    const llmResult = await _bootLlmHandshake(bCtx, logScroll, progressFill, progressPct, progressLabel, diag, totalSteps, delay);

    const memoryReady = diag?.memory_ready ?? false;
    const finalTone = llmResult.ok && memoryReady ? "boot-ok" : "boot-warn";
    _bootAddLine(logScroll, _bootNextAddr(bCtx), `<strong class="${finalTone}" style="letter-spacing:0.06em">NEURODECK ONLINE · STARTUP DIAGNOSTICS COMPLETE</strong>`, "boot-final");
    _bootSetProgress(progressFill, progressPct, progressLabel, 100, "NEURODECK ONLINE");
    await delay(1100);

    overlay.classList.add("fade-out");
    await delay(680);
  } catch (err) {
    console.error("[Boot] Sequence error:", err);
  } finally {
    if (overlay && overlay.parentNode) overlay.remove();
    document.dispatchEvent(new CustomEvent("neurodeck-boot-complete"));
  }
})();

// ==========================================================================
// SYSTEM DIAGNOSTICS POLLING LOOP (P6)
// ==========================================================================
(function initDiagnostics() {
  async function pollDiagnostics() {
    // 1. PTY Status
    const ptyDot = document.getElementById("diag-dot-pty");
    const ptyOk =
      typeof state.terminalSessions !== "undefined" &&
      state.terminalSessions.length > 0;
    if (ptyDot) {
      ptyDot.className = ptyOk ? "diag-dot online" : "diag-dot offline";
    }

    // 2. LAN Discovery / mDNS Status
    const mdnsDot = document.getElementById("diag-dot-mdns");
    let mdnsOk = false;
    try {
      await invoke("get_discovered_peers");
      mdnsOk = true;
    } catch (e) {
      mdnsOk = false;
    }
    if (mdnsDot) {
      mdnsDot.className = mdnsOk ? "diag-dot online" : "diag-dot offline";
    }

    // 3. LLM Provider Connectivity
    const llmDot = document.getElementById("diag-dot-llm");
    let llmOk = false;
    try {
      const config = await invoke("get_config");
      const provider = config?.llm?.default_provider || "gemini";
      if (provider === "gemini") {
        llmOk = navigator.onLine;
      } else if (provider === "ollama") {
        const url = config?.llm?.ollama_base_url || "http://localhost:11434";
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1200);
        const response = await fetch(`${url}/api/tags`, {
          signal: controller.signal,
        });
        clearTimeout(id);
        llmOk = response.ok;
      }
    } catch (e) {
      llmOk = false;
    }
    if (llmDot) {
      llmDot.className = llmOk ? "diag-dot online" : "diag-dot offline";
    }

    // 4. Collaboration Server Status
    const collabDot = document.getElementById("diag-dot-collab");
    const collabOk = !!window._mockCollabActive;
    if (collabDot) {
      collabDot.className = collabOk ? "diag-dot online" : "diag-dot offline";
    }
  }

  // Wait for the boot sequence to complete before starting polling
  document.addEventListener("neurodeck-boot-complete", () => {
    pollDiagnostics();
    setInterval(pollDiagnostics, 5000);
  });
})();

// ── Module init calls ────────────────────────────────────────────────────
initCtrlPromptPicker();
initCtrlPromptPanel();
initRemoteControl();

// ============================= DOCS VIEW =================================
async function _docsRefreshFileList(ctx) {
  try {
    const files = await invoke("get_indexed_docs");
    ctx.indexedFiles = files;
    const count = await invoke("get_doc_count");
    ctx.countBadge.textContent = `${count} chunk${count === 1 ? "" : "s"} indexed`;
    if (files.length === 0) {
      ctx.fileList.innerHTML = '<div class="docs-empty-msg">No documents indexed yet.</div>';
      return;
    }
    ctx.fileList.replaceChildren();
    files.forEach((f) => {
      const name = f.replace(/\\/g, "/").split("/").pop();
      const row = document.createElement("div");
      row.className = "docs-file-row";
      row.dataset.path = f;
      row.title = f;
      const icon = document.createElement("span");
      icon.className = "docs-file-icon";
      icon.innerHTML = createIcon("file", { size: 14 });
      const fileName = document.createElement("span");
      fileName.className = "docs-file-name";
      fileName.textContent = name;
      const btn = document.createElement("button");
      btn.className = "docs-remove-btn";
      btn.dataset.path = f;
      btn.title = "Remove from index";
      btn.setAttribute("aria-label", `Remove ${name} from index`);
      btn.innerHTML = createIcon("x", { size: 12 });
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        btn.innerHTML = createIcon("zap", { size: 12 });
        btn.disabled = true;
        await invoke("remove_indexed_doc", { filePath: btn.dataset.path });
        await _docsRefreshFileList(ctx);
      });
      row.append(icon, fileName, btn);
      ctx.fileList.appendChild(row);
    });
  } catch (_) {
    ctx.countBadge.textContent = "Error loading";
  }
}

async function _docsRunSearch(ctx) {
  const query = ctx.searchInput.value.trim();
  if (!query) return;
  ctx.resultsList.innerHTML = '<div class="docs-search-spinner"></div>';
  ctx.resultsLabel.textContent = "Searching…";
  try {
    const results = await invoke("search_docs_semantic", { query, limit: 10 });
    if (results.length === 0) {
      ctx.resultsList.innerHTML = '<div class="docs-empty-msg">No relevant passages found.</div>';
      ctx.resultsLabel.textContent = "Results — 0 found";
      return;
    }
    ctx.resultsLabel.textContent = `Results — ${results.length} found`;
    ctx.resultsList.replaceChildren();
    results.forEach((r) => {
      const pct = Math.round(r.score * 100);
      const name = r.file.replace(/\\/g, "/").split("/").pop();
      const row = document.createElement("div");
      row.className = "docs-result-row";
      const header = document.createElement("div");
      header.className = "docs-result-header";
      const file = document.createElement("span");
      file.className = "docs-result-file";
      file.title = r.file;
      const icon = document.createElement("span");
      icon.innerHTML = createIcon("fileText", { size: 13 });
      const label = document.createElement("span");
      label.textContent = name;
      file.append(icon.firstElementChild || icon, label);
      const score = document.createElement("span");
      score.className = "docs-result-score";
      score.textContent = `${pct}%`;
      header.append(file, score);
      const snippet = document.createElement("div");
      snippet.className = "docs-result-snippet";
      snippet.textContent = String(r.snippet ?? "");
      row.append(header, snippet);
      ctx.resultsList.appendChild(row);
    });
  } catch (err) {
    const error = document.createElement("div");
    error.className = "docs-empty-msg";
    error.style.color = "var(--error-color)";
    error.textContent = `Search failed: ${String(err)}`;
    ctx.resultsList.replaceChildren(error);
    ctx.resultsLabel.textContent = "Results — error";
  }
}

function _docsWireButtons(searchBtn, indexBtn, clearBtn, ctx) {
  searchBtn.addEventListener("click", () => _docsRunSearch(ctx));
  ctx.searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") _docsRunSearch(ctx); });
  indexBtn.addEventListener("click", async () => {
    const dir = prompt("Enter absolute folder path to index:");
    if (!dir || !dir.trim()) return;
    try {
      indexBtn.disabled = true;
      indexBtn.textContent = "Indexing…";
      await invoke("index_directory", { path: dir.trim() });
      await _docsRefreshFileList(ctx);
      if (window.addNotification)
        window.addNotification("Docs Indexed", `Folder indexed: ${dir.trim().split(/[\\/]/).pop()}`, "success");
    } catch (err) {
      alert(`Indexing failed: ${err}`);
    } finally {
      indexBtn.disabled = false;
      indexBtn.textContent = "+ Index Folder";
    }
  });
  clearBtn.addEventListener("click", async () => {
    if (!confirm("Remove all indexed documents from the knowledge base?")) return;
    await invoke("clear_doc_index");
    await _docsRefreshFileList(ctx);
    ctx.resultsList.innerHTML = '<div class="docs-empty-msg">Search to find relevant passages.</div>';
    ctx.resultsLabel.textContent = "Results";
  });
  document.querySelector('.nav-tab[data-view="docs"]')?.addEventListener("click", () => _docsRefreshFileList(ctx));
}

function initDocsView() {
  const searchInput = document.getElementById("docs-search-input");
  const searchBtn = document.getElementById("docs-search-btn");
  const indexBtn = document.getElementById("docs-index-btn");
  const clearBtn = document.getElementById("docs-clear-btn");
  const fileList = document.getElementById("docs-file-list");
  const resultsList = document.getElementById("docs-results-list");
  const resultsLabel = document.getElementById("docs-results-label");
  const countBadge = document.getElementById("docs-count-badge");
  const ctx = { indexedFiles: [], fileList, countBadge, resultsList, resultsLabel, searchInput };
  _docsWireButtons(searchBtn, indexBtn, clearBtn, ctx);
}

initDocsView();

// ==========================================================================
// DECKCODE RUNTIME INTEGRATION
// ==========================================================================
listen("deckcode-action", (event) => {
  const actionId = event.payload;

  if (typeof actionId === "string" && actionId.startsWith("insert_snippet:")) {
    const snippetTemplate = actionId.substring("insert_snippet:".length);
    const activeEl = document.activeElement;
    
    // Check if we are in a textarea or input
    if (activeEl && (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT")) {
      const start = activeEl.selectionStart;
      const end = activeEl.selectionEnd;
      const val = activeEl.value;

      // Basic snippet placeholder parsing
      // e.g., "def ${name}(${params}):\n    ${cursor}"
      // We will just strip out named placeholders except ${cursor} for now to make it valid code,
      // or replace them with empty strings/defaults.
      let snippet = snippetTemplate;
      
      // If we have ${cursor}, we want to place the cursor there.
      let cursorOffset = snippet.indexOf("${cursor}");
      if (cursorOffset !== -1) {
          snippet = snippet.replace("${cursor}", "");
      } else {
          cursorOffset = snippet.length; // Default to end of snippet
      }

      // Strip remaining ${...} placeholders (keep them empty for manual typing)
      // A more complex implementation could select the first placeholder
      snippet = snippet.replace(/\$\{[^}]+\}/g, "");
      
      // Insert the snippet natively (works for Monaco and standard textareas)
      const selectionBefore = activeEl.selectionStart || 0;
      document.execCommand("insertText", false, snippet);
      
      // Move cursor back if ${cursor} placeholder was placed earlier in the string
      if (cursorOffset < snippet.length) {
        activeEl.selectionStart = activeEl.selectionEnd = selectionBefore + cursorOffset;
      }
      return;
    }
  }
  
  if (window.addNotification) {
    window.addNotification(
      "DeckCode Action",
      `Triggered: ${actionId}`,
      "info"
    );
  }
});
