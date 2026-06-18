import type { FocusGraph } from "../../shared/types/controller";

const FOCUSABLE_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function getFocusableElements(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") return false;
    return isVisible(el);
  });
}

export function findInteractiveRoot(): HTMLElement {
  const visibleModals = Array.from(
    document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
  ).filter(isVisible);
  const modal = visibleModals[visibleModals.length - 1];
  if (modal) return modal;

  const visibleOverlays = Array.from(
    document.querySelectorAll<HTMLElement>("[data-controller-overlay='true']")
  ).filter(isVisible);
  const activeOverlay = visibleOverlays[visibleOverlays.length - 1];
  if (activeOverlay) return activeOverlay;

  const activeScreen = document.querySelector<HTMLElement>(
    "[data-controller-screen-active='true']"
  );
  return activeScreen ?? document.body;
}

function getRectCenter(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export function focusDefault(root?: HTMLElement): HTMLElement | null {
  const scope = root ?? findInteractiveRoot();
  const explicitDefault = scope.querySelector<HTMLElement>("[data-controller-default='true']");
  const target =
    explicitDefault && isVisible(explicitDefault)
      ? explicitDefault
      : getFocusableElements(scope)[0];
  target?.focus({ preventScroll: false });
  target?.scrollIntoView({ block: "nearest", inline: "nearest" });
  return target ?? null;
}

export function moveSpatialFocus(direction: "up" | "down" | "left" | "right", root?: HTMLElement) {
  const scope = root ?? findInteractiveRoot();
  const candidates = getFocusableElements(scope);
  if (candidates.length === 0) return null;

  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const current =
    active && scope.contains(active) && isVisible(active) ? active : focusDefault(scope);
  if (!current) return null;

  const origin = getRectCenter(current);
  const ranked = candidates
    .filter((candidate) => candidate !== current)
    .map((candidate) => {
      const center = getRectCenter(candidate);
      const dx = center.x - origin.x;
      const dy = center.y - origin.y;
      if (direction === "up" && dy >= -4) return null;
      if (direction === "down" && dy <= 4) return null;
      if (direction === "left" && dx >= -4) return null;
      if (direction === "right" && dx <= 4) return null;

      const primary = direction === "up" || direction === "down" ? Math.abs(dy) : Math.abs(dx);
      const secondary = direction === "up" || direction === "down" ? Math.abs(dx) : Math.abs(dy);
      return { candidate, score: primary * 4 + secondary };
    })
    .filter((item): item is { candidate: HTMLElement; score: number } => item !== null)
    .sort((a, b) => a.score - b.score);

  const target = ranked[0]?.candidate;
  if (!target) return current;

  target.focus({ preventScroll: false });
  target.scrollIntoView({ block: "nearest", inline: "nearest" });
  return target;
}

export function applyFocusGraph(graph: FocusGraph | null): HTMLElement | null {
  if (!graph) return focusDefault();
  const node = graph.nodes.find((item) => item.id === graph.defaultNodeId);
  if (!node) return focusDefault();
  const target = document.getElementById(node.elementId);
  target?.focus({ preventScroll: false });
  target?.scrollIntoView({ block: "nearest", inline: "nearest" });
  return target ?? focusDefault();
}
