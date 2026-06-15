import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tooltip } from "../../components/primitives/Tooltip";

describe("Tooltip", () => {
  it("renders children", () => {
    render(
      <Tooltip label="More info">
        <button>Help</button>
      </Tooltip>
    );
    expect(screen.getByRole("button", { name: "Help" })).toBeDefined();
  });

  it("renders tooltip label text in the DOM (hidden by default via opacity-0)", () => {
    render(
      <Tooltip label="Keyboard shortcut: Ctrl+K">
        <button>Search</button>
      </Tooltip>
    );
    expect(screen.getByText("Keyboard shortcut: Ctrl+K")).toBeDefined();
  });

  it("tooltip label span has pointer-events-none", () => {
    render(
      <Tooltip label="hint">
        <span>target</span>
      </Tooltip>
    );
    // The label span is the tooltip text element; select it by its text content
    const tipSpan = screen.getByText("hint");
    expect(tipSpan.className).toContain("pointer-events-none");
  });

  it("wraps children in a relative span for positioning", () => {
    const { container } = render(
      <Tooltip label="x">
        <button>btn</button>
      </Tooltip>
    );
    const wrapper = container.querySelector("span");
    expect(wrapper?.className).toContain("relative");
  });
});
