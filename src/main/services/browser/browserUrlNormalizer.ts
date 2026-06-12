export class BrowserUrlNormalizer {
  normalize(input: string, searchEngineUrl: string = "https://www.google.com/search?q="): string {
    const trimmed = input.trim();
    if (!trimmed) return "about:blank";

    // Standard URL regex check
    const hasProtocol = /^([a-zA-Z0-9+-.]+):\/\//.test(trimmed);
    const isAboutBlank = trimmed.toLowerCase() === "about:blank";

    if (isAboutBlank) {
      return "about:blank";
    }

    if (hasProtocol) {
      return trimmed;
    }

    // Check if it looks like a domain (e.g. google.com, localhost:3000, 127.0.0.1)
    const domainRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(:\d+)?(\/.*)?$/;
    const localhostRegex = /^localhost(:\d+)?(\/.*)?$/;

    if (domainRegex.test(trimmed) || ipRegex.test(trimmed) || localhostRegex.test(trimmed)) {
      return `https://${trimmed}`;
    }

    // Treat as search query
    return `${searchEngineUrl}${encodeURIComponent(trimmed)}`;
  }
}

export const browserUrlNormalizer = new BrowserUrlNormalizer();
