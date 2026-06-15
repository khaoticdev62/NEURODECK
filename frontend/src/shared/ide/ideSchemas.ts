/**
 * Runtime type-guards for IDE contracts.
 * Follows the same no-external-deps pattern as models.schemas.ts.
 */
import type {
  CommandSafety,
  CwdStrategy,
  CommandTemplate,
  PredictiveSnippet,
  LanguageProfile,
  ProjectContext,
  PredictionResult,
} from "../contracts/ide.contracts";

const COMMAND_SAFETY: CommandSafety[] = ["safe", "confirm", "dangerous", "blocked"];
const CWD_STRATEGIES: CwdStrategy[] = [
  "workspaceRoot",
  "fileDirectory",
  "nearestPackageRoot",
  "nearestGitRoot",
];

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNonEmptyString(v: unknown): v is string {
  return isString(v) && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

export function isCommandSafety(v: unknown): v is CommandSafety {
  return COMMAND_SAFETY.includes(v as CommandSafety);
}

export function isCwdStrategy(v: unknown): v is CwdStrategy {
  return CWD_STRATEGIES.includes(v as CwdStrategy);
}

export function isCommandTemplate(v: unknown): v is CommandTemplate {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    isNonEmptyString(c["id"]) &&
    isNonEmptyString(c["label"]) &&
    isNonEmptyString(c["languageId"]) &&
    isNonEmptyString(c["command"]) &&
    isStringArray(c["args"]) &&
    isCwdStrategy(c["cwdStrategy"]) &&
    typeof c["appliesWhen"] === "object" &&
    c["appliesWhen"] !== null &&
    isCommandSafety(c["safety"]) &&
    isNonEmptyString(c["description"])
  );
}

export function isPredictiveSnippet(v: unknown): v is PredictiveSnippet {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    isNonEmptyString(s["id"]) &&
    isNonEmptyString(s["languageId"]) &&
    isNonEmptyString(s["label"]) &&
    isNonEmptyString(s["insertText"]) &&
    Array.isArray(s["placeholders"]) &&
    isStringArray(s["triggerContexts"]) &&
    typeof s["controllerFriendly"] === "boolean"
  );
}

export function isLanguageProfile(v: unknown): v is LanguageProfile {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    isNonEmptyString(p["id"]) &&
    isNonEmptyString(p["displayName"]) &&
    isStringArray(p["fileExtensions"]) &&
    p["fileExtensions"].length > 0 &&
    isStringArray(p["configFiles"]) &&
    typeof p["lsp"] === "object" &&
    p["lsp"] !== null &&
    typeof p["commands"] === "object" &&
    p["commands"] !== null &&
    Array.isArray(p["snippets"]) &&
    typeof p["safety"] === "object" &&
    p["safety"] !== null
  );
}

export function isProjectContext(v: unknown): v is ProjectContext {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    isNonEmptyString(p["rootPath"]) &&
    isStringArray(p["detectedLanguages"]) &&
    isString(p["packageManager"]) &&
    typeof p["hasGit"] === "boolean" &&
    isStringArray(p["configFiles"]) &&
    typeof p["availableScripts"] === "object"
  );
}

export function isPredictionResult(v: unknown): v is PredictionResult {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    isNonEmptyString(p["id"]) &&
    isNonEmptyString(p["type"]) &&
    isNonEmptyString(p["label"]) &&
    isNonEmptyString(p["source"]) &&
    typeof p["confidence"] === "number"
  );
}
