export type SearchEngineId = "google" | "duckduckgo" | "bing" | "ecosia";

export class BrowserSearchEngineService {
  private engineId: SearchEngineId = "google";

  private engines: Record<SearchEngineId, string> = {
    google: "https://www.google.com/search?q=",
    duckduckgo: "https://duckduckgo.com/?q=",
    bing: "https://www.bing.com/search?q=",
    ecosia: "https://www.ecosia.org/search?q=",
  };

  setSearchEngine(id: SearchEngineId) {
    if (this.engines[id]) {
      this.engineId = id;
    }
  }

  getSearchEngineId(): SearchEngineId {
    return this.engineId;
  }

  getSearchEngineUrl(): string {
    return this.engines[this.engineId];
  }
}

export const browserSearchEngineService = new BrowserSearchEngineService();
