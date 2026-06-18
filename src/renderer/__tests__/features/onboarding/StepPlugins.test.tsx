import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepPlugins } from "../../../components/onboarding/steps/StepPlugins";

const DEFAULT_STATS = { installed: 5, active: 4, disabled: 1, errors: 0 };

describe("StepPlugins", () => {
  it("renders heading", () => {
    render(<StepPlugins pluginStats={DEFAULT_STATS} pluginsLoading={false} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
  });

  it("shows spinner while loading", () => {
    render(<StepPlugins pluginStats={DEFAULT_STATS} pluginsLoading={true} />);
    expect(screen.getByText("Scanning local plugins directory...")).toBeDefined();
    expect(screen.queryByText("Installed plugins")).toBeNull();
  });

  it("shows installed count", () => {
    render(<StepPlugins pluginStats={DEFAULT_STATS} pluginsLoading={false} />);
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("Installed plugins")).toBeDefined();
  });

  it("shows active script count", () => {
    render(<StepPlugins pluginStats={DEFAULT_STATS} pluginsLoading={false} />);
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText("Active scripts")).toBeDefined();
  });

  it("shows zero errors without danger color when all pass", () => {
    render(<StepPlugins pluginStats={{ ...DEFAULT_STATS, errors: 0 }} pluginsLoading={false} />);
    expect(screen.getByText("0")).toBeDefined();
    expect(screen.getByText("Failed QA gate")).toBeDefined();
  });

  it("shows error count when plugins fail QA", () => {
    render(<StepPlugins pluginStats={{ ...DEFAULT_STATS, errors: 2 }} pluginsLoading={false} />);
    expect(screen.getByText("2")).toBeDefined();
  });
});
