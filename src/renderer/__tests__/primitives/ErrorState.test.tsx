import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "../../components/primitives/ErrorState";

describe("ErrorState", () => {
  it("renders default title when no props provided", () => {
    render(<ErrorState />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("renders custom title", () => {
    render(<ErrorState title="Connection failed" />);
    expect(screen.getByText("Connection failed")).toBeDefined();
  });

  it("renders optional message", () => {
    render(<ErrorState message="Check your network and try again." />);
    expect(screen.getByText("Check your network and try again.")).toBeDefined();
  });

  it("does not render message element when omitted", () => {
    render(<ErrorState title="Error" />);
    expect(screen.queryByText(/check your/i)).toBeNull();
  });

  it("renders retry button when onRetry is provided", async () => {
    const retry = vi.fn();
    render(<ErrorState onRetry={retry} />);
    const btn = screen.getByRole("button", { name: /try again/i });
    expect(btn).toBeDefined();
    await userEvent.click(btn);
    expect(retry).toHaveBeenCalledOnce();
  });

  it("uses custom retryLabel", () => {
    render(<ErrorState onRetry={() => {}} retryLabel="Reconnect" />);
    expect(screen.getByRole("button", { name: /reconnect/i })).toBeDefined();
  });

  it("does not render retry button when onRetry is omitted", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it('has role="alert" so screen readers announce it immediately', () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("applies fullHeight class when fullHeight=true", () => {
    const { container } = render(<ErrorState fullHeight />);
    const div = container.querySelector('[role="alert"]');
    expect(div?.className).toContain("h-full");
  });
});
