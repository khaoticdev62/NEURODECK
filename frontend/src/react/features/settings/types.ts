import type { AIProvider } from "../../types/neurodeck";

export type ProviderOption = {
  id: AIProvider;
  runtimeId: string;
  label: string;
  description: string;
};

export const OFFLINE_PROVIDER: ProviderOption = {
  id: "offline-draft",
  runtimeId: "offline-draft",
  label: "Offline Draft",
  description: "Always-available deterministic planning fallback.",
};

export interface ThemePreviewColors {
  surface: { app: string; sidebar: string; base: string; raised: string; input: string };
  text: { primary: string; muted: string };
  accent: { primary: string };
  border: { default: string; subtle: string };
  state: { success: string; warning: string; error: string };
}
