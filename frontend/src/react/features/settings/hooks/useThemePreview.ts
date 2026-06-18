import { useCallback, useState } from "react";
import { useTheme } from "../../../theme/useTheme";

export function useThemePreview() {
  const { updateSettings } = useTheme();
  const [pendingThemeId, setPendingThemeId] = useState<string | null>(null);
  const [hoveredThemeId, setHoveredThemeId] = useState<string | null>(null);

  const applyPending = useCallback(() => {
    if (pendingThemeId) {
      void updateSettings({ activeThemeId: pendingThemeId });
      setPendingThemeId(null);
    }
  }, [pendingThemeId, updateSettings]);

  const cancelPending = useCallback(() => {
    setPendingThemeId(null);
  }, []);

  return {
    pendingThemeId,
    hoveredThemeId,
    setPendingThemeId,
    setHoveredThemeId,
    applyPending,
    cancelPending,
  };
}
