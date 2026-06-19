import * as fs from "fs";
import * as path from "path";

console.log("--- STARTING THEME TOKENS USAGE AUDIT ---");

let failure = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] Assertion failed: ${message}`);
    failure = true;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

// Allowed static colors (e.g., pure transparent, SVGs, black/white under certain specific utility context, or standard tailwind names)
const ALLOWED_INLINE_COLORS = [
  "transparent",
  "none",
  "inherit",
  "initial",
  "unset",
];

function scanFileForTokenUsage(filePath: string) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const ext = path.extname(filePath);

  let inlineStaticColorsCount = 0;

  if (ext === ".tsx" || ext === ".ts") {
    // Regex to find things like: style={{ backgroundColor: '#fff' }} or style={{ color: "red" }}
    const styleRegex = /style=\{\{\s*([a-zA-Z]+):\s*['"`](#[0-9A-Fa-f]{3,8}|rgb[a]?\([^)]+\)|[a-zA-Z]+)['"`]\s*\}\}/g;
    let match;
    while ((match = styleRegex.exec(content)) !== null) {
      const prop = match[1];
      const val = match[2];
      if (
        prop.toLowerCase().includes("color") ||
        prop.toLowerCase().includes("background") ||
        prop.toLowerCase().includes("border")
      ) {
        if (!ALLOWED_INLINE_COLORS.includes(val.toLowerCase()) && !val.includes("var(")) {
          console.warn(`[WARN] Static style color found in ${path.basename(filePath)}: ${match[0]}`);
          inlineStaticColorsCount++;
        }
      }
    }
  } else if (ext === ".css") {
    // Audit CSS declarations of color/background/border to ensure they use var(--nd-)
    const cssLines = content.split("\n");
    cssLines.forEach((line, idx) => {
      // Look for lines containing color/background/border but containing hex values or rgb/rgba without var(
      const hasHexOrRgb = /(#[0-9A-Fa-f]{3,8}|rgba?\(|hsla?\()/i.test(line);
      const isColorDeclaration = /(?:background|border|color)\s*:/i.test(line);
      const usesVar = /var\(--nd-/i.test(line) || /var\(--tw-/i.test(line) || /var\(--font-/i.test(line);
      const isAnimationOrImportOrComment = line.trim().startsWith("@") || line.trim().startsWith("/*") || line.trim().startsWith("*");

      if (isColorDeclaration && hasHexOrRgb && !usesVar && !isAnimationOrImportOrComment) {
        // Exclude some common utility/baseline styles
        if (
          !line.includes("linear-gradient") &&
          !line.includes("radial-gradient") &&
          !line.includes("transparent")
        ) {
          console.warn(`[WARN] Non-token CSS declaration in ${path.basename(filePath)} line ${idx + 1}: ${line.trim()}`);
        }
      }
    });
  }

  return inlineStaticColorsCount;
}

function run() {
  try {
    const reactDir = path.resolve(__dirname, "../../src/renderer");
    const cssFile = path.resolve(__dirname, "../../src/renderer/index.css");

    let totalWarnings = 0;

    if (fs.existsSync(cssFile)) {
      scanFileForTokenUsage(cssFile);
    }

    const walk = (dir: string) => {
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (file !== "node_modules" && file !== "__tests__") {
            walk(fullPath);
          }
        } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
          totalWarnings += scanFileForTokenUsage(fullPath);
        }
      }
    };

    if (fs.existsSync(reactDir)) {
      walk(reactDir);
    }

    assert(totalWarnings <= 10, `Static color bypass count: ${totalWarnings} (Target: minor/none, audit warning-level only)`);
  } catch (err: any) {
    console.error("Exception during token usage check:", err);
    failure = true;
  }

  if (failure) {
    console.error("--- THEME TOKENS USAGE AUDIT FAILED ---");
    process.exit(1);
  } else {
    console.log("--- THEME TOKENS USAGE AUDIT PASSED ---");
    process.exit(0);
  }
}

run();
