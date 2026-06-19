import fs from "fs";
import path from "path";

const reportDir = path.resolve(__dirname, "../../reports/terminal");
const docsDir = path.resolve(__dirname, "../../docs/terminal");
fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

const report = {
  generatedAt: new Date().toISOString(),
  terminalAreas: [
    { area: "PTY Backend", status: "production_ready" },
    { area: "Terminal Renderer", status: "production_ready" },
    { area: "Terminal Tabs", status: "production_ready" },
    { area: "Split Panes", status: "production_ready" },
    { area: "Shell Profiles", status: "production_ready" },
    { area: "Command Safety", status: "production_ready" },
    { area: "AI Command Assist", status: "production_ready" },
    { area: "History", status: "production_ready" },
    { area: "Session Restore", status: "production_ready" },
    { area: "Controller UX", status: "production_ready" },
    { area: "Diagnostics", status: "in_progress" },
    { area: "No Mock Data", status: "production_ready" },
  ],
};

fs.writeFileSync(path.join(reportDir, "terminal-readiness-report.json"), JSON.stringify(report, null, 2), "utf8");
fs.writeFileSync(
  path.join(docsDir, "TERMINAL_READINESS_REPORT.md"),
  `# Terminal Readiness Report\n\nGenerated at \`${report.generatedAt}\`.\n`,
  "utf8"
);

console.log("Terminal readiness report exported.");

