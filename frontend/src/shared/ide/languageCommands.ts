/**
 * Language command utilities — resolves real command templates based on
 * project context (detected package manager, config files, scripts).
 */
import type {
  CommandTemplate,
  LanguageProfile,
  PackageManager,
  ProjectContext,
} from "../contracts/ide.contracts";

const LOCKFILE_TO_PACKAGE_MANAGER: Record<string, PackageManager> = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lockb": "bun",
};

export function detectPackageManager(configFiles: string[]): PackageManager {
  for (const file of configFiles) {
    const base = file.split("/").pop() ?? file;
    const pm = LOCKFILE_TO_PACKAGE_MANAGER[base];
    if (pm) return pm;
  }
  return "none";
}

function commandApplies(cmd: CommandTemplate, ctx: ProjectContext): boolean {
  const w = cmd.appliesWhen;

  if (w.fileExtensions && w.fileExtensions.length > 0) {
    // File extension checks are handled at call site — skip here
  }

  if (w.configFilesAny && w.configFilesAny.length > 0) {
    const hasAny = w.configFilesAny.some((f) => ctx.configFiles.some((c) => c.endsWith(f)));
    if (!hasAny) return false;
  }

  if (w.configFilesAll && w.configFilesAll.length > 0) {
    const hasAll = w.configFilesAll.every((f) => ctx.configFiles.some((c) => c.endsWith(f)));
    if (!hasAll) return false;
  }

  if (w.packageScripts && w.packageScripts.length > 0) {
    const hasScript = w.packageScripts.some((s) => s in ctx.availableScripts);
    if (!hasScript) return false;
  }

  return true;
}

function filterByPackageManager(
  commands: CommandTemplate[],
  pm: PackageManager
): CommandTemplate[] {
  const pmCommands = commands.filter((cmd) => cmd.command === pm);
  if (pmCommands.length > 0) return pmCommands;
  // Fall back to npm commands if no specific pm match
  const npmFallback = commands.filter((cmd) => cmd.command === "npm");
  if (npmFallback.length > 0) return npmFallback;
  return commands;
}

export function getCommandsForContext(
  profile: LanguageProfile,
  ctx: ProjectContext,
  category?: keyof LanguageProfile["commands"]
): CommandTemplate[] {
  const allCommands: CommandTemplate[] = [];
  const categories = category
    ? [category]
    : (Object.keys(profile.commands) as Array<keyof LanguageProfile["commands"]>);

  for (const cat of categories) {
    const cmds = profile.commands[cat];
    if (!cmds) continue;
    const applicable = cmds.filter((cmd) => commandApplies(cmd, ctx));
    allCommands.push(...applicable);
  }

  if (ctx.packageManager !== "none") {
    const pmFiltered = filterByPackageManager(
      allCommands.filter((c) => ["npm", "pnpm", "yarn", "bun"].includes(c.command)),
      ctx.packageManager
    );
    const nonPmCommands = allCommands.filter(
      (c) => !["npm", "pnpm", "yarn", "bun"].includes(c.command)
    );
    return [...pmFiltered, ...nonPmCommands];
  }

  return allCommands;
}

export function getTopCommands(
  profile: LanguageProfile,
  ctx: ProjectContext,
  limit = 6
): CommandTemplate[] {
  const priority: Array<keyof LanguageProfile["commands"]> = [
    "runProject",
    "runFile",
    "testProject",
    "build",
    "lint",
    "format",
    "typecheck",
    "packageInstall",
  ];

  const result: CommandTemplate[] = [];
  for (const cat of priority) {
    if (result.length >= limit) break;
    const cmds = getCommandsForContext(profile, ctx, cat);
    for (const cmd of cmds) {
      if (result.length >= limit) break;
      if (!result.find((c) => c.id === cmd.id)) {
        result.push(cmd);
      }
    }
  }
  return result;
}

export function resolveCommandArgs(
  cmd: CommandTemplate,
  filePath: string,
  placeholder?: string
): string[] {
  return cmd.args.map((arg) => {
    let resolved = arg.replace("${file}", filePath);
    if (placeholder) resolved = resolved.replace(/\$\{1:[^}]*\}/, placeholder);
    return resolved;
  });
}
