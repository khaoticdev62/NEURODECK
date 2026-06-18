import { bridgeInvoke } from "../http";

export interface PluginInfo {
  name: string;
  file_name: string;
  enabled: boolean;
  id: string | null;
  author: string | null;
  version: string | null;
  description: string | null;
  tags: string[];
  marketplace: boolean;
  permissions: string[];
}

export const plugins = {
  async list() {
    return bridgeInvoke<{ plugins: PluginInfo[]; count: number; enabled: number }>("list_plugins");
  },
  async toggle(fileName: string, enabled: boolean) {
    return bridgeInvoke<{ status: string; file_name: string }>("toggle_plugin", {
      file_name: fileName,
      enabled,
    });
  },
  async validate(fileName: string) {
    return bridgeInvoke<{
      file_name: string;
      passed: boolean;
      warnings: string[];
      errors: string[];
    }>("validate_plugin", { file_name: fileName });
  },
  async installFromUrl(url: string) {
    return bridgeInvoke<{ status: string; url: string }>("install_plugin", { url });
  },
  async installFromRegistry(pluginId: string) {
    return bridgeInvoke<{ status: string; plugin_id: string }>("install_plugin_from_registry", {
      plugin_id: pluginId,
    });
  },
  async uninstall(pluginId: string) {
    return bridgeInvoke<{ status: string; plugin_id: string }>("uninstall_plugin", {
      plugin_id: pluginId,
    });
  },
  async reload() {
    return bridgeInvoke<{ status: string }>("reload_plugins");
  },
};
