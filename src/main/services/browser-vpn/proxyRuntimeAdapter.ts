import { session } from "electron";
import { browserProfileService } from "../browser/browserProfileService";
import type { BrowserProxyProfile } from "../../../shared/browser-vpn/vpnProfileTypes";

export class ProxyRuntimeAdapter {
  async apply(profileId: string, proxy: BrowserProxyProfile): Promise<{ ok: boolean; error?: string }> {
    const profile = browserProfileService.getProfile(profileId);
    if (!profile) return { ok: false, error: "browser_profile_not_found" };
    try {
      const sess = session.fromPartition(profile.partitionId);
      if (proxy.protocol === "pac" && proxy.pacUrl) {
        await sess.setProxy({ pacScript: proxy.pacUrl });
      } else if (proxy.host && proxy.port) {
        const scheme = proxy.protocol === "https" ? "http" : proxy.protocol;
        await sess.setProxy({
          proxyRules: `${scheme}://${proxy.host}:${proxy.port}`,
          proxyBypassRules: proxy.bypassRules.join(","),
        });
      } else {
        return { ok: false, error: "proxy_config_missing_host_or_port" };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  async clear(profileId: string): Promise<{ ok: boolean; error?: string }> {
    const profile = browserProfileService.getProfile(profileId);
    if (!profile) return { ok: false, error: "browser_profile_not_found" };
    try {
      const sess = session.fromPartition(profile.partitionId);
      await sess.setProxy({ proxyRules: "direct://" });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  }
}

export const proxyRuntimeAdapter = new ProxyRuntimeAdapter();
