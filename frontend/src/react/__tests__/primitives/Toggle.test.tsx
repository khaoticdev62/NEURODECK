import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "../../components/primitives/Toggle";

describe("Toggle", () => {
  it("renders as a switch button", () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="Enable feature" />);
    expect(screen.getByRole("switch", { name: "Enable feature" })).toBeDefined();
  });

  it("reflects checked state via aria-checked", () => {
    const { rerender } = render(<Toggle checked={false} onChange={vi.fn()} label="Dark mode" />);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    rerender(<Toggle checked={true} onChange={vi.fn()} label="Dark mode" />);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  it("calls onChange when clicked", async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Toggle me" />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("does not call onChange when disabled", async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Disabled toggle" disabled />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is disabled when disabled=true", () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="Disabled" disabled />);
    expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(true);
  });

  it("is keyboard activatable via Space/Enter", async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Keyboard toggle" />);
    const toggle = screen.getByRole("switch");
    toggle.focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledOnce();
  });
});
