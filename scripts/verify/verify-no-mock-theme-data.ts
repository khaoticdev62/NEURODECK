import * as fs from "fs";
import * as path from "path";

console.log("--- STARTING NO MOCK THEME DATA AUDIT ---");

let failure = false;

function reportFailure(message: string) {
  console.error(`[FAIL] ${message}`);
  failure = true;
}

function reportSuccess(message: string) {
  console.log(`[PASS] ${message}`);
}

try {
  // 1. Scan codebase for forbidden mock terms in theme files
  const searchPaths = [
    path.resolve(__dirname, "../src/shared/theme"),
    path.resolve(__dirname, "../src/main/services/theme"),
    path.resolve(__dirname, "../frontend/src/react/theme"),
  ];

  const filesToScan: string[] = [];

  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        filesToScan.push(filePath);
      }
    }
  }

  for (const sPath of searchPaths) {
    walkDir(sPath);
  }

  reportSuccess(`Found ${filesToScan.length} theme source files to audit for mock data.`);

  const forbiddenMockPatterns = [
    { pattern: /mockTheme/i, name: "mockTheme variable/reference" },
    { pattern: /dummyTheme/i, name: "dummyTheme reference" },
    { pattern: /placeholderTheme/i, name: "placeholderTheme reference" },
    { pattern: /staticThemeSettings\s*=\s*\{\s*activeThemeId:\s*["']test["']/i, name: "Static mock settings" }
  ];

  let violationsCount = 0;
  for (const file of filesToScan) {
    const relativePath = path.relative(path.resolve(__dirname, ".."), file);
    const content = fs.readFileSync(file, "utf8");

    for (const rule of forbiddenMockPatterns) {
      if (rule.pattern.test(content)) {
        console.warn(`[WARN] ${relativePath} contains pattern matching "${rule.name}"`);
        violationsCount++;
      }
    }
  }

  assert(violationsCount === 0, "No mock theme configurations or test structures found in active codebase");

} catch (err: any) {
  reportFailure(`Unexpected exception during mock data audit: ${err.message}\n${err.stack}`);
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    reportFailure(message);
  } else {
    reportSuccess(message);
  }
}

if (failure) {
  console.error("--- NO MOCK THEME DATA AUDIT FAILED ---");
  process.exit(1);
} else {
  console.log("--- NO MOCK THEME DATA AUDIT PASSED ---");
  process.exit(0);
}
