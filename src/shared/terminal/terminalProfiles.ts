import type { TerminalSafetyLevel } from "./terminalSafetyTypes";

export type TerminalCwdStrategy = "home" | "workspaceRoot" | "lastSession" | "projectRoot" | "custom";

export type TerminalProfile = {
  id: string;
  name: string;
  description: string;
  platform: "linux" | "windows" | "macos" | "steamdeck" | "cross_platform";
  shellPath: string;
  shellArgs: string[];
  cwdStrategy: TerminalCwdStrategy;
  envPolicy: {
    inheritSafeEnv: boolean;
    allowedEnvKeys: string[];
    blockedEnvKeys: string[];
    injectProjectEnv: boolean;
  };
  safety: {
    readOnlyMode: boolean;
    allowDestructiveCommands: boolean;
    requireConfirmationForDangerousCommands: boolean;
    allowNetworkCommands: boolean;
    allowPackageInstall: boolean;
    allowVpnCommands: boolean;
  };
  aiAssist: {
    enabled: boolean;
    allowCommandSuggestions: boolean;
    allowCommandExplanation: boolean;
    allowAutoFixSuggestions: boolean;
    autoExecuteAllowed: false;
  };
  productionReady: boolean;
};

export type TerminalProfileAvailability = TerminalProfile & {
  shellAvailable: boolean;
  shellStatus: "ready" | "missing_shell_binary" | "unknown";
  detectedPath?: string | null;
  shellSafety: TerminalSafetyLevel;
};

export const TERMINAL_PROFILES: TerminalProfile[] = [
  {
    id: "steamos-bash",
    name: "SteamOS Bash",
    description: "Default Steam Deck shell with project-aware workspace launch.",
    platform: "steamdeck",
    shellPath: "/bin/bash",
    shellArgs: ["--login"],
    cwdStrategy: "workspaceRoot",
    envPolicy: {
      inheritSafeEnv: true,
      allowedEnvKeys: ["HOME", "PATH", "TERM", "LANG", "LC_ALL", "DISPLAY", "XDG_RUNTIME_DIR"],
      blockedEnvKeys: ["GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"],
      injectProjectEnv: true,
    },
    safety: {
      readOnlyMode: false,
      allowDestructiveCommands: true,
      requireConfirmationForDangerousCommands: true,
      allowNetworkCommands: true,
      allowPackageInstall: true,
      allowVpnCommands: true,
    },
    aiAssist: { enabled: true, allowCommandSuggestions: true, allowCommandExplanation: true, allowAutoFixSuggestions: true, autoExecuteAllowed: false },
    productionReady: true,
  },
  {
    id: "linux-sh",
    name: "Linux Sh",
    description: "Portable POSIX shell for recovery and low-assumption workflows.",
    platform: "linux",
    shellPath: "/bin/sh",
    shellArgs: [],
    cwdStrategy: "home",
    envPolicy: {
      inheritSafeEnv: true,
      allowedEnvKeys: ["HOME", "PATH", "TERM", "LANG", "LC_ALL"],
      blockedEnvKeys: ["GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"],
      injectProjectEnv: false,
    },
    safety: {
      readOnlyMode: true,
      allowDestructiveCommands: false,
      requireConfirmationForDangerousCommands: true,
      allowNetworkCommands: false,
      allowPackageInstall: false,
      allowVpnCommands: false,
    },
    aiAssist: { enabled: true, allowCommandSuggestions: true, allowCommandExplanation: true, allowAutoFixSuggestions: false, autoExecuteAllowed: false },
    productionReady: true,
  },
  {
    id: "power-shell",
    name: "PowerShell",
    description: "Windows desktop shell profile with explicit confirmation gates.",
    platform: "windows",
    shellPath: "powershell.exe",
    shellArgs: ["-NoLogo"],
    cwdStrategy: "home",
    envPolicy: {
      inheritSafeEnv: true,
      allowedEnvKeys: ["USERPROFILE", "PATH", "TEMP", "TMP", "TERM"],
      blockedEnvKeys: ["GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"],
      injectProjectEnv: true,
    },
    safety: {
      readOnlyMode: false,
      allowDestructiveCommands: true,
      requireConfirmationForDangerousCommands: true,
      allowNetworkCommands: true,
      allowPackageInstall: true,
      allowVpnCommands: true,
    },
    aiAssist: { enabled: true, allowCommandSuggestions: true, allowCommandExplanation: true, allowAutoFixSuggestions: true, autoExecuteAllowed: false },
    productionReady: true,
  },
  {
    id: "read-only-safe-shell",
    name: "Read-Only Safe Shell",
    description: "Conservative shell profile for diagnostics and inspection only.",
    platform: "cross_platform",
    shellPath: "/bin/sh",
    shellArgs: [],
    cwdStrategy: "workspaceRoot",
    envPolicy: {
      inheritSafeEnv: true,
      allowedEnvKeys: ["HOME", "PATH", "TERM", "LANG", "LC_ALL"],
      blockedEnvKeys: ["GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"],
      injectProjectEnv: false,
    },
    safety: {
      readOnlyMode: true,
      allowDestructiveCommands: false,
      requireConfirmationForDangerousCommands: true,
      allowNetworkCommands: false,
      allowPackageInstall: false,
      allowVpnCommands: false,
    },
    aiAssist: { enabled: true, allowCommandSuggestions: true, allowCommandExplanation: true, allowAutoFixSuggestions: false, autoExecuteAllowed: false },
    productionReady: true,
  },
];

