import { useEffect, useState } from "react";
import type { RuntimeManifest } from "../../../types/preload-surface";

export function useRuntimeManifest() {
  const [runtimeManifest, setRuntimeManifest] = useState<RuntimeManifest | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRuntimeManifest() {
      try {
        const manifest = await window.electronAPI?.getRuntimeManifest?.();
        if (!cancelled && manifest) {
          setRuntimeManifest(manifest);
        }
      } catch (_) {
        // Fallback to static labels below.
      }
    }
    void loadRuntimeManifest();
    return () => {
      cancelled = true;
    };
  }, []);

  return runtimeManifest;
}
