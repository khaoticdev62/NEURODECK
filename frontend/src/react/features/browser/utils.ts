const ALLOWED_NAVIGATION_SCHEMES = ["http:", "https:"];

export function isAllowedNavigationUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return ALLOWED_NAVIGATION_SCHEMES.includes(url.protocol);
  } catch {
    // No scheme means a search query; let the sidecar normalize it.
    return true;
  }
}
