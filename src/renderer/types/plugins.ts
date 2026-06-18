export type PluginStatus =
  | "enabled"
  | "disabled"
  | "loading"
  | "error"
  | "invalid"
  | "incompatible"
  | "missing_entry"
  | "permission_required";

export type PluginPermission =
  | "filesystem_read"
  | "filesystem_write"
  | "network_access"
  | "model_access"
  | "session_access"
  | "memory_access"
  | "shell_execution"
  | "clipboard_access"
  | "notification_access";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  runtime: "lua" | "javascript" | "typescript" | "external";
  entry: string;
  permissions?: PluginPermission[];
  configSchema?: any;
  deckSupport?: boolean;
  minimumAppVersion?: string;
}
