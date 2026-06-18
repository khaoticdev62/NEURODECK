import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "../../components/primitives/IconButton";
import { X } from "lucide-react";

describe("IconButton", () => {
  it("renders children", () => {
    render(
      <IconButton aria-label="Close">
        <X />
      </IconButton>
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeDefined();
  });

  it('has type="button" by default to prevent accidental form submission', () => {
    render(
      <IconButton aria-label="action">
        <X />
      </IconButton>
    );
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="click" onClick={onClick}>
        <X />
      </IconButton>
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies md size classes by default", () => {
    const { container } = render(
      <IconButton aria-label="x">
        <X />
      </IconButton>
    );
    expect(container.querySelector("button")?.className).toContain("min-h-touch");
  });

  it("applies sm size classes", () => {
    const { container } = render(
      <IconButton aria-label="x" size="sm">
        <X />
      </IconButton>
    );
    expect(container.querySelector("button")?.className).toContain("min-h-touch");
  });

  it("applies lg size classes", () => {
    const { container } = render(
      <IconButton aria-label="x" size="lg">
        <X />
      </IconButton>
    );
    expect(container.querySelector("button")?.className).toContain("min-h-touch");
  });

  it("applies xl size classes", () => {
    const { container } = render(
      <IconButton aria-label="x" size="xl">
        <X />
      </IconButton>
    );
    expect(container.querySelector("button")?.className).toContain("min-h-12");
  });

  it("applies subtle variant by default", () => {
    const { container } = render(
      <IconButton aria-label="x">
        <X />
      </IconButton>
    );
    expect(container.querySelector("button")?.className).toContain("nd-iconbtn--subtle");
  });

  it("applies ghost variant", () => {
    const { container } = render(
      <IconButton aria-label="x" variant="ghost">
        <X />
      </IconButton>
    );
    expect(container.querySelector("button")?.className).toContain("nd-iconbtn--ghost");
  });

  it("applies outline variant", () => {
    const { container } = render(
      <IconButton aria-label="x" variant="outline">
        <X />
      </IconButton>
    );
    expect(container.querySelector("button")?.className).toContain("nd-iconbtn--outline");
  });

  it("passes through additional props", () => {
    render(
      <IconButton aria-label="x" data-testid="ib" disabled>
        <X />
      </IconButton>
    );
    const btn = screen.getByTestId("ib") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("accepts custom className", () => {
    const { container } = render(
      <IconButton aria-label="x" className="custom-cls">
        <X />
      </IconButton>
    );
    expect(container.querySelector("button")?.className).toContain("custom-cls");
  });

  it("forwards ref to underlying button element", () => {
    let ref: HTMLButtonElement | null = null;
    render(
      <IconButton
        aria-label="x"
        ref={(el) => {
          ref = el;
        }}
      >
        <X />
      </IconButton>
    );
    expect(ref).not.toBeNull();
    expect((ref as HTMLButtonElement | null)?.tagName).toBe("BUTTON");
  });
});
