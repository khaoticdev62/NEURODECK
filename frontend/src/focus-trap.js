/**
 * Vanilla JS Focus Trap — restricts Tab / Shift+Tab cycling to focusable
 * children of a given container. Automatically restores focus on deactivation.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "[contenteditable]",
].join(",");

export class FocusTrap {
  constructor(container) {
    this.container = container;
    this.previousActiveElement = null;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onFocusIn = this._onFocusIn.bind(this);
  }

  activate() {
    if (!this.container) return;
    this.previousActiveElement = document.activeElement;
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("focusin", this._onFocusIn);
    // Focus first focusable element
    const first = this._getFocusableElements()[0];
    if (first) {
      first.focus({ preventScroll: true });
    }
  }

  deactivate(returnFocus = true) {
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("focusin", this._onFocusIn);
    if (returnFocus && this.previousActiveElement) {
      this.previousActiveElement.focus({ preventScroll: true });
    }
    this.previousActiveElement = null;
  }

  _getFocusableElements() {
    if (!this.container) return [];
    return Array.from(this.container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => el.offsetParent !== null && !el.hasAttribute("disabled")
    );
  }

  _onKeyDown(e) {
    if (e.key !== "Tab") return;
    const focusable = this._getFocusableElements();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !this.container.contains(document.activeElement)) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      }
    } else {
      if (document.activeElement === last || !this.container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    }
  }

  _onFocusIn(e) {
    if (!this.container.contains(e.target)) {
      const focusable = this._getFocusableElements();
      const first = focusable[0];
      if (first) first.focus({ preventScroll: true });
    }
  }
}
