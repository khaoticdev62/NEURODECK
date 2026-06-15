import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { NeurodeckTheme } from "../../../../shared/theme/themeContracts";
import { StepFinish } from "../../../components/onboarding/steps/StepFinish";

const THEMES = [
  { id: "blacksite", name: "Blacksite" },
  { id: "hologrid", name: "Hologrid" },
] as unknown as NeurodeckTheme[];

describe("StepFinish", () => {
  it("renders heading", () => {
    render(
      <StepFinish
        availableThemes={THEMES}
        themeId="blacksite"
        fontScale={100}
        providerType="ollama"
        diagnosticsErrors={[]}
        diagnosticsWarnings={[]}
      />
    );
    expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
  });

  it("shows active theme name", () => {
    render(
      <StepFinish
        availableThemes={THEMES}
        themeId="hologrid"
        fontScale={100}
        providerType="ollama"
        diagnosticsErrors={[]}
        diagnosticsWarnings={[]}
      />
    );
    expect(screen.getByText("Hologrid")).toBeDefined();
  });

  it('falls back to "Blacksite" if themeId not found in available themes', () => {
    render(
      <StepFinish
        availableThemes={THEMES}
        themeId="unknown-theme"
        fontScale={100}
        providerType="ollama"
        diagnosticsErrors={[]}
        diagnosticsWarnings={[]}
      />
    );
    expect(screen.getByText("Blacksite")).toBeDefined();
  });

  it("shows font scale value", () => {
    render(
      <StepFinish
        availableThemes={THEMES}
        themeId="blacksite"
        fontScale={110}
        providerType="ollama"
        diagnosticsErrors={[]}
        diagnosticsWarnings={[]}
      />
    );
    expect(screen.getByText("110%")).toBeDefined();
  });

  it("shows provider type", () => {
    render(
      <StepFinish
        availableThemes={THEMES}
        themeId="blacksite"
        fontScale={100}
        providerType="ollama"
        diagnosticsErrors={[]}
        diagnosticsWarnings={[]}
      />
    );
    expect(screen.getByText("ollama")).toBeDefined();
  });

  it('shows "Offline Planner" for skip provider', () => {
    render(
      <StepFinish
        availableThemes={THEMES}
        themeId="blacksite"
        fontScale={100}
        providerType="skip"
        diagnosticsErrors={[]}
        diagnosticsWarnings={[]}
      />
    );
    expect(screen.getByText("Offline Planner")).toBeDefined();
  });

  it("shows Healthy status when no errors", () => {
    render(
      <StepFinish
        availableThemes={THEMES}
        themeId="blacksite"
        fontScale={100}
        providerType="ollama"
        diagnosticsErrors={[]}
        diagnosticsWarnings={[]}
      />
    );
    expect(screen.getByText("Healthy")).toBeDefined();
  });

  it("shows Degraded status when errors are present", () => {
    render(
      <StepFinish
        availableThemes={THEMES}
        themeId="blacksite"
        fontScale={100}
        providerType="ollama"
        diagnosticsErrors={[{ code: "PTY_FAIL", message: "PTY failed", fix: "Fix it" }]}
        diagnosticsWarnings={[]}
      />
    );
    expect(screen.getByText("Degraded")).toBeDefined();
  });

  it("does not show warnings section when no warnings", () => {
    render(
      <StepFinish
        availableThemes={THEMES}
        themeId="blacksite"
        fontScale={100}
        providerType="ollama"
        diagnosticsErrors={[]}
        diagnosticsWarnings={[]}
      />
    );
    expect(screen.queryByText("Warnings Pending Verification:")).toBeNull();
  });

  it("shows warnings section when warnings are present", () => {
    render(
      <StepFinish
        availableThemes={THEMES}
        themeId="blacksite"
        fontScale={100}
        providerType="ollama"
        diagnosticsErrors={[]}
        diagnosticsWarnings={[
          { code: "SSH_MISSING", message: "SSH not found", fix: "Install ssh" },
        ]}
      />
    );
    expect(screen.getByText("Warnings Pending Verification:")).toBeDefined();
    expect(screen.getByText("SSH not found")).toBeDefined();
  });
});
