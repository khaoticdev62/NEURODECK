import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../../theme/ThemeProvider";
import { themePersistenceClient } from "../../theme/themePersistenceClient";
import { neurodeckApi } from "../../services/bridgeAdapter";

const TestConsumer = () => {
  const { settings, activeTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-id">{settings.activeThemeId}</span>
      <span data-testid="display-profile">{settings.displayProfile}</span>
      <span data-testid="accessibility-profile">{settings.accessibilityProfile}</span>
      <span data-testid="performance-tier">{settings.performanceTier}</span>
      <span data-testid="theme-name">{activeTheme.name}</span>
    </div>
  );
};

vi.mock("../../services/bridgeAdapter", async () => {
  const actual = await vi.importActual<typeof import("../../services/bridgeAdapter")>(
    "../../services/bridgeAdapter"
  );
  return {
    ...actual,
    neurodeckApi: {
      ...actual.neurodeckApi,
      getInitialState: vi.fn(),
      setTheme: vi.fn(),
    },
  };
});

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads default settings when persistence is empty", async () => {
    vi.spyOn(themePersistenceClient, "getSettings").mockResolvedValue({
      activeThemeId: "blacksite_prime",
      activeWallpaperId: "neural_aurora",
      liveWallpaperEnabled: true,
      displayProfile: "steamdeck_lcd",
      performanceTier: "balanced",
      accessibilityProfile: "default",
      wallpaperIntensity: 50,
      wallpaperOpacity: 10,
      glowIntensity: 100,
      glassIntensity: 100,
      motionIntensity: 100,
      fontScale: 100,
      compactMode: false,
    });
    vi.mocked(neurodeckApi.getInitialState).mockResolvedValue({
      active_theme_name: null,
    } as any);

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await waitFor(() => expect(screen.getByTestId("theme-id").textContent).toBe("blacksite_prime"));
    expect(screen.getByTestId("display-profile").textContent).toBe("steamdeck_lcd");
  });

  it("falls back to default theme when persisted theme ID is invalid", async () => {
    vi.spyOn(themePersistenceClient, "getSettings").mockResolvedValue({
      activeThemeId: "nonexistent_theme",
      activeWallpaperId: "neural_aurora",
      liveWallpaperEnabled: true,
      displayProfile: "steamdeck_lcd",
      performanceTier: "balanced",
      accessibilityProfile: "default",
      wallpaperIntensity: 50,
      wallpaperOpacity: 10,
      glowIntensity: 100,
      glassIntensity: 100,
      motionIntensity: 100,
      fontScale: 100,
      compactMode: false,
    });
    vi.mocked(neurodeckApi.getInitialState).mockResolvedValue({
      active_theme_name: null,
    } as any);

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await waitFor(() => expect(screen.getByTestId("theme-id").textContent).toBe("tactical_glass_ultra"));
  });

  it("normalizes legacy display/accessibility/performance values", async () => {
    vi.spyOn(themePersistenceClient, "getSettings").mockResolvedValue({
      activeThemeId: "blacksite_prime",
      activeWallpaperId: "neural_aurora",
      liveWallpaperEnabled: true,
      displayProfile: "desktop_lcd" as any,
      performanceTier: "battery" as any,
      accessibilityProfile: "large_text" as any,
      wallpaperIntensity: 50,
      wallpaperOpacity: 10,
      glowIntensity: 100,
      glassIntensity: 100,
      motionIntensity: 100,
      fontScale: 100,
      compactMode: false,
    });
    vi.mocked(neurodeckApi.getInitialState).mockResolvedValue({
      active_theme_name: null,
    } as any);

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("display-profile").textContent).toBe("desktop_1080p");
      expect(screen.getByTestId("performance-tier").textContent).toBe("battery_saver");
      expect(screen.getByTestId("accessibility-profile").textContent).toBe("default");
    });
  });

  it("applies reduced motion to motion tokens", async () => {
    vi.spyOn(themePersistenceClient, "getSettings").mockResolvedValue({
      activeThemeId: "blacksite_prime",
      activeWallpaperId: "neural_aurora",
      liveWallpaperEnabled: true,
      displayProfile: "steamdeck_lcd",
      performanceTier: "balanced",
      accessibilityProfile: "reduced_motion",
      wallpaperIntensity: 50,
      wallpaperOpacity: 10,
      glowIntensity: 100,
      glassIntensity: 100,
      motionIntensity: 100,
      fontScale: 100,
      compactMode: false,
    });
    vi.mocked(neurodeckApi.getInitialState).mockResolvedValue({
      active_theme_name: null,
    } as any);

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--nd-transition-fast")).toBe("0ms");
      expect(root.style.getPropertyValue("--nd-transition-normal")).toBe("0ms");
      expect(root.style.getPropertyValue("--nd-transition-slow")).toBe("0ms");
    });
  });

  it("applies Steam Deck OLED display profile corrections", async () => {
    vi.spyOn(themePersistenceClient, "getSettings").mockResolvedValue({
      activeThemeId: "blacksite_prime",
      activeWallpaperId: "neural_aurora",
      liveWallpaperEnabled: true,
      displayProfile: "steamdeck_oled",
      performanceTier: "balanced",
      accessibilityProfile: "default",
      wallpaperIntensity: 50,
      wallpaperOpacity: 10,
      glowIntensity: 100,
      glassIntensity: 100,
      motionIntensity: 100,
      fontScale: 100,
      compactMode: false,
    });
    vi.mocked(neurodeckApi.getInitialState).mockResolvedValue({
      active_theme_name: null,
    } as any);

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--nd-bg")).toBe("#000000");
      expect(root.style.getPropertyValue("--nd-surface")).toBe("#000000");
    });
  });
});
