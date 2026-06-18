import type {
  NpmStatus,
  NpmPackage,
  NpmInstallProgress,
  NpmRecommendedPackage,
} from "../../../types/neurodeck";
import { bridgeInvoke } from "../http";
import { listenBridge } from "../transport";

export const npm = {
  async getStatus(): Promise<NpmStatus> {
    return bridgeInvoke<NpmStatus>("npm_get_status");
  },
  async list(): Promise<NpmPackage[]> {
    const res = await bridgeInvoke<{ packages: NpmPackage[] }>("npm_list_packages");
    return res.packages || [];
  },
  async install(name: string, version?: string): Promise<NpmPackage> {
    return bridgeInvoke<NpmPackage>("npm_install_package", { name, version });
  },
  async uninstall(name: string): Promise<{ status: string; name: string }> {
    return bridgeInvoke<{ status: string; name: string }>("npm_uninstall_package", { name });
  },
  async update(name: string): Promise<NpmPackage> {
    return bridgeInvoke<NpmPackage>("npm_update_package", { name });
  },
  async getRecommended(): Promise<NpmRecommendedPackage[]> {
    const res = await bridgeInvoke<{ packages: NpmRecommendedPackage[] }>("npm_get_recommended");
    return res.packages || [];
  },
  async resolveBinary(binary: string): Promise<string | null> {
    const res = await bridgeInvoke<{ path?: string }>("npm_resolve_binary_path", { binary });
    return res.path ?? null;
  },
  onProgress(callback: (data: NpmInstallProgress) => void): () => void {
    return listenBridge("npm_install_progress", (data: unknown) => {
      callback(data as NpmInstallProgress);
    });
  },
};
