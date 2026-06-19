import { bridgeInvoke } from "../http";

export interface UniversalSearchResult {
  id: string;
  source: "messages" | "memory_records" | "projects";
  title: string;
  snippet: string;
  project_id?: string;
  created_at?: string;
}

export interface UniversalSearchResults {
  messages: UniversalSearchResult[];
  memory: UniversalSearchResult[];
  projects: UniversalSearchResult[];
}

export const search = {
  async universalSearch(
    query: string,
    options: { limit?: number; sourceFilter?: "messages" | "memory" | "projects"; projectId?: string } = {}
  ): Promise<UniversalSearchResults> {
    return bridgeInvoke<UniversalSearchResults>("universal_search", {
      query,
      limit: options.limit ?? 20,
      source_filter: options.sourceFilter,
      project_id: options.projectId,
    });
  },
};
