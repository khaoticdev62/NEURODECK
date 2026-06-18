import { bridgeInvoke } from "../http";

export const ide = {
  async listWorkspaceFiles(path?: string) {
    return bridgeInvoke<{
      files: Array<{ name: string; path: string; is_dir: boolean; size: number }>;
      count: number;
    }>("list_workspace_files", path ? { path } : undefined);
  },
  async readWorkspaceFile(path: string) {
    return bridgeInvoke<{ path: string; content: string; bytes: number }>("read_workspace_file", {
      path,
    });
  },
  async writeWorkspaceFile(path: string, content: string) {
    return bridgeInvoke<{ status: string; path: string; bytes: number }>("write_workspace_file", {
      path,
      content,
    });
  },
  async createWorkspaceFile(path: string) {
    return bridgeInvoke<{ status: string; path: string }>("create_workspace_file", { path });
  },
  async deleteWorkspaceFile(path: string) {
    return bridgeInvoke<{ status: string }>("delete_workspace_file", { path });
  },

  async detectProject(workspacePath: string) {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.detectProject) return nd.ide.detectProject(workspacePath);
    return {
      rootPath: workspacePath,
      detectedLanguages: [],
      packageManager: "none",
      hasGit: false,
      configFiles: [],
      availableScripts: {},
      detectedAt: new Date().toISOString(),
    };
  },

  async getPredictions(
    filePath: string,
    languageId: string,
    cursorLine: number,
    cursorChar: number,
    diagnosticsCount = 0,
    snippetIds: string[] = [],
    commandTemplates: unknown[] = [],
    lspCompletions: unknown[] = []
  ) {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.getPredictions) {
      return nd.ide.getPredictions(
        filePath,
        languageId,
        cursorLine,
        cursorChar,
        diagnosticsCount,
        snippetIds,
        commandTemplates,
        lspCompletions
      );
    }
    return [];
  },

  async runCommand(
    command: string,
    args: string[],
    cwd: string,
    safety: string,
    label: string,
    commandId?: string
  ) {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.runCommand) return nd.ide.runCommand(command, args, cwd, safety, label, commandId);
    throw new Error("ide.runCommand not available — Electron preload required");
  },

  async cancelCommand(commandId: string) {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.cancelCommand) return nd.ide.cancelCommand(commandId);
    return { commandId, cancelled: false };
  },

  async getCommandHistory() {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.getCommandHistory) return nd.ide.getCommandHistory();
    return [];
  },

  async applySnippet(snippetId: string, languageId: string) {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.applySnippet) return nd.ide.applySnippet(snippetId, languageId);
    return { snippetId, acknowledged: true };
  },

  onCommandOutput(
    callback: (data: { commandId: string; type: "stdout" | "stderr"; data: string }) => void
  ): () => void {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.onCommandOutput) return nd.ide.onCommandOutput(callback);
    return () => {};
  },

  onCommandExit(
    callback: (data: { commandId: string; exitCode: number | null }) => void
  ): () => void {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.onCommandExit) return nd.ide.onCommandExit(callback);
    return () => {};
  },
};
