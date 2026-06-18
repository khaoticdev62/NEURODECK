import { bridgeInvoke } from "../http";

export const docs = {
  async indexDirectory(path: string) {
    const res = await bridgeInvoke<{ status: string }>("index_directory", { path });
    return { success: res.status === "indexing", count: undefined };
  },
  async getDefaultPath() {
    const res = await bridgeInvoke<{ path: string; exists: boolean }>("get_default_docs_path", {});
    return res;
  },
  async getIndexedDocs() {
    const paths = await bridgeInvoke<string[] | { docs?: string[] }>("get_indexed_docs");
    const safePaths = Array.isArray(paths) ? paths : paths?.docs ?? [];
    return {
      docs: safePaths.map((p, i) => ({
        id: `doc-${i}`,
        title: p.replace(/\\/g, "/").split("/").pop() || p,
        path: p,
      })),
    };
  },
  async searchDocs(query: string) {
    const raw = await bridgeInvoke<
      | Array<{ file: string; snippet: string; score: number }>
      | { results?: Array<{ file: string; snippet: string; score: number }> }
    >("search_docs_semantic", { query });
    const safeRaw = Array.isArray(raw) ? raw : raw?.results ?? [];
    return {
      results: safeRaw.map((r, i) => ({
        id: `result-${i}`,
        title: r.file.replace(/\\/g, "/").split("/").pop() || r.file,
        snippet: r.snippet,
        score: r.score,
      })),
    };
  },
  async clearIndex() {
    const res = await bridgeInvoke<{ status: string }>("clear_doc_index");
    return { success: res.status === "cleared" };
  },
};
