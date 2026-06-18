import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const PROJECT_ROOT = path.resolve(path.dirname(""), ".");
const ASSETS_DIR = path.join(PROJECT_ROOT, "assets", "brand");
const SCRIPTS_DIR = path.join(PROJECT_ROOT, "scripts");
const TAURI_ICONS_DIR = path.join(PROJECT_ROOT, "src-tauri", "icons");

// Ensure Output Directory Hierarchy Exists
const dirs = [
  path.join(ASSETS_DIR, "png", "logo"),
  path.join(ASSETS_DIR, "png", "glyph"),
  path.join(ASSETS_DIR, "png", "wordmark"),
  path.join(ASSETS_DIR, "png", "lockups"),
  path.join(ASSETS_DIR, "png", "marketing"),
  path.join(ASSETS_DIR, "png", "splash"),
  path.join(ASSETS_DIR, "png", "icons"),
  path.join(ASSETS_DIR, "jpg", "logo"),
  path.join(ASSETS_DIR, "jpg", "marketing"),
  path.join(ASSETS_DIR, "jpg", "splash"),
  path.join(ASSETS_DIR, "webp", "logo"),
  path.join(ASSETS_DIR, "webp", "marketing"),
  path.join(ASSETS_DIR, "webp", "splash"),
  path.join(ASSETS_DIR, "webp", "icons"),
  path.join(ASSETS_DIR, "favicon"),
  path.join(ASSETS_DIR, "app-icons", "png"),
  path.join(ASSETS_DIR, "app-icons", "windows"),
  path.join(ASSETS_DIR, "app-icons", "macos"),
  path.join(ASSETS_DIR, "app-icons", "linux"),
  path.join(ASSETS_DIR, "feature-icons", "png"),
  path.join(ASSETS_DIR, "feature-icons", "webp"),
  path.join(ASSETS_DIR, "social", "png"),
  path.join(ASSETS_DIR, "social", "jpg"),
  path.join(ASSETS_DIR, "social", "webp"),
  path.join(ASSETS_DIR, "store", "png"),
  path.join(ASSETS_DIR, "store", "jpg"),
  path.join(ASSETS_DIR, "store", "webp"),
  TAURI_ICONS_DIR,
];

for (const dir of dirs) {
  fs.mkdirSync(dir, { recursive: true });
}

// Master Source Paths
const SRC_GLYPH = path.join(ASSETS_DIR, "source", "neurodeck-glyph-master.svg");
const SRC_WORDMARK = path.join(ASSETS_DIR, "source", "neurodeck-wordmark-master.svg");
const SRC_LOGO = path.join(ASSETS_DIR, "source", "neurodeck-logo-master.svg");
const SRC_FAVICON = path.join(ASSETS_DIR, "source", "neurodeck-favicon-master.svg");

// Validation Tracker
const manifestAssets = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateSHA256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

function recordAsset(relPath, type, variant, format, width, height, transparent) {
  const absolutePath = path.join(PROJECT_ROOT, relPath);
  const sha256 = calculateSHA256(absolutePath);
  manifestAssets.push({
    path: relPath.replace(/\\/g, "/"),
    type,
    variant,
    format,
    width,
    height,
    transparent,
    sha256,
    intendedUse: ["app", "docs", "marketing"],
  });
}

// Custom ICO writer to generate multi-res Windows app icons
function writeIco(pngBuffers, outputPath) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  
  let dataOffset = headerSize + count * dirEntrySize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  const datas = [];

  for (const item of pngBuffers) {
    const w = item.width >= 256 ? 0 : item.width;
    const h = item.height >= 256 ? 0 : item.height;
    const size = item.buffer.length;

    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(size, 8); // Size of data
    entry.writeUInt32LE(dataOffset, 12); // Offset

    entries.push(entry);
    datas.push(item.buffer);

    dataOffset += size;
  }

  const finalIco = Buffer.concat([header, ...entries, ...datas]);
  fs.writeFileSync(outputPath, finalIco);
}

// Helper to strip background rects and optionally override colors for monochrome/light-bg variants
function prepareSvg(source, colorOverride = null) {
  let svgStr;
  if (Buffer.isBuffer(source)) {
    svgStr = source.toString("utf-8");
  } else if (typeof source === "string" && source.endsWith(".svg")) {
    svgStr = fs.readFileSync(source, "utf-8");
  } else {
    return source;
  }

  // Strip background rects (matching fill="#0A0D10" or dimensions)
  svgStr = svgStr.replace(/<rect[^>]*fill="#0A0D10"[^>]*\/>/g, '');
  svgStr = svgStr.replace(/<rect[^>]*width="512"[^>]*height="512"[^>]*fill="#0A0D10"[^>]*\/>/g, '');
  svgStr = svgStr.replace(/<rect[^>]*width="1024"[^>]*height="256"[^>]*fill="#0A0D10"[^>]*\/>/g, '');

  if (colorOverride) {
    const styleBlock = `<style>
      path, circle, line, text {
        fill: ${colorOverride} !important;
        stroke: ${colorOverride} !important;
        filter: none !important;
      }
      /* Hide background aura circles in monochrome/contrast versions */
      circle[opacity="0.15"], circle[opacity="0.05"] {
        display: none !important;
      }
    </style>`;
    svgStr = svgStr.replace('</svg>', `${styleBlock}</svg>`);
  }

  return Buffer.from(svgStr);
}

async function processLogo(sourcePath, destBaseName, type, variant, w, h) {
  // 1. PNG Transparent (stripped background rect)
  const transSvgBuf = prepareSvg(sourcePath);
  const pngTransPath = `${destBaseName}.png`;
  const resizedTransBuf = await sharp(transSvgBuf).resize(w, h).png().toBuffer();
  fs.writeFileSync(pngTransPath, resizedTransBuf);
  recordAsset(path.relative(PROJECT_ROOT, pngTransPath), type, `${variant}-transparent`, "png", w, h, true);

  // 2. PNG Dark-Bg (Solid #0A0D10 background, original colors)
  const pngDarkPath = `${destBaseName}-dark-bg.png`;
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 10, g: 13, b: 16, alpha: 1 },
    },
  })
    .composite([{ input: resizedTransBuf }])
    .png()
    .toFile(pngDarkPath);
  recordAsset(path.relative(PROJECT_ROOT, pngDarkPath), type, `${variant}-dark-bg`, "png", w, h, false);

  // 3. PNG Light-Bg (Solid #F3F4F6 background, dark brand elements for readability)
  const lightSvgBuf = prepareSvg(sourcePath, "#0A0D10");
  const resizedLightBuf = await sharp(lightSvgBuf).resize(w, h).png().toBuffer();
  
  const pngLightPath = `${destBaseName}-light-bg.png`;
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 243, g: 244, b: 246, alpha: 1 },
    },
  })
    .composite([{ input: resizedLightBuf }])
    .png()
    .toFile(pngLightPath);
  recordAsset(path.relative(PROJECT_ROOT, pngLightPath), type, `${variant}-light-bg`, "png", w, h, false);

  // 4. JPG Dark-Bg (No Alpha)
  const jpgDarkPath = `${destBaseName}-dark-bg.jpg`;
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { r: 10, g: 13, b: 16 },
    },
  })
    .composite([{ input: resizedTransBuf }])
    .jpeg({ quality: 92 })
    .toFile(jpgDarkPath);
  recordAsset(path.relative(PROJECT_ROOT, jpgDarkPath), type, `${variant}-dark-bg`, "jpg", w, h, false);

  // 5. WebP Dark-Bg
  const webpDarkPath = `${destBaseName}-dark-bg.webp`;
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 10, g: 13, b: 16, alpha: 1 },
    },
  })
    .composite([{ input: resizedTransBuf }])
    .webp({ quality: 90 })
    .toFile(webpDarkPath);
  recordAsset(path.relative(PROJECT_ROOT, webpDarkPath), type, `${variant}-dark-bg`, "webp", w, h, false);
}

// ---------------------------------------------------------------------------
// SVG Template Generators
// ---------------------------------------------------------------------------

function generateSplashSVG(concept, width, height) {
  const titleMap = {
    "boot-primary": "NEURODECK",
    "boot-minimal": "NEURODECK",
    "loading-models": "LOADING MODELS",
    "loading-agents": "ORCHESTRATING AGENTS",
    "offline-ready": "OFFLINE WORKSTATION",
    "safe-mode": "SAFE MODE ACTIVE",
    "update-applying": "APPLYING UPDATE",
    "error-recovery": "SYSTEM RECOVERY",
  };
  
  const subMap = {
    "boot-primary": "Initializing v6 execution layer...",
    "boot-minimal": "Low-motion environment active.",
    "loading-models": "Loading local Ollama weights...",
    "loading-agents": "Connecting neural routing nodes...",
    "offline-ready": "Zero remote connections required.",
    "safe-mode": "Subprocess diagnostic boot.",
    "update-applying": "Writing package blocks...",
    "error-recovery": "Resolving runtime exceptions...",
  };

  const titleText = titleMap[concept] ?? "NEURODECK";
  const subText = subMap[concept] ?? "AI Core Handshake...";

  const glyphScale = Math.min(width, height) * 0.00065;
  const glyphSize = Math.floor(512 * glyphScale);
  const glyphX = (width - glyphSize) / 2;
  const glyphY = height / 2 - glyphSize / 2 - 40;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#0A0D10"/>
      <!-- Grid -->
      <g stroke="#5EEBFF" stroke-width="1" opacity="0.04">
        ${Array.from({ length: Math.ceil(width / 40) }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="${height}"/>`).join("")}
        ${Array.from({ length: Math.ceil(height / 40) }, (_, i) => `<line x1="0" y1="${i * 40}" x2="${width}" y2="${i * 40}"/>`).join("")}
      </g>
      
      <!-- Central Monogram Glyph -->
      <g transform="translate(${glyphX}, ${glyphY}) scale(${glyphScale})">
        <path d="M 140 140 L 200 140 L 200 372 L 140 372 Z M 312 140 L 372 140 L 372 372 L 312 372 Z M 200 140 L 260 140 L 372 372 L 312 372 Z" fill="#5EEBFF" opacity="0.1" filter="blur(8px)"/>
        <path d="M 140 140 L 200 140 L 200 372 L 140 372 Z M 312 140 L 372 140 L 372 372 L 312 372 Z M 200 140 L 260 140 L 372 372 L 312 372 Z" fill="linear-gradient(to right, #5EEBFF, #7CFFB2)"/>
        <circle cx="170" cy="140" r="16" fill="#5EEBFF"/><circle cx="170" cy="140" r="8" fill="#FFFFFF"/>
        <circle cx="170" cy="372" r="16" fill="#5EEBFF"/><circle cx="170" cy="372" r="8" fill="#FFFFFF"/>
        <circle cx="342" cy="140" r="16" fill="#5EEBFF"/><circle cx="342" cy="140" r="8" fill="#FFFFFF"/>
        <circle cx="342" cy="372" r="16" fill="#5EEBFF"/><circle cx="342" cy="372" r="8" fill="#FFFFFF"/>
      </g>
      
      <!-- Title -->
      <text x="${width / 2}" y="${height / 2 + glyphSize / 2 + 30}" font-family="monospace" font-size="32" font-weight="bold" fill="#5EEBFF" letter-spacing="8" text-anchor="middle">${titleText}</text>
      <!-- Subtitle -->
      <text x="${width / 2}" y="${height / 2 + glyphSize / 2 + 64}" font-family="sans-serif" font-size="14" font-weight="600" fill="#8DA1B3" letter-spacing="3" text-anchor="middle">${subText}</text>
    </svg>
  `;
}

function generateMarketingSVG(concept, width, height) {
  const concepts = {
    "hero-main": { title: "NEURODECK", desc: "Handheld AI Workstation optimized for Steam Deck" },
    "controller-first": { title: "CONTROLLER UX", desc: "Native gamepad navigation. Zero desktop friction." },
    "local-ai": { title: "LOCAL WORKSTATION", desc: "Completely offline Ollama and vector DB runtime" },
    "agent-workspace": { title: "AGENT ENGINE", desc: "Autonomous workspaces with direct file and PTY access" },
    "steam-deck-optimized": { title: "STEAM DECK NATIVE", desc: "Custom 1280x800 HUD calibrated for gamescope overlays" },
    "secure-electron": { title: "SANDBOX SECURITY", desc: "Hardened Content Security Policies and local keyrings" },
    "theme-system": { title: "TACTICAL GLAZING", desc: "Apple TV-style glassmorphic panels and custom gradients" },
  };

  const data = concepts[concept] ?? { title: "NEURODECK", desc: "Handheld AI Workstation" };

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#0A0D10"/>
      <!-- Background Radial Gradient -->
      <circle cx="${width * 0.7}" cy="${height * 0.5}" r="${width * 0.4}" fill="url(#rad)" opacity="0.12"/>
      
      <!-- Grid -->
      <g stroke="#5EEBFF" stroke-width="1" opacity="0.05">
        ${Array.from({ length: Math.ceil(width / 48) }, (_, i) => `<line x1="${i * 48}" y1="0" x2="${i * 48}" y2="${height}"/>`).join("")}
        ${Array.from({ length: Math.ceil(height / 48) }, (_, i) => `<line x1="0" y1="${i * 48}" x2="${width}" y2="${i * 48}"/>`).join("")}
      </g>
      
      <!-- Content Block -->
      <g transform="translate(100, 0)">
        <text x="0" y="${height * 0.45}" font-family="monospace" font-size="72" font-weight="bold" fill="#5EEBFF" letter-spacing="10">${data.title}</text>
        <text x="0" y="${height * 0.57}" font-family="sans-serif" font-size="24" font-weight="600" fill="#7CFFB2" letter-spacing="4">TACTICAL CONSOLE ENGINE</text>
        <text x="0" y="${height * 0.67}" font-family="sans-serif" font-size="18" fill="#8DA1B3" letter-spacing="1">${data.desc}</text>
      </g>

      <defs>
        <radialGradient id="rad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#5EEBFF"/>
          <stop offset="100%" stop-color="#7CFFB2" stop-opacity="0"/>
        </radialGradient>
      </defs>
    </svg>
  `;
}

// 20 Feature Area SVGs Dictionary
const FEATURE_PATHS = {
  workspace: '<rect x="12" y="12" width="16" height="16" rx="2" stroke="#5EEBFF" stroke-width="2" fill="none"/><rect x="32" y="12" width="16" height="16" rx="2" stroke="#5EEBFF" stroke-width="2" fill="none"/><rect x="12" y="32" width="36" height="16" rx="2" stroke="#5EEBFF" stroke-width="2" fill="none"/>',
  models: '<polygon points="32,8 52,24 40,52 24,52 12,24" stroke="#5EEBFF" stroke-width="2" fill="none"/><polygon points="32,18 44,28 36,44 28,44 20,28" stroke="#7CFFB2" stroke-width="1.5" fill="none"/>',
  agents: '<circle cx="32" cy="32" r="8" stroke="#5EEBFF" stroke-width="3" fill="none"/><circle cx="16" cy="16" r="4" fill="#7CFFB2"/><circle cx="48" cy="16" r="4" fill="#7CFFB2"/><circle cx="32" cy="50" r="4" fill="#7CFFB2"/><line x1="20" y1="20" x2="26" y2="26" stroke="#5EEBFF" stroke-width="2"/><line x1="44" y1="20" x2="38" y2="26" stroke="#5EEBFF" stroke-width="2"/><line x1="32" y1="46" x2="32" y2="40" stroke="#5EEBFF" stroke-width="2"/>',
  memory: '<path d="M 12 20 C 12 12, 32 12, 32 24 C 32 12, 52 12, 52 20 C 52 38, 32 48, 32 52 C 32 48, 12 38, 12 20 Z" stroke="#5EEBFF" stroke-width="2" fill="none"/><line x1="24" y1="24" x2="40" y2="24" stroke="#7CFFB2" stroke-width="1.5"/><line x1="20" y1="32" x2="44" y2="32" stroke="#7CFFB2" stroke-width="1.5"/>',
  sessions: '<rect x="12" y="12" width="40" height="40" rx="4" stroke="#5EEBFF" stroke-width="2" fill="none"/><line x1="12" y1="24" x2="52" y2="24" stroke="#5EEBFF" stroke-width="1.5"/><circle cx="20" cy="18" r="2" fill="#7CFFB2"/><circle cx="28" cy="18" r="2" fill="#7CFFB2"/><circle cx="36" cy="18" r="2" fill="#7CFFB2"/>',
  settings: '<circle cx="32" cy="32" r="8" stroke="#5EEBFF" stroke-width="3" fill="none"/><path d="M 32 12 L 32 16 M 32 48 L 32 52 M 12 32 L 16 32 M 48 32 L 52 32 M 18 18 L 21 21 M 43 43 L 46 46 M 18 46 L 21 43 M 43 18 L 46 21" stroke="#5EEBFF" stroke-width="3" stroke-linecap="round"/>',
  terminal: '<polyline points="16,16 28,32 16,48" stroke="#5EEBFF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="32" y1="48" x2="48" y2="48" stroke="#7CFFB2" stroke-width="3" stroke-linecap="round"/>',
  browser: '<circle cx="32" cy="32" r="20" stroke="#5EEBFF" stroke-width="2" fill="none"/><ellipse cx="32" cy="32" rx="8" ry="20" stroke="#5EEBFF" stroke-width="1.5" fill="none"/><line x1="12" y1="32" x2="52" y2="32" stroke="#5EEBFF" stroke-width="1.5"/>',
  vpn: '<rect x="12" y="24" width="40" height="26" rx="4" stroke="#5EEBFF" stroke-width="2" fill="none"/><path d="M 20 24 L 20 18 C 20 12, 44 12, 44 18 L 44 24" stroke="#7CFFB2" stroke-width="2" fill="none"/><circle cx="32" cy="37" r="4" fill="#5EEBFF"/>',
  diagnostics: '<polyline points="10,32 20,32 26,12 34,50 40,28 46,32 54,32" stroke="#5EEBFF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  plugins: '<path d="M 16 28 L 16 16 L 28 16 M 28 16 C 28 12, 36 12, 36 16 L 48 16 L 48 28 M 48 28 C 52 28, 52 36, 48 36 L 48 48 L 16 48 L 16 36" stroke="#5EEBFF" stroke-width="2.5" fill="none"/>',
  security: '<path d="M 32 12 C 44 12, 48 16, 48 16 C 48 36, 32 48, 32 50 C 32 48, 16 36, 16 16 C 16 16, 20 12, 32 12 Z" stroke="#5EEBFF" stroke-width="2.5" fill="none"/><polyline points="24,28 30,34 40,22" stroke="#7CFFB2" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
  themes: '<circle cx="24" cy="24" r="8" fill="#5EEBFF"/><circle cx="40" cy="24" r="8" fill="#7CFFB2"/><circle cx="32" cy="38" r="8" fill="#FFC857" opacity="0.8"/>',
  updates: '<polyline points="20,28 32,40 44,28" stroke="#5EEBFF" stroke-width="3" fill="none" stroke-linecap="round"/><line x1="32" y1="12" x2="32" y2="38" stroke="#5EEBFF" stroke-width="3" stroke-linecap="round"/><path d="M 16 48 L 48 48" stroke="#7CFFB2" stroke-width="3" stroke-linecap="round"/>',
  "local-ai": '<rect x="16" y="16" width="32" height="32" rx="4" stroke="#5EEBFF" stroke-width="2.5" fill="none"/><circle cx="32" cy="32" r="6" fill="#7CFFB2"/><line x1="32" y1="8" x2="32" y2="16" stroke="#5EEBFF" stroke-width="2"/><line x1="32" y1="48" x2="32" y2="56" stroke="#5EEBFF" stroke-width="2"/><line x1="8" y1="32" x2="16" y2="32" stroke="#5EEBFF" stroke-width="2"/><line x1="48" y1="32" x2="56" y2="32" stroke="#5EEBFF" stroke-width="2"/>',
  "cloud-sync": '<path d="M 18 38 A 8 8 0 0 1 24 24 A 12 12 0 0 1 44 26 A 8 8 0 0 1 48 38 Z" stroke="#5EEBFF" stroke-width="2" fill="none"/><polyline points="26,38 32,44 38,38" stroke="#7CFFB2" stroke-width="2" fill="none"/>',
  "controller-mode": '<path d="M 16 20 C 12 20, 8 28, 8 36 C 8 44, 16 48, 22 46 C 26 44, 28 40, 32 40 C 36 40, 38 44, 42 46 C 48 48, 56 44, 56 36 C 56 28, 52 20, 48 20 Z" stroke="#5EEBFF" stroke-width="2.5" fill="none"/><circle cx="20" cy="32" r="3" fill="#7CFFB2"/><circle cx="44" cy="28" r="2" fill="#5EEBFF"/><circle cx="48" cy="34" r="2" fill="#5EEBFF"/>',
  "steam-deck-mode": '<rect x="8" y="16" width="48" height="32" rx="6" stroke="#5EEBFF" stroke-width="2.5" fill="none"/><rect x="18" y="20" width="28" height="24" rx="2" stroke="#7CFFB2" stroke-width="1.5" fill="none"/><circle cx="13" cy="26" r="2" fill="#5EEBFF"/><circle cx="51" cy="30" r="2" fill="#5EEBFF"/>',
  performance: '<path d="M 12 44 C 12 20, 52 20, 52 44" stroke="#5EEBFF" stroke-width="3.5" fill="none" stroke-linecap="round"/><line x1="32" y1="44" x2="44" y2="28" stroke="#7CFFB2" stroke-width="3" stroke-linecap="round"/>',
  logs: '<line x1="14" y1="18" x2="50" y2="18" stroke="#5EEBFF" stroke-width="2.5"/><line x1="14" y1="28" x2="38" y2="28" stroke="#5EEBFF" stroke-width="2.5"/><line x1="14" y1="38" x2="46" y2="38" stroke="#5EEBFF" stroke-width="2.5"/><polyline points="44,28 48,32 54,24" stroke="#7CFFB2" stroke-width="2.5" fill="none"/>',
};

function generateFeatureIconSVG(featurePath) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <rect width="64" height="64" rx="12" fill="#0A0D10" stroke="#1F2937" stroke-width="1.5"/>
      <g transform="translate(0, 0)">
        ${featurePath}
      </g>
    </svg>
  `;
}

// ---------------------------------------------------------------------------
// Execution Entry Point
// ---------------------------------------------------------------------------

async function main() {
  console.log("NEURODECK Brand Asset Generator Pipeline starting...");
  console.log("====================================================");

  // 1. Logo Generation
  console.log("\n1. Processing Logo Masters...");
  const logoSizes = [256, 512, 1024, 2048, 4096];
  for (const size of logoSizes) {
    const destBase = path.join(ASSETS_DIR, "png", "logo", `neurodeck-logo-primary-transparent-${size}`);
    await processLogo(SRC_LOGO, destBase, "logo", "primary", size, size);
    console.log(`   [logo] Done primary logo family at ${size}x${size}`);
  }

  // 2. Glyph Generation
  console.log("\n2. Processing Glyph Masters...");
  const glyphSizes = [16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 1024];
  for (const size of glyphSizes) {
    const destBase = path.join(ASSETS_DIR, "png", "glyph", `neurodeck-glyph-transparent-${size}`);
    await processLogo(SRC_GLYPH, destBase, "glyph", "monogram", size, size);
    console.log(`   [glyph] Done monogram family at ${size}x${size}`);
  }

  // 3. Wordmark Generation
  console.log("\n3. Processing Wordmark Masters...");
  const wordmarkSizes = [
    { w: 1024, h: 256 },
    { w: 2048, h: 512 },
    { w: 4096, h: 1024 },
  ];
  for (const size of wordmarkSizes) {
    const destBase = path.join(ASSETS_DIR, "png", "wordmark", `neurodeck-wordmark-horizontal-transparent-${size.w}x${size.h}`);
    await processLogo(SRC_WORDMARK, destBase, "wordmark", "logotype", size.w, size.h);
    console.log(`   [wordmark] Done logotype family at ${size.w}x${size.h}`);
  }

  // 4. Full Lockups
  console.log("\n4. Processing Lockups...");
  // Horizontal Lockup 2048x512
  const lockupHBase = path.join(ASSETS_DIR, "png", "lockups", "neurodeck-lockup-horizontal-transparent-2048x512");
  await processLogo(SRC_LOGO, lockupHBase, "lockup", "horizontal", 2048, 512);

  // Stacked Lockup 2048x2048 (Composite Glyph on top of Wordmark)
  const stackedSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" width="2048" height="2048">
      <rect width="2048" height="2048" fill="#0A0D10"/>
      <!-- Grid -->
      <g stroke="#5EEBFF" stroke-width="2" opacity="0.04">
        ${Array.from({ length: 32 }, (_, i) => `<line x1="${i * 64}" y1="0" x2="${i * 64}" y2="2048"/>`).join("")}
        ${Array.from({ length: 32 }, (_, i) => `<line x1="0" y1="${i * 64}" x2="2048" y2="${i * 64}"/>`).join("")}
      </g>
      <!-- Glyph centered at top -->
      <g transform="translate(512, 128) scale(2)">
        <path d="M 140 140 L 200 140 L 200 372 L 140 372 Z M 312 140 L 372 140 L 372 372 L 312 372 Z M 200 140 L 260 140 L 372 372 L 312 372 Z" fill="#5EEBFF" opacity="0.1" filter="blur(12px)"/>
        <path d="M 140 140 L 200 140 L 200 372 L 140 372 Z M 312 140 L 372 140 L 372 372 L 312 372 Z M 200 140 L 260 140 L 372 372 L 312 372 Z" fill="url(#primaryGrad)"/>
        <circle cx="170" cy="140" r="16" fill="#5EEBFF"/><circle cx="170" cy="140" r="8" fill="#FFFFFF"/>
        <circle cx="170" cy="372" r="16" fill="#5EEBFF"/><circle cx="170" cy="372" r="8" fill="#FFFFFF"/>
        <circle cx="342" cy="140" r="16" fill="#5EEBFF"/><circle cx="342" cy="140" r="8" fill="#FFFFFF"/>
        <circle cx="342" cy="372" r="16" fill="#5EEBFF"/><circle cx="342" cy="372" r="8" fill="#FFFFFF"/>
      </g>
      <!-- Wordmark centered below -->
      <g transform="translate(0, 1180)">
        <text x="1024" y="200" font-family="monospace" font-size="160" font-weight="bold" fill="#5EEBFF" letter-spacing="12" text-anchor="middle">NEURODECK</text>
        <text x="1024" y="320" font-family="sans-serif" font-size="36" font-weight="600" fill="#7CFFB2" letter-spacing="8" text-anchor="middle">AI-NATIVE TERMINAL OS</text>
      </g>
      <defs>
        <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#5EEBFF" />
          <stop offset="100%" stop-color="#7CFFB2" />
        </linearGradient>
      </defs>
    </svg>
  `;
  const lockupSBase = path.join(ASSETS_DIR, "png", "lockups", "neurodeck-lockup-stacked-transparent-2048x2048");
  await processLogo(Buffer.from(stackedSVG), lockupSBase, "lockup", "stacked", 2048, 2048);
  console.log("   [lockups] Done horizontal and stacked lockups");

  // 5. Monochrome and Accessibility Variants
  console.log("\n5. Processing Monochrome & Accessibility Variants...");
  const monoWPath = path.join(ASSETS_DIR, "png", "logo", "neurodeck-logo-mono-white-transparent-1024.png");
  const monoWSvg = prepareSvg(SRC_LOGO, "#ffffff");
  await sharp(monoWSvg).resize(1024, 1024).png().toFile(monoWPath);
  recordAsset(path.relative(PROJECT_ROOT, monoWPath), "logo", "mono-white", "png", 1024, 1024, true);

  const monoBPath = path.join(ASSETS_DIR, "png", "logo", "neurodeck-logo-mono-black-transparent-1024.png");
  const monoBSvg = prepareSvg(SRC_LOGO, "#000000");
  await sharp(monoBSvg).resize(1024, 1024).png().toFile(monoBPath);
  recordAsset(path.relative(PROJECT_ROOT, monoBPath), "logo", "mono-black", "png", 1024, 1024, true);

  // High contrast uses transparent original colors
  const hcPath = path.join(ASSETS_DIR, "png", "logo", "neurodeck-logo-high-contrast-1024.png");
  const hcSvg = prepareSvg(SRC_LOGO);
  await sharp(hcSvg).resize(1024, 1024).png().toFile(hcPath);
  recordAsset(path.relative(PROJECT_ROOT, hcPath), "logo", "high-contrast", "png", 1024, 1024, true);

  // Low vision uses transparent original colors
  const lvPath = path.join(ASSETS_DIR, "png", "logo", "neurodeck-logo-low-vision-1024.png");
  const lvSvg = prepareSvg(SRC_LOGO);
  await sharp(lvSvg).resize(1024, 1024).png().toFile(lvPath);
  recordAsset(path.relative(PROJECT_ROOT, lvPath), "logo", "low-vision", "png", 1024, 1024, true);
  console.log("   [accessibility] Done mono & accessibility exports");

  // 6. Platform App Icons
  console.log("\n6. Processing Platform App Icons...");
  const appSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  const icoBuffers = [];

  for (const size of appSizes) {
    const iconPath = path.join(ASSETS_DIR, "app-icons", "png", `icon-${size}.png`);
    const buf = await sharp(SRC_GLYPH).resize(size, size).png().toBuffer();
    fs.writeFileSync(iconPath, buf);
    recordAsset(path.relative(PROJECT_ROOT, iconPath), "app-icon", "launcher", "png", size, size, true);

    // Copy to tauri icons folder for compilation
    const tauriIconPath = path.join(TAURI_ICONS_DIR, size === 512 ? "icon.png" : `${size}x${size}.png`);
    fs.writeFileSync(tauriIconPath, buf);

    if ([16, 24, 32, 48, 64, 128, 256].includes(size)) {
      icoBuffers.push({ width: size, height: size, buffer: buf });
    }
  }

  // Windows icon.ico
  const icoPath = path.join(ASSETS_DIR, "app-icons", "windows", "icon.ico");
  writeIco(icoBuffers, icoPath);
  recordAsset(path.relative(PROJECT_ROOT, icoPath), "app-icon", "launcher", "ico", 256, 256, true);
  
  // Copy to tauri icons folder
  fs.writeFileSync(path.join(TAURI_ICONS_DIR, "icon.ico"), fs.readFileSync(icoPath));

  // Linux app icon
  const linuxIconPath = path.join(ASSETS_DIR, "app-icons", "linux", "icon.png");
  fs.writeFileSync(linuxIconPath, fs.readFileSync(path.join(ASSETS_DIR, "app-icons", "png", "icon-512.png")));
  recordAsset(path.relative(PROJECT_ROOT, linuxIconPath), "app-icon", "launcher", "png", 512, 512, true);

  console.log("   [app-icons] Done PNG set, Windows icon.ico, and Linux icon.png");

  // 7. Feature Icons Generation
  console.log("\n7. Processing 20 Feature Area Icons...");
  const featSizes = [24, 32, 48, 64, 128, 256];
  for (const [feat, svgPath] of Object.entries(FEATURE_PATHS)) {
    const svgStr = generateFeatureIconSVG(svgPath);
    const svgBuf = Buffer.from(svgStr);

    for (const size of featSizes) {
      const featPngPath = path.join(ASSETS_DIR, "feature-icons", "png", `${feat}-${size}.png`);
      await sharp(svgBuf).resize(size, size).png().toFile(featPngPath);
      recordAsset(path.relative(PROJECT_ROOT, featPngPath), "feature-icon", feat, "png", size, size, true);

      if (size === 128 || size === 256) {
        const featWebpPath = path.join(ASSETS_DIR, "feature-icons", "webp", `${feat}-${size}.webp`);
        await sharp(svgBuf).resize(size, size).webp({ quality: 90 }).toFile(featWebpPath);
        recordAsset(path.relative(PROJECT_ROOT, featWebpPath), "feature-icon", feat, "webp", size, size, true);
      }
    }
    console.log(`   [feature] Generated set for: ${feat}`);
  }

  // 8. Splash / Boot Screen Generation
  console.log("\n8. Processing Splash Screens...");
  const splashConcepts = [
    "boot-primary",
    "boot-minimal",
    "loading-models",
    "loading-agents",
    "offline-ready",
    "safe-mode",
    "update-applying",
    "error-recovery",
  ];
  const splashSizes = [
    { w: 1280, h: 800 }, // Steam Deck LCD
    { w: 1280, h: 720 }, // HD
    { w: 1920, h: 1080 }, // Full HD
    { w: 2560, h: 1440 }, // QHD
    { w: 3840, h: 2160 }, // UHD
  ];

  for (const concept of splashConcepts) {
    for (const sz of splashSizes) {
      const splashSVG = generateSplashSVG(concept, sz.w, sz.h);
      const svgBuf = Buffer.from(splashSVG);

      // PNG
      const pngPath = path.join(ASSETS_DIR, "png", "splash", `neurodeck-splash-${concept}-${sz.w}x${sz.h}.png`);
      await sharp(svgBuf).png().toFile(pngPath);
      recordAsset(path.relative(PROJECT_ROOT, pngPath), "splash", concept, "png", sz.w, sz.h, false);

      // JPG
      const jpgPath = path.join(ASSETS_DIR, "jpg", "splash", `neurodeck-splash-${concept}-${sz.w}x${sz.h}.jpg`);
      await sharp(svgBuf).jpeg({ quality: 90 }).toFile(jpgPath);
      recordAsset(path.relative(PROJECT_ROOT, jpgPath), "splash", concept, "jpg", sz.w, sz.h, false);

      // WebP
      const webpPath = path.join(ASSETS_DIR, "webp", "splash", `neurodeck-splash-${concept}-${sz.w}x${sz.h}.webp`);
      await sharp(svgBuf).webp({ quality: 88 }).toFile(webpPath);
      recordAsset(path.relative(PROJECT_ROOT, webpPath), "splash", concept, "webp", sz.w, sz.h, false);
    }
    console.log(`   [splash] Done concept: ${concept}`);
  }

  // 9. Marketing Banners & Hero Images
  console.log("\n9. Processing Marketing Images...");
  const marketingConcepts = [
    "hero-main",
    "controller-first",
    "local-ai",
    "agent-workspace",
    "steam-deck-optimized",
    "secure-electron",
    "theme-system",
  ];
  const marketingSizes = [
    { w: 1920, h: 1080 },
    { w: 2560, h: 1440 },
    { w: 3840, h: 2160 },
  ];

  for (const concept of marketingConcepts) {
    const sizesToUse = concept === "hero-main" ? marketingSizes : [{ w: 1920, h: 1080 }];
    for (const sz of sizesToUse) {
      const marketingSVG = generateMarketingSVG(concept, sz.w, sz.h);
      const svgBuf = Buffer.from(marketingSVG);

      // PNG
      const pngPath = path.join(ASSETS_DIR, "png", "marketing", `neurodeck-marketing-${concept}-${sz.w}x${sz.h}.png`);
      await sharp(svgBuf).png().toFile(pngPath);
      recordAsset(path.relative(PROJECT_ROOT, pngPath), "marketing", concept, "png", sz.w, sz.h, false);

      // JPG
      const jpgPath = path.join(ASSETS_DIR, "jpg", "marketing", `neurodeck-marketing-${concept}-${sz.w}x${sz.h}.jpg`);
      await sharp(svgBuf).jpeg({ quality: 92 }).toFile(jpgPath);
      recordAsset(path.relative(PROJECT_ROOT, jpgPath), "marketing", concept, "jpg", sz.w, sz.h, false);

      // WebP
      const webpPath = path.join(ASSETS_DIR, "webp", "marketing", `neurodeck-marketing-${concept}-${sz.w}x${sz.h}.webp`);
      await sharp(svgBuf).webp({ quality: 90 }).toFile(webpPath);
      recordAsset(path.relative(PROJECT_ROOT, webpPath), "marketing", concept, "webp", sz.w, sz.h, false);
    }
    console.log(`   [marketing] Done concept: ${concept}`);
  }

  // 10. Social Preview Images
  console.log("\n10. Processing Social Preview Images...");
  const socialTargets = [
    { name: "github-social-preview", w: 1280, h: 640 },
    { name: "x-preview", w: 1600, h: 900 },
    { name: "discord-preview", w: 1200, h: 630 },
    { name: "docs-cover", w: 1920, h: 1080 },
  ];

  for (const tgt of socialTargets) {
    const socialSVG = generateMarketingSVG(tgt.name, tgt.w, tgt.h);
    const svgBuf = Buffer.from(socialSVG);

    // PNG
    const pngPath = path.join(ASSETS_DIR, "social", "png", `${tgt.name}-${tgt.w}x${tgt.h}.png`);
    await sharp(svgBuf).png().toFile(pngPath);
    recordAsset(path.relative(PROJECT_ROOT, pngPath), "social-preview", tgt.name, "png", tgt.w, tgt.h, false);

    // JPG
    const jpgPath = path.join(ASSETS_DIR, "social", "jpg", `${tgt.name}-${tgt.w}x${tgt.h}.jpg`);
    await sharp(svgBuf).jpeg({ quality: 92 }).toFile(jpgPath);
    recordAsset(path.relative(PROJECT_ROOT, jpgPath), "social-preview", tgt.name, "jpg", tgt.w, tgt.h, false);

    // WebP
    const webpPath = path.join(ASSETS_DIR, "social", "webp", `${tgt.name}-${tgt.w}x${tgt.h}.webp`);
    await sharp(svgBuf).webp({ quality: 90 }).toFile(webpPath);
    recordAsset(path.relative(PROJECT_ROOT, webpPath), "social-preview", tgt.name, "webp", tgt.w, tgt.h, false);
  }
  console.log("    [social-preview] Generated GitHub, X, Discord, and Docs assets");

  // 11. Store Capsule Images
  console.log("\n11. Processing Store Capsule Assets...");
  const storeTargets = [
    { name: "neurodeck-store-header", w: 1920, h: 620 },
    { name: "neurodeck-store-card", w: 1200, h: 1600 },
    { name: "neurodeck-store-wide", w: 1920, h: 1080 },
    { name: "neurodeck-store-square", w: 1024, h: 1024 },
  ];

  for (const tgt of storeTargets) {
    const storeSVG = generateMarketingSVG(tgt.name, tgt.w, tgt.h);
    const svgBuf = Buffer.from(storeSVG);

    // PNG
    const pngPath = path.join(ASSETS_DIR, "store", "png", `${tgt.name}.png`);
    await sharp(svgBuf).png().toFile(pngPath);
    recordAsset(path.relative(PROJECT_ROOT, pngPath), "store-capsule", tgt.name, "png", tgt.w, tgt.h, false);

    // JPG
    const jpgPath = path.join(ASSETS_DIR, "store", "jpg", `${tgt.name}.jpg`);
    await sharp(svgBuf).jpeg({ quality: 92 }).toFile(jpgPath);
    recordAsset(path.relative(PROJECT_ROOT, jpgPath), "store-capsule", tgt.name, "jpg", tgt.w, tgt.h, false);

    // WebP
    const webpPath = path.join(ASSETS_DIR, "store", "webp", `${tgt.name}.webp`);
    await sharp(svgBuf).webp({ quality: 90 }).toFile(webpPath);
    recordAsset(path.relative(PROJECT_ROOT, webpPath), "store-capsule", tgt.name, "webp", tgt.w, tgt.h, false);
  }
  console.log("    [store-capsules] Generated header, card, wide, and square capsule outputs");

  // 12. Favicon Outputs
  console.log("\n12. Processing Favicons...");
  // favicon.svg is the ONLY SVG final file allowed in the deliverables.
  const favSvgPath = path.join(ASSETS_DIR, "favicon", "favicon.svg");
  fs.copyFileSync(SRC_FAVICON, favSvgPath);
  recordAsset(path.relative(PROJECT_ROOT, favSvgPath), "favicon", "vector", "svg", 512, 512, true);

  const favSizes = [16, 32, 48, 64, 128, 256];
  for (const size of favSizes) {
    const favPngPath = path.join(ASSETS_DIR, "favicon", `favicon-${size}.png`);
    await sharp(SRC_FAVICON).resize(size, size).png().toFile(favPngPath);
    recordAsset(path.relative(PROJECT_ROOT, favPngPath), "favicon", `raster-${size}`, "png", size, size, true);
  }
  console.log("    [favicon] Generated vector favicon.svg and raster PNG sizes");

  // 13. Write Manifest
  console.log("\n13. Writing Asset Manifest...");
  const manifestData = {
    project: "NEURODECK",
    version: "1.8.0",
    generatedAt: new Date().toISOString(),
    sourceFiles: [
      "assets/brand/source/neurodeck-glyph-master.svg",
      "assets/brand/source/neurodeck-wordmark-master.svg",
      "assets/brand/source/neurodeck-logo-master.svg",
      "assets/brand/source/neurodeck-favicon-master.svg",
    ],
    assets: manifestAssets,
  };
  const manifestPath = path.join(ASSETS_DIR, "manifest.brand-assets.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));
  console.log(`    [manifest] Saved: ${manifestPath}`);

  // 14. Write Checksums file (SHA256 of all assets)
  console.log("\n14. Writing SHA256 Checksums...");
  let checksumsData = "";
  for (const asset of manifestAssets) {
    checksumsData += `${asset.sha256}  ${asset.path}\n`;
  }
  const checksumsPath = path.join(ASSETS_DIR, "checksums.sha256");
  fs.writeFileSync(checksumsPath, checksumsData);
  console.log(`    [checksums] Saved: ${checksumsPath}`);

  console.log("\n====================================================");
  console.log("NEURODECK Brand Asset Generator Pipeline Complete!");
}

main().catch((err) => {
  console.error("Pipeline failure:", err);
  process.exit(1);
});
