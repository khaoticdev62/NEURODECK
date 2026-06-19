import { bridgeInvoke } from "../http";
import { listenBridge } from "../transport";

export interface LspDiagnostic {
  message: string;
  severity: number | null;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  source: string | null;
}

export interface LspCompletionItem {
  label: string;
  kind: number | null;
  detail: string | null;
  insert_text: string | null;
}

export interface LspHover {
  contents: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  } | null;
}

export interface LspLocation {
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface LspServerInfo {
  language: string;
  command: string;
  status: string;
}

export interface LspTextEdit {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  new_text: string;
}

export interface LspCodeAction {
  title: string;
  kind: string | null;
  is_preferred: boolean;
  edits: LspTextEdit[];
}

export interface KnownLspServer {
  language: string;
  label: string;
  command: string;
  args: string[];
  install_hint: string;
}

export const lsp = {
  async start(language: string, command: string, args: string[] = []): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("lsp_start", { language, command, args });
  },

  async stop(language: string): Promise<{ status: string; language: string }> {
    return bridgeInvoke<{ status: string; language: string }>("lsp_stop", { language });
  },

  async list(): Promise<{ servers: LspServerInfo[]; count: number }> {
    return bridgeInvoke<{ servers: LspServerInfo[]; count: number }>("lsp_list");
  },

  async knownServers(): Promise<KnownLspServer[]> {
    return bridgeInvoke<KnownLspServer[]>("lsp_known_servers");
  },

  async getDiagnostics(
    uri: string
  ): Promise<{ uri: string; diagnostics: LspDiagnostic[]; count: number }> {
    return bridgeInvoke<{ uri: string; diagnostics: LspDiagnostic[]; count: number }>(
      "lsp_get_diagnostics",
      { uri }
    );
  },

  async openDocument(language: string, uri: string, content: string): Promise<void> {
    await bridgeInvoke<{ ok: boolean }>("lsp_open_document", { language, uri, content });
  },

  async closeDocument(language: string, uri: string): Promise<void> {
    await bridgeInvoke<{ ok: boolean }>("lsp_close_document", { language, uri });
  },

  async changeDocument(
    language: string,
    uri: string,
    content: string,
    version: number
  ): Promise<void> {
    await bridgeInvoke<{ ok: boolean }>("lsp_change_document", { language, uri, content, version });
  },

  async getCompletions(
    language: string,
    uri: string,
    line: number,
    character: number
  ): Promise<LspCompletionItem[]> {
    return bridgeInvoke<LspCompletionItem[]>("lsp_get_completions", {
      language,
      uri,
      line,
      character,
    });
  },

  async getHover(
    language: string,
    uri: string,
    line: number,
    character: number
  ): Promise<LspHover | null> {
    return bridgeInvoke<LspHover | null>("lsp_get_hover", { language, uri, line, character });
  },

  async getDefinitions(
    language: string,
    uri: string,
    line: number,
    character: number
  ): Promise<LspLocation[]> {
    return bridgeInvoke<LspLocation[]>("lsp_get_definitions", { language, uri, line, character });
  },

  async getCodeActions(
    language: string,
    uri: string,
    line: number,
    character: number,
    diagnostics: LspDiagnostic[]
  ): Promise<LspCodeAction[]> {
    return bridgeInvoke<LspCodeAction[]>("lsp_get_code_actions", {
      language,
      uri,
      line,
      character,
      diagnostics,
    });
  },

  onDiagnostics(
    handler: (data: { uri: string; diagnostics: LspDiagnostic[] }) => void
  ): () => void {
    return listenBridge("lsp:diagnostics", handler as (payload: unknown) => void);
  },

  onReady(handler: (data: { language: string }) => void): () => void {
    return listenBridge("lsp:ready", handler as (payload: unknown) => void);
  },

  onError(handler: (data: { language: string; message: string }) => void): () => void {
    return listenBridge("lsp:error", handler as (payload: unknown) => void);
  },
};
