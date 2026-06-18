/**
 * Re-exports from ide.contracts.ts for the shared/ide module.
 * Keeps the import path `frontend/src/shared/ide/ideContracts` clean
 * while the canonical source lives in shared/contracts.
 */
export type {
  CommandSafety,
  CwdStrategy,
  PackageManager,
  SnippetPlaceholder,
  CommandTemplate,
  PredictiveSnippet,
  LspProfile,
  LanguageProfile,
  ProjectContext,
  PredictionSource,
  PredictionResult,
  IdeMode,
  PredictionContext,
  CommandRunRequest,
  CommandRunResult,
  CommandHistoryEntry,
} from "../contracts/ide.contracts";
