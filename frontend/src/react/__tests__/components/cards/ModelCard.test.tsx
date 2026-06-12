import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelCard } from "../../../components/cards/ModelCard";
import type { LocalModel } from "../../../types/neurodeck";

const baseModel: LocalModel = {
  id: "llama3.1:8b",
  name: "Llama 3.1 8B",
  provider: "ollama",
  size: "4.9 GB",
  quantization: "Q4_K_M",
  context: 8192,
  bestFor: ["chat", "coding"],
  status: "ready",
  ramEstimate: "6 GB",
};

describe("ModelCard", () => {
  it("renders model name and status badge", () => {
    render(
      <ModelCard
        model={baseModel}
        selected={false}
        onMarkReady={vi.fn()}
        onMarkIndexed={vi.fn()}
        onDisable={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Llama 3.1 8B")).toBeDefined();
    expect(screen.getByText("ready")).toBeDefined();
  });

  it("shows preferred badge when agentPreferred is true", () => {
    render(
      <ModelCard
        model={baseModel}
        selected={false}
        agentPreferred
        onMarkReady={vi.fn()}
        onMarkIndexed={vi.fn()}
        onDisable={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Preferred")).toBeDefined();
  });

  it("shows blocked badge and disables mark-ready when policy blocks model", () => {
    render(
      <ModelCard
        model={baseModel}
        selected={false}
        policyAllowed={false}
        policyReason="Model exceeds agent tier limit"
        onMarkReady={vi.fn()}
        onMarkIndexed={vi.fn()}
        onDisable={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Blocked")).toBeDefined();
    expect(screen.getByText("Model exceeds agent tier limit")).toBeDefined();

    const markReadyBtn = screen.getByRole("button", { name: /Mark Ready/i });
    expect(markReadyBtn.hasAttribute("disabled")).toBe(true);
  });
});
