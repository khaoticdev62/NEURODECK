import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "../../components/primitives/Modal";

function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  const onClose = vi.fn();
  const result = render(
    <Modal open={true} onClose={onClose} title="Test Modal" {...props}>
      <button>First</button>
      <button>Second</button>
    </Modal>
  );
  return { ...result, onClose };
}

describe("Modal", () => {
  it("renders nothing when open=false", () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <p>Hidden content</p>
      </Modal>
    );
    expect(screen.queryByText("Hidden content")).toBeNull();
  });

  it("renders children when open=true", () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <p>Visible content</p>
      </Modal>
    );
    expect(screen.getByText("Visible content")).toBeDefined();
  });

  it("renders title in header", () => {
    renderModal({ title: "Confirm delete" });
    expect(screen.getByText("Confirm delete")).toBeDefined();
  });

  it("renders description when provided", () => {
    renderModal({ description: "This action cannot be undone." });
    expect(screen.getByText("This action cannot be undone.")).toBeDefined();
  });

  it("renders footer slot", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="T" footer={<button>Cancel</button>}>
        <p>body</p>
      </Modal>
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDefined();
  });

  it('has role="dialog" and aria-modal="true"', () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("dialog is labelled by the title", () => {
    renderModal({ title: "Settings" });
    const dialog = screen.getByRole("dialog");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    const titleEl = document.getElementById(labelId!);
    expect(titleEl?.textContent).toBe("Settings");
  });

  it("calls onClose when close button clicked", async () => {
    const { onClose } = renderModal();
    await userEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop clicked and closeOnBackdrop=true", () => {
    const { onClose } = renderModal({ closeOnBackdrop: true });
    const backdrop = document.querySelector(".nd-modal__overlay") as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does NOT call onClose when backdrop clicked and closeOnBackdrop=false", () => {
    const { onClose } = renderModal({ closeOnBackdrop: false });
    const backdrop = document.querySelector(".nd-modal__overlay") as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Escape key pressed", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("title uses h2 heading element", () => {
    renderModal({ title: "My Dialog" });
    expect(screen.getByRole("heading", { level: 2, name: "My Dialog" })).toBeDefined();
  });

  it("applies sm size class", () => {
    renderModal({ size: "sm" });
    const panel = document.querySelector('[tabindex="-1"]');
    expect(panel?.className).toContain("nd-modal--sm");
  });

  it("applies xl size class", () => {
    renderModal({ size: "xl" });
    const panel = document.querySelector('[tabindex="-1"]');
    expect(panel?.className).toContain("nd-modal--xl");
  });
});
