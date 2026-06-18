import { bridgeInvoke } from "../http";

export interface MemoryRecord {
  id: string;
  content: string;
  metadata: Record<string, string>;
}

export const memory = {
  async list(limit: number = 50, offset: number = 0) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.memory) {
      const res = await neurodeck.memory.search("");
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to list memory");
    }
    return bridgeInvoke<{ records: MemoryRecord[]; count: number; total: number }>("memory_list", {
      limit,
      offset,
    });
  },
  async delete(id: string) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.memory) {
      const res = await neurodeck.memory.delete(id);
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to delete memory");
    }
    return bridgeInvoke<{ status: string }>("memory_delete", { id });
  },
  async pin(id: string, pinned: boolean) {
    return bridgeInvoke<{ status: string }>("memory_pin", { id, pinned });
  },
  async clear() {
    return bridgeInvoke<{ status: string }>("memory_clear");
  },
  async addFact(content: string) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.memory) {
      const res = await neurodeck.memory.write(content);
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to add memory fact");
    }
    return bridgeInvoke<{ status: string; id: string }>("memory_add_fact", { content });
  },
  async exportAll(): Promise<{ data: string; count: number }> {
    return bridgeInvoke<{ data: string; count: number }>("memory_export");
  },
  async importData(data: string): Promise<{ status: string; imported: number; total: number }> {
    return bridgeInvoke<{ status: string; imported: number; total: number }>("memory_import_data", {
      data,
    });
  },
  async backup(): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("memory_backup_auto");
  },
  async listBackups(): Promise<{
    backups: Array<{ name: string; size_bytes: number }>;
    count: number;
  }> {
    return bridgeInvoke<{ backups: Array<{ name: string; size_bytes: number }>; count: number }>(
      "memory_list_backups"
    );
  },
  async restoreBackup(name: string): Promise<{ status: string; name: string }> {
    return bridgeInvoke<{ status: string; name: string }>("memory_restore_backup", { name });
  },
  async searchSemantic(query: string, limit = 5, lambda = 0.5) {
    return bridgeInvoke<{
      query: string;
      results: Array<{
        id: string;
        content: string;
        metadata: Record<string, string>;
        source_file: string;
        score?: number;
      }>;
      method: string;
    }>("memory_search_semantic", { query, limit, lambda });
  },
  async getIndexedDirs() {
    return bridgeInvoke<{ dirs: Array<{ path: string; doc_count: number }> }>("get_indexed_dirs");
  },
  async removeIndexedDir(path: string) {
    return bridgeInvoke<{ removed: number; remaining: number }>("remove_indexed_dir", { path });
  },
  async indexDirectory(path: string) {
    return bridgeInvoke<{ status: string; path: string }>("index_directory", { path });
  },
};
