/**
 * export-ide-readiness-report.ts
 * Generates:
 *   reports/ide/ide-readiness-report.json
 *   docs/ide/IDE_READINESS_REPORT.md
 */
import * as fs from 'fs';
import * as path from 'path';

const PROFILES_DIR = path.resolve(__dirname, '../../assets/language-profiles');
const LSP_MANAGER = path.resolve(__dirname, '../../electron/services/lsp/lsp-manager.js');
const IPC_REGISTRY = path.resolve(__dirname, '../../electron/ipc-registry.js');
const ACTION_REGISTRY = path.resolve(__dirname, '../../src/renderer/utils/controller/action-registry.ts');
const REPORTS_DIR = path.resolve(__dirname, '../../reports/ide');
const DOCS_DIR = path.resolve(__dirname, '../../docs/ide');

interface LanguageReport {
  id: string;
  displayName: string;
  fileExtensions: string[];
  lspServer: string;
  commandCount: number;
  snippetCount: number;
  allowRunByDefault: boolean;
  blockedCommands: number;
}

interface LspReport {
  channelsRegistered: string[];
  managerExists: boolean;
  preloadMethods: string[];
}

interface ControllerReport {
  ideActionsRegistered: string[];
  modeBindings: string[];
}

interface IdeReadinessReport {
  generatedAt: string;
  version: string;
  languages: LanguageReport[];
  lsp: LspReport;
  controller: ControllerReport;
  summary: {
    totalLanguages: number;
    totalCommands: number;
    totalSnippets: number;
    lspChannels: number;
    ideActions: number;
  };
}

function readProfiles(): LanguageReport[] {
  const reports: LanguageReport[] = [];
  if (!fs.existsSync(PROFILES_DIR)) return reports;

  for (const file of fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith('.json'))) {
    const raw = JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, file), 'utf8'));
    let profiles: any[];
    if (Array.isArray(raw)) {
      profiles = raw;
    } else if (raw.profiles && Array.isArray(raw.profiles)) {
      profiles = raw.profiles;
    } else {
      profiles = [raw];
    }

    for (const p of profiles) {
      const commands: any[] = [];
      if (p.commands) {
        for (const key of Object.keys(p.commands)) {
          const val = p.commands[key];
          if (Array.isArray(val)) commands.push(...val);
          else if (val) commands.push(val);
        }
      }
      reports.push({
        id: p.id,
        displayName: p.displayName,
        fileExtensions: p.fileExtensions ?? [],
        lspServer: p.lsp?.serverCommand ?? 'none',
        commandCount: commands.length,
        snippetCount: (p.snippets ?? []).length,
        allowRunByDefault: p.safety?.allowRunByDefault ?? false,
        blockedCommands: (p.safety?.blockedCommands ?? []).length,
      });
    }
  }
  return reports;
}

function readLsp(): LspReport {
  const ipcContent = fs.existsSync(IPC_REGISTRY) ? fs.readFileSync(IPC_REGISTRY, 'utf8') : '';
  const channelsRegistered = [
    'lsp:start-server', 'lsp:stop-server', 'lsp:open-document', 'lsp:change-document',
    'lsp:close-document', 'lsp:completion', 'lsp:hover', 'lsp:definition', 'lsp:format',
  ].filter((ch) => ipcContent.includes(ch));

  const managerExists = fs.existsSync(LSP_MANAGER);

  const preloadContent = fs.existsSync(path.resolve(__dirname, '../../electron/preload.js'))
    ? fs.readFileSync(path.resolve(__dirname, '../../electron/preload.js'), 'utf8')
    : '';
  const preloadMethods = [
    'startServer', 'stopServer', 'openDocument', 'changeDocument', 'closeDocument',
    'completion', 'hover', 'definition', 'format', 'onDiagnostics', 'onStatusChanged',
  ].filter((m) => preloadContent.includes(m));

  return { channelsRegistered, managerExists, preloadMethods };
}

function readController(): ControllerReport {
  const content = fs.existsSync(ACTION_REGISTRY) ? fs.readFileSync(ACTION_REGISTRY, 'utf8') : '';
  const ideActions = [
    'IDE_ACCEPT_COMPLETION', 'IDE_NEXT_COMPLETION', 'IDE_PREV_COMPLETION',
    'IDE_DISMISS_COMPLETION', 'IDE_OPEN_COMMAND_WHEEL', 'IDE_FORMAT_FILE',
    'IDE_RUN_COMMAND', 'IDE_NEXT_DIAGNOSTIC', 'IDE_GO_TO_DEFINITION',
    'IDE_TOGGLE_PREDICTIVE_BAR', 'IDE_SAVE_FILE', 'IDE_PREV_TAB', 'IDE_NEXT_TAB',
    'IDE_CANCEL_COMMAND', 'IDE_CONFIRM_COMMAND', 'IDE_ENTER_EDIT_MODE', 'IDE_ENTER_NAVIGATION_MODE',
  ].filter((a) => content.includes(a));

  const modeBindings = [
    'ide_prediction', 'ide_edit', 'ide_navigation', 'ide_command', 'ide_snippet',
  ].filter((m) => content.includes(m));

  return { ideActionsRegistered: ideActions, modeBindings };
}

function generateMarkdown(report: IdeReadinessReport): string {
  const { languages, lsp, controller, summary } = report;

  const langTable = [
    '| Language | LSP Server | Commands | Snippets | Run by Default |',
    '|---|---|---|---|---|',
    ...languages.map((l) =>
      `| ${l.displayName} | \`${l.lspServer}\` | ${l.commandCount} | ${l.snippetCount} | ${l.allowRunByDefault ? '✅' : '🔒'} |`
    ),
  ].join('\n');

  const lspTable = [
    '| Channel | Registered |',
    '|---|---|',
    ...lsp.channelsRegistered.map((c) => `| \`${c}\` | ✅ |`),
  ].join('\n');

  const controllerTable = [
    '| Action | Registered |',
    '|---|---|',
    ...controller.ideActionsRegistered.map((a) => `| \`${a}\` | ✅ |`),
  ].join('\n');

  return `# IDE Readiness Report

> Generated: ${report.generatedAt}

## Summary

| Metric | Count |
|---|---|
| Languages | ${summary.totalLanguages} |
| Total Commands | ${summary.totalCommands} |
| Total Snippets | ${summary.totalSnippets} |
| LSP Channels | ${summary.lspChannels} |
| IDE Controller Actions | ${summary.ideActions} |

## Language Command Matrix

${langTable}

## LSP Channel Coverage

${lspTable}

### Preload Methods

${lsp.preloadMethods.map((m) => `- \`${m}\``).join('\n')}

LSP Manager exists: ${lsp.managerExists ? '✅' : '❌'}

## Controller Action Map

${controllerTable}

### Mode Bindings

${controller.modeBindings.map((m) => `- \`${m}\``).join('\n')}
`;
}

function main() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  const languages = readProfiles();
  const lsp = readLsp();
  const controller = readController();

  const report: IdeReadinessReport = {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    languages,
    lsp,
    controller,
    summary: {
      totalLanguages: languages.length,
      totalCommands: languages.reduce((s, l) => s + l.commandCount, 0),
      totalSnippets: languages.reduce((s, l) => s + l.snippetCount, 0),
      lspChannels: lsp.channelsRegistered.length,
      ideActions: controller.ideActionsRegistered.length,
    },
  };

  fs.writeFileSync(path.join(REPORTS_DIR, 'ide-readiness-report.json'), JSON.stringify(report, null, 2));
  console.log(`[OK] Written: reports/ide/ide-readiness-report.json`);

  fs.writeFileSync(path.join(DOCS_DIR, 'IDE_READINESS_REPORT.md'), generateMarkdown(report));
  console.log(`[OK] Written: docs/ide/IDE_READINESS_REPORT.md`);

  console.log(`\nSummary: ${report.summary.totalLanguages} languages, ${report.summary.totalCommands} commands, ${report.summary.totalSnippets} snippets, ${report.summary.lspChannels}/9 LSP channels, ${report.summary.ideActions} IDE actions`);
}

main();
