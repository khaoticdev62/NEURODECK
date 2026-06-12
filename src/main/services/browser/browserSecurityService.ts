import { isUrlAllowed } from "../../../shared/browser/browserSecurityPolicy";

export class BrowserSecurityService {
  private adBlockEnabled: boolean = true;

  isAdBlockEnabled(): boolean {
    return this.adBlockEnabled;
  }

  toggleAdBlock(): boolean {
    this.adBlockEnabled = !this.adBlockEnabled;
    return this.adBlockEnabled;
  }

  shouldBlockRequest(urlStr: string): boolean {
    if (!this.adBlockEnabled) return false;
    try {
      const hostname = new URL(urlStr).hostname.toLowerCase();
      const AD_BLOCK_DOMAINS = [
        "doubleclick.net",
        "googleadservices.com",
        "googlesyndication.com",
        "adservice.google.com",
        "quantserve.com",
        "scorecardresearch.com",
        "adnxs.com",
        "adsrvr.org",
        "amazon-adsystem.com",
        "taboola.com",
        "outbrain.com",
        "popads.net",
        "propellerads.com",
        "adcolony.com",
        "admob.com"
      ];
      for (const blocked of AD_BLOCK_DOMAINS) {
        if (hostname === blocked || hostname.endsWith("." + blocked)) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  validateUrl(url: string, localPreviewAllowed: boolean = false): { allowed: boolean; error?: string } {
    const check = isUrlAllowed(url, localPreviewAllowed);
    return {
      allowed: check.allowed,
      error: check.reason,
    };
  }

  auditGuestWebPreferences(webPreferences: any): { safe: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!webPreferences) {
      return { safe: false, issues: ["webPreferences is null or undefined"] };
    }

    if (webPreferences.nodeIntegration === true) {
      issues.push("nodeIntegration is enabled");
    }
    if (webPreferences.contextIsolation === false) {
      issues.push("contextIsolation is disabled");
    }
    if (webPreferences.sandbox === false) {
      issues.push("sandbox is disabled");
    }
    if (webPreferences.webSecurity === false) {
      issues.push("webSecurity is disabled");
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  }
}

export const browserSecurityService = new BrowserSecurityService();
