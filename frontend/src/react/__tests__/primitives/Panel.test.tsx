import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Panel } from "../../components/primitives/Panel";

describe("Panel", () => {
  it("renders children", () => {
    render(
      <Panel>
        <p>Content</p>
      </Panel>
    );
    expect(screen.getByText("Content")).toBeDefined();
  });

  it("does not render header when title, eyebrow, and action are all absent", () => {
    const { container } = render(
      <Panel>
        <p>body</p>
      </Panel>
    );
    expect(container.querySelector("header")).toBeNull();
  });

  it("renders header when title is provided", () => {
    const { container } = render(
      <Panel title="System Status">
        <p>ok</p>
      </Panel>
    );
    expect(container.querySelector("header")).toBeDefined();
    expect(screen.getByText("System Status")).toBeDefined();
  });

  it("title is rendered as an h3", () => {
    render(
      <Panel title="Overview">
        <p>body</p>
      </Panel>
    );
    expect(screen.getByRole("heading", { level: 3, name: "Overview" })).toBeDefined();
  });

  it("renders eyebrow text above title", () => {
    render(
      <Panel eyebrow="METRICS" title="Overview">
        <p>body</p>
      </Panel>
    );
    expect(screen.getByText("METRICS")).toBeDefined();
    expect(screen.getByText("Overview")).toBeDefined();
  });

  it("renders header when only eyebrow is provided", () => {
    const { container } = render(
      <Panel eyebrow="STATUS">
        <p>body</p>
      </Panel>
    );
    expect(container.querySelector("header")).toBeDefined();
  });

  it("renders action slot", () => {
    render(
      <Panel title="Files" action={<button>Refresh</button>}>
        <p>list</p>
      </Panel>
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDefined();
  });

  it("renders header when only action is provided", () => {
    const { container } = render(
      <Panel action={<button>+</button>}>
        <p>body</p>
      </Panel>
    );
    expect(container.querySelector("header")).toBeDefined();
  });

  it("uses section element as root", () => {
    const { container } = render(
      <Panel>
        <p>body</p>
      </Panel>
    );
    expect(container.querySelector("section")).toBeDefined();
  });

  it("applies custom className to section", () => {
    const { container } = render(
      <Panel className="extra-class">
        <p>body</p>
      </Panel>
    );
    expect(container.querySelector("section")?.className).toContain("extra-class");
  });
});
