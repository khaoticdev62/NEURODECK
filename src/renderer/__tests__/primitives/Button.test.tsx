import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../../components/primitives/Button";

describe("Button", () => {
  it("renders children as button text", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
  });

  it("fires onClick handler on click", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled when disabled=true", () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole("button");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("is disabled and shows spinner when loading=true", () => {
    const { container } = render(<Button loading>Loading</Button>);
    const btn = screen.getByRole("button");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(btn.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector("svg")).toBeDefined();
  });

  it("does not fire onClick while loading", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Submit
      </Button>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies primary variant classes", () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    expect(container.querySelector("button")?.className).toContain("nd-btn--primary");
  });

  it("applies danger variant classes", () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.querySelector("button")?.className).toContain("nd-btn--danger");
  });

  it("applies fullWidth class when fullWidth=true", () => {
    const { container } = render(<Button fullWidth>Full</Button>);
    expect(container.querySelector("button")?.className).toContain("w-full");
  });

  it("sm size applies nd-btn--sm class", () => {
    const { container } = render(<Button size="sm">Small</Button>);
    expect(container.querySelector("button")?.className).toContain("nd-btn--sm");
  });

  it("lg size applies nd-btn--lg class", () => {
    const { container } = render(<Button size="lg">Large</Button>);
    expect(container.querySelector("button")?.className).toContain("nd-btn--lg");
  });

  it("passes through arbitrary HTML button attributes", () => {
    render(
      <Button type="submit" data-testid="submit-btn">
        Submit
      </Button>
    );
    const btn = screen.getByTestId("submit-btn");
    expect(btn.getAttribute("type")).toBe("submit");
  });

  it("forwards ref to underlying button element", () => {
    let ref: HTMLButtonElement | null = null;
    render(
      <Button
        ref={(el) => {
          ref = el;
        }}
      >
        Ref
      </Button>
    );
    expect(ref).not.toBeNull();
    expect((ref as HTMLButtonElement | null)?.tagName).toBe("BUTTON");
  });
});
