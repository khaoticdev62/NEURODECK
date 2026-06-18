import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NeurodeckTheme } from "../../../../shared/theme/themeContracts";
import { StepPreferences } from "../../../components/onboarding/steps/StepPreferences";

const THEMES = [
  { id: "blacksite", name: "Blacksite" },
  { id: "hologrid", name: "Hologrid" },
] as unknown as NeurodeckTheme[];

const DEFAULT_PROPS = {
  availableThemes: THEMES,
  themeId: "blacksite",
  fontScale: 100,
  compactMode: false,
  reducedMotion: false,
  onThemeChange: vi.fn(),
  onFontScaleChange: vi.fn(),
  onCompactModeToggle: vi.fn(),
  onReducedMotionToggle: vi.fn(),
};

describe("StepPreferences", () => {
  it("renders heading", () => {
    render(<StepPreferences {...DEFAULT_PROPS} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
  });

  it("renders all available themes as select options", () => {
    render(<StepPreferences {...DEFAULT_PROPS} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeDefined();
    expect(screen.getByRole("option", { name: "Blacksite" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Hologrid" })).toBeDefined();
  });

  it("calls onThemeChange when theme is selected", async () => {
    const onThemeChange = vi.fn();
    render(<StepPreferences {...DEFAULT_PROPS} onThemeChange={onThemeChange} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "hologrid");
    expect(onThemeChange).toHaveBeenCalledWith("hologrid");
  });

  it("renders font scale slider with correct value", () => {
    render(<StepPreferences {...DEFAULT_PROPS} fontScale={110} />);
    const slider = screen.getByRole("slider");
    expect((slider as HTMLInputElement).value).toBe("110");
    expect(screen.getByText("110%")).toBeDefined();
  });

  it("calls onFontScaleChange when slider changes", () => {
    const onFontScaleChange = vi.fn();
    render(<StepPreferences {...DEFAULT_PROPS} onFontScaleChange={onFontScaleChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "105" } });
    expect(onFontScaleChange).toHaveBeenCalledWith(105);
  });

  it("compact mode toggle reflects aria-checked=false when off", () => {
    render(<StepPreferences {...DEFAULT_PROPS} compactMode={false} />);
    const btn = screen.getByRole("switch", { name: /compact density layout/i });
    expect(btn.getAttribute("aria-checked")).toBe("false");
  });

  it("compact mode toggle reflects aria-checked=true when on", () => {
    render(<StepPreferences {...DEFAULT_PROPS} compactMode={true} />);
    const btn = screen.getByRole("switch", { name: /compact density layout/i });
    expect(btn.getAttribute("aria-checked")).toBe("true");
  });

  it("calls onCompactModeToggle when compact switch is clicked", async () => {
    const onCompactModeToggle = vi.fn();
    render(<StepPreferences {...DEFAULT_PROPS} onCompactModeToggle={onCompactModeToggle} />);
    await userEvent.click(screen.getByRole("switch", { name: /compact density layout/i }));
    expect(onCompactModeToggle).toHaveBeenCalledOnce();
  });

  it("reduced motion toggle reflects aria-checked=false when off", () => {
    render(<StepPreferences {...DEFAULT_PROPS} reducedMotion={false} />);
    const btn = screen.getByRole("switch", { name: /reduced motion effects/i });
    expect(btn.getAttribute("aria-checked")).toBe("false");
  });

  it("reduced motion toggle reflects aria-checked=true when on", () => {
    render(<StepPreferences {...DEFAULT_PROPS} reducedMotion={true} />);
    const btn = screen.getByRole("switch", { name: /reduced motion effects/i });
    expect(btn.getAttribute("aria-checked")).toBe("true");
  });

  it("calls onReducedMotionToggle when clicked", async () => {
    const onReducedMotionToggle = vi.fn();
    render(<StepPreferences {...DEFAULT_PROPS} onReducedMotionToggle={onReducedMotionToggle} />);
    await userEvent.click(screen.getByRole("switch", { name: /reduced motion effects/i }));
    expect(onReducedMotionToggle).toHaveBeenCalledOnce();
  });
});
