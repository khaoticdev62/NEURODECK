import { useCallback, useState } from "react";
import { neurodeckApi } from "../../../services/bridgeAdapter";

export function useKnowledgeBase() {
  const [indexedDirs, setIndexedDirs] = useState<Array<{ path: string; doc_count: number }> | null>(
    null
  );
  const [kbBusy, setKbBusy] = useState<string | null>(null);
  const [kbStatus, setKbStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const loadKbDirs = useCallback(async () => {
    setKbBusy("load");
    try {
      const res = await neurodeckApi.memory.getIndexedDirs();
      setIndexedDirs(res.dirs);
    } catch (e) {
      setKbStatus({ text: `Failed to load: ${e}`, ok: false });
    } finally {
      setKbBusy(null);
    }
  }, []);

  const handleRemoveKbDir = useCallback(async (path: string) => {
    setKbBusy(path);
    try {
      await neurodeckApi.memory.removeIndexedDir(path);
      setIndexedDirs((prev) => prev?.filter((d) => d.path !== path) ?? null);
      setKbStatus({ text: "Directory removed from index list", ok: true });
    } catch (e) {
      setKbStatus({ text: `Remove failed: ${e}`, ok: false });
    } finally {
      setKbBusy(null);
    }
  }, []);

  const handleReindexAll = useCallback(async () => {
    if (!indexedDirs?.length) return;
    setKbBusy("reindex");
    setKbStatus({ text: "Re-indexing all directories…", ok: true });
    try {
      for (const d of indexedDirs) {
        await neurodeckApi.memory.indexDirectory(d.path);
      }
      setKbStatus({
        text: `Queued ${indexedDirs.length} director${indexedDirs.length === 1 ? "y" : "ies"} for re-indexing`,
        ok: true,
      });
    } catch (e) {
      setKbStatus({ text: `Re-index failed: ${e}`, ok: false });
    } finally {
      setKbBusy(null);
    }
  }, [indexedDirs]);

  return {
    indexedDirs,
    kbBusy,
    kbStatus,
    loadKbDirs,
    handleRemoveKbDir,
    handleReindexAll,
  };
}
