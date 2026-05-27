import { describe, it, expect } from "vitest";
import { createIcon, normalizeLabel } from "./icons.js";

describe("createIcon", () => {
  it("returns empty string for unknown icon name", () => {
    expect(createIcon("nonexistent")).toBe("");
  });

  it("returns SVG markup for a known icon", () => {
    const svg = createIcon("menu", { size: 24 });
    expect(svg).toContain("<svg");
    expect(svg).toContain('width="24"');
    expect(svg).toContain('height="24"');
    expect(svg).toContain('viewBox="0 0 24 24"');
  });

  it("uses default size of 16 when not specified", () => {
    const svg = createIcon("menu");
    expect(svg).toContain('width="16"');
    expect(svg).toContain('height="16"');
  });

  it("sanitizes className to prevent injection", () => {
    const svg = createIcon("menu", {
      className: 'foo<script>alert(1)</script>bar',
    });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("foo");
    expect(svg).toContain("bar");
  });

  it("applies safe classes when provided", () => {
    const svg = createIcon("menu", { className: "my-class another" });
    expect(svg).toContain('class="nd-icon-wrap my-class another"');
  });

  it("strips disallowed characters from className", () => {
    const svg = createIcon("menu", { className: "a@b#c$d%" });
    expect(svg).toContain('class="nd-icon-wrap abcd"');
  });

  it("wraps markup in nd-icon-wrap span", () => {
    const svg = createIcon("menu");
    expect(svg).toContain('<span class="nd-icon-wrap "');
  });

  it("includes aria-hidden on svg", () => {
    const svg = createIcon("menu");
    expect(svg).toContain('aria-hidden="true"');
  });
});

describe("normalizeLabel", () => {
  it("strips emoji from labels", () => {
    expect(normalizeLabel("🚀 Launch")).toBe("Launch");
    expect(normalizeLabel("💾 Save")).toBe("Save");
  });

  it("trims and collapses whitespace", () => {
    expect(normalizeLabel("  A    B  ")).toBe("A B");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeLabel("")).toBe("");
    expect(normalizeLabel(null)).toBe("");
    expect(normalizeLabel(undefined)).toBe("");
  });

  it("strips leading non-alphanumeric characters", () => {
    expect(normalizeLabel("!!!Alert")).toBe("Alert");
    expect(normalizeLabel("---Start")).toBe("Start");
  });

  it("preserves labels without emoji", () => {
    expect(normalizeLabel("Settings")).toBe("Settings");
    expect(normalizeLabel("Save File")).toBe("Save File");
  });

  it("handles mixed emoji and symbols", () => {
    expect(normalizeLabel("🔥 !!! Important")).toBe("Important");
  });

  it("preserves parentheses at start", () => {
    expect(normalizeLabel("(1) Item")).toBe("(1) Item");
  });

  it("handles numbers correctly", () => {
    expect(normalizeLabel("123 Test")).toBe("123 Test");
  });
});
