import { bridgeInvoke } from "../http";

export const ssh = {
  async saveCredential(host: string, user: string, password?: string, keyPath?: string) {
    return bridgeInvoke<{ success: boolean }>("save_ssh_credential", {
      host,
      user,
      password,
      key_path: keyPath,
    });
  },
  async getCredential(host: string) {
    return bridgeInvoke<{ user?: string; has_key?: boolean; key_path?: string }>(
      "get_ssh_credential",
      { host }
    );
  },
};
