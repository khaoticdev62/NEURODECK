import type { BrowserProfile } from "../../../shared/browser/browserContracts";

export const BROWSER_PROFILES: BrowserProfile[] = [
  {
    id: "default",
    name: "Default Profile",
    partitionId: "persist:nb-default",
    persistent: true,
    policy: {
      allowDownloads: true,
      allowPopups: false,
      allowMedia: true,
      allowNotifications: true,
      allowGeolocation: false,
      allowClipboardRead: false,
      allowClipboardWrite: true,
      allowDevTools: true,
      blockThirdPartyCookies: true,
      clearOnClose: false,
    },
    storage: {
      historyEnabled: true,
      bookmarksEnabled: true,
      cookiesEnabled: true,
      cacheEnabled: true,
    },
  },
  {
    id: "private",
    name: "Private Profile",
    partitionId: "nb-private", // Non-persistent in-memory partition
    persistent: false,
    policy: {
      allowDownloads: true,
      allowPopups: false,
      allowMedia: false,
      allowNotifications: false,
      allowGeolocation: false,
      allowClipboardRead: false,
      allowClipboardWrite: true,
      allowDevTools: false,
      blockThirdPartyCookies: true,
      clearOnClose: true,
    },
    storage: {
      historyEnabled: false,
      bookmarksEnabled: false,
      cookiesEnabled: true,
      cacheEnabled: false,
    },
  },
  {
    id: "research",
    name: "Research Profile",
    partitionId: "persist:nb-research",
    persistent: true,
    policy: {
      allowDownloads: true,
      allowPopups: false,
      allowMedia: true,
      allowNotifications: true,
      allowGeolocation: true,
      allowClipboardRead: false,
      allowClipboardWrite: true,
      allowDevTools: true,
      blockThirdPartyCookies: false,
      clearOnClose: false,
    },
    storage: {
      historyEnabled: true,
      bookmarksEnabled: true,
      cookiesEnabled: true,
      cacheEnabled: true,
    },
  },
  {
    id: "developer",
    name: "Developer Profile",
    partitionId: "persist:nb-developer",
    persistent: true,
    policy: {
      allowDownloads: true,
      allowPopups: true,
      allowMedia: true,
      allowNotifications: true,
      allowGeolocation: false,
      allowClipboardRead: true,
      allowClipboardWrite: true,
      allowDevTools: true,
      blockThirdPartyCookies: false,
      clearOnClose: false,
    },
    storage: {
      historyEnabled: true,
      bookmarksEnabled: true,
      cookiesEnabled: true,
      cacheEnabled: true,
    },
  },
  {
    id: "sandbox",
    name: "Sandbox Profile",
    partitionId: "persist:nb-sandbox",
    persistent: true,
    policy: {
      allowDownloads: false, // Strict block
      allowPopups: false,
      allowMedia: false,
      allowNotifications: false,
      allowGeolocation: false,
      allowClipboardRead: false,
      allowClipboardWrite: false,
      allowDevTools: false,
      blockThirdPartyCookies: true,
      clearOnClose: true,
    },
    storage: {
      historyEnabled: true,
      bookmarksEnabled: false,
      cookiesEnabled: false,
      cacheEnabled: false,
    },
  },
];

export class BrowserProfileService {
  listProfiles(): BrowserProfile[] {
    return BROWSER_PROFILES;
  }

  getProfile(id: string): BrowserProfile | undefined {
    return BROWSER_PROFILES.find((p) => p.id === id);
  }
}

export const browserProfileService = new BrowserProfileService();
