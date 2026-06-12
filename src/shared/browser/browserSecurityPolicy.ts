export const GUEST_WEB_PREFERENCES = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  javascript: true,
};

export const ALLOWED_SCHEMES = ["https:", "http:", "about:"];
export const BLOCKED_SCHEMES = ["javascript:", "data:", "file:", "ftp:"];

export function isUrlAllowed(urlStr: string, localPreviewAllowed: boolean = false): { allowed: boolean; reason?: string } {
  if (!urlStr) {
    return { allowed: false, reason: "URL is empty" };
  }

  try {
    const url = new URL(urlStr);
    const scheme = url.protocol.toLowerCase();

    if (scheme === "file:") {
      if (localPreviewAllowed) {
        return { allowed: true };
      }
      return { allowed: false, reason: "Local filesystem access (file://) is blocked for security reasons." };
    }

    if (BLOCKED_SCHEMES.includes(scheme)) {
      return { allowed: false, reason: `Protocol scheme "${scheme}" is blocked for security reasons.` };
    }

    if (!ALLOWED_SCHEMES.includes(scheme)) {
      return { allowed: false, reason: `Protocol scheme "${scheme}" is not supported.` };
    }

    return { allowed: true };
  } catch (err) {
    // Treat as search query or malformed input
    return { allowed: false, reason: "Malformed URL" };
  }
}
