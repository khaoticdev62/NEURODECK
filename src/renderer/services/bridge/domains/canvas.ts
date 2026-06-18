import { bridgeInvoke } from "../http";

export type CodeLang = "python" | "bash" | "powershell" | "javascript" | "js" | "html";

export const canvas = {
  async execStream(code: string, lang: CodeLang) {
    return bridgeInvoke<{ success: boolean; exec_id?: string }>("exec_code_stream", { code, lang });
  },
  async cancelExec() {
    return bridgeInvoke<{ success: boolean }>("cancel_exec");
  },
};
