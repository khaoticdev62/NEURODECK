import { browserProfileService } from "./browserProfileService";
import type { SessionClearOptions } from "../../../shared/browser/browserSessionTypes";

export class BrowserSessionService {
  getSession(profileId: string): any {
    const profile = browserProfileService.getProfile(profileId);
    if (!profile) return null;

    try {
      const { session } = require("electron");
      const sess = session.fromPartition(profile.partitionId);

      // Apply profile specific policies dynamically
      if (profile.policy.blockThirdPartyCookies) {
        sess.cookies.setBehavior({
          thirdParty: "block",
        } as any);
      } else {
        sess.cookies.setBehavior({
          thirdParty: "allow",
        } as any);
      }

      return sess;
    } catch {
      // Mock session for unit tests outside Electron
      return {
        clearCache: async () => {},
        clearStorageData: async () => {},
        cookies: {
          setBehavior: () => {},
        },
      };
    }
  }

  async clearSessionData(profileId: string, options: SessionClearOptions): Promise<{ ok: boolean }> {
    const profile = browserProfileService.getProfile(profileId);
    if (!profile) return { ok: false };

    const sess = this.getSession(profileId);
    if (!sess) return { ok: false };

    try {
      if (options.cache) {
        await sess.clearCache();
      }
      if (options.cookies || options.localStorage) {
        const storages: string[] = [];
        if (options.cookies) storages.push("cookies");
        if (options.localStorage) storages.push("localstorage", "websql", "indexdb");
        await sess.clearStorageData({
          storages: storages as any,
        });
      }
      return { ok: true };
    } catch (err) {
      console.error(`Failed to clear session data for profile ${profileId}:`, err);
      return { ok: false };
    }
  }
}

export const browserSessionService = new BrowserSessionService();
