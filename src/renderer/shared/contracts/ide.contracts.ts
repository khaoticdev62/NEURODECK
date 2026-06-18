/**
 * IDE / Predictive Coding contracts shared between renderer and main-process services.
 * These types describe the shape of data, not runtime behavior.
 */

export type CommandSafety = "safe" | "confirm" | "dangerous" | "blocked";

export type CwdStrategy =
  | "workspaceRoot"
  | "fileDirectory"
  | "nearestPackageRoot"
  | "nearestGitRoot";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "none";

export type SnippetPlaceholder = {
  index: number;
  label: string;
  defaultValue?: string;
};

export type CommandTemplate = {
  id: string;
  label: string;
  languageId: string;
  command: string;
  args: string[];
  cwdStrategy: CwdStrategy;
  appliesWhen: {
    fileExtensions?: string[];
    configFilesAny?: string[];
    configFilesAll?: string[];
    packageScripts?: string[];
    commandsAvailable?: string[];
  };
  safety: CommandSafety;
  description: string;
};

export type PredictiveSnippet = {
  id: string;
  languageId: string;
  label: string;
  description: string;
  triggerContexts: string[];
  insertText: string;
  placeholders: SnippetPlaceholder[];
  controllerFriendly: boolean;
  safety: "safe" | "confirm";
};

export type LspProfile = {
  serverId: string;
  serverCommand?: string;
  serverArgs?: string[];
  installHint?: string;
  supportsCompletion: boolean;
  supportsHover: boolean;
  supportsDefinition: boolean;
  supportsFormatting: boolean;
  supportsDiagnostics: boolean;
  supportsCodeActions: boolean;
};

export type LanguageProfile = {
  id: string;
  displayName: string;
  fileExtensions: string[];
  configFiles: string[];
  lsp: LspProfile;
  commands: {
    runFile?: CommandTemplate[];
    runProject?: CommandTemplate[];
    testFile?: CommandTemplate[];
    testProject?: CommandTemplate[];
    build?: CommandTemplate[];
    lint?: CommandTemplate[];
    format?: CommandTemplate[];
    typecheck?: CommandTemplate[];
    packageInstall?: CommandTemplate[];
    dependencyAdd?: CommandTemplate[];
  };
  snippets: PredictiveSnippet[];
  safety: {
    allowRunByDefault: boolean;
    requiresConfirmation: string[];
    blockedCommands: string[];
  };
};

export type ProjectContext = {
  rootPath: string;
  detectedLanguages: string[];
  packageManager: PackageManager;
  hasGit: boolean;
  configFiles: string[];
  availableScripts: Record<string, string>;
  detectedAt: string;
};

export type PredictionSource =
  | "lsp_completion"
  | "diagnostic_fix"
  | "snippet"
  | "command"
  | "ai_suggestion";

export type PredictionResult = {
  id: string;
  type: PredictionSource;
  label: string;
  insertText?: string;
  detail?: string;
  source: PredictionSource;
  confidence: number;
  languageId?: string;
  safety?: CommandSafety;
};

export type IdeMode =
  | "IDE_NAVIGATION"
  | "IDE_EDIT"
  | "IDE_PREDICTION"
  | "IDE_COMMAND"
  | "IDE_SNIPPET";

export type PredictionContext = {
  filePath: string;
  languageId: string;
  cursorLine: number;
  cursorChar: number;
  diagnosticsCount: number;
  projectContext?: ProjectContext;
};

export type CommandRunRequest = {
  commandId: string;
  command: string;
  args: string[];
  cwd: string;
  safety: CommandSafety;
  label: string;
};

export type CommandRunResult = {
  commandId: string;
  exitCode: number | null;
  cancelled: boolean;
  startedAt: string;
  endedAt: string;
};

export type CommandHistoryEntry = CommandRunRequest & {
  result: CommandRunResult;
};
