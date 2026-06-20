import { expect, type Page, type TestInfo } from "@playwright/test";
import { AppPage } from "../pages/AppPage";

export const STEAM_DECK_VIEWPORT = { width: 1280, height: 800 } as const;

export const STEAM_DECK_VIEWS = [
  "chat", "execution", "agent", "memory", "canvas", "terminal", "ssh", "ide",
  "git", "api-lab", "cli-maker", "browser", "tunnel", "share", "torrent",
  "remote", "project", "docs", "prompt-lab", "academy", "graph", "sessions",
  "scheduler", "orchestrator", "sync", "models", "cache", "plugins",
  "diagnostics", "fonts", "mcp", "security", "themes", "exports", "maintenance",
  "recovery",
] as const;

export type SteamDeckViewId = (typeof STEAM_DECK_VIEWS)[number];
export type SteamDeckOverlayId =
  | "settings"
  | "command-palette"
  | "shortcuts"
  | "notifications"
  | "quick-switcher"
  | "controller-hints";

export interface SteamDeckScreen {
  id: SteamDeckViewId | SteamDeckOverlayId;
  kind: "view" | "overlay";
  root: string;
  reference?: string;
}

export const STEAM_DECK_SCREENS: readonly SteamDeckScreen[] = [
  ...STEAM_DECK_VIEWS.map((id) => ({
    id,
    kind: "view" as const,
    root: `[data-testid="view-${id}"]`,
    reference: [
      "chat", "agent", "memory", "canvas", "terminal", "ssh", "browser", "tunnel",
      "share", "remote", "docs", "prompt-lab",
    ].includes(id) ? `docs/screenshots/${id}.png` : undefined,
  })),
  { id: "settings", kind: "overlay", root: "#settings-overlay", reference: "docs/screenshots/settings.png" },
  { id: "command-palette", kind: "overlay", root: "#command-palette-overlay", reference: "docs/screenshots/command-palette.png" },
  { id: "shortcuts", kind: "overlay", root: "#shortcuts-overlay", reference: "docs/screenshots/shortcuts.png" },
  { id: "notifications", kind: "overlay", root: "#notif-modal" },
  { id: "quick-switcher", kind: "overlay", root: "#quick-switcher-overlay" },
  { id: "controller-hints", kind: "overlay", root: '[aria-label="Controller hints"]' },
];

export interface RuntimeDiagnostics {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
}

export interface GeometryFinding {
  selector: string;
  message: string;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface SteamDeckAuditReport {
  screen: string;
  viewport: typeof STEAM_DECK_VIEWPORT;
  rootTextLength: number;
  documentSize: { width: number; height: number };
  findings: GeometryFinding[];
  runtime: RuntimeDiagnostics;
}

const EXPECTED_OFFLINE_ERRORS = [
  "favicon",
  "127.0.0.1:9477",
  "websocket",
  "net::err_connection_refused",
];

export function collectRuntimeDiagnostics(page: Page): RuntimeDiagnostics {
  const result: RuntimeDiagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  page.on("console", (message) => {
    if (message.type() === "error") result.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => result.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const detail = `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`;
    if (!EXPECTED_OFFLINE_ERRORS.some((allowed) => detail.toLowerCase().includes(allowed))) {
      result.failedRequests.push(detail);
    }
  });
  return result;
}

export async function openSteamDeckScreen(app: AppPage, screen: SteamDeckScreen): Promise<void> {
  if (screen.kind === "view") {
    await app.navigateTo(screen.id);
    return;
  }

  switch (screen.id) {
    case "settings": await app.openSettings(); break;
    case "command-palette": await app.openCommandPalette(); break;
    case "shortcuts": await app.openShortcuts(); break;
    case "notifications": await app.openNotifications(); break;
    case "quick-switcher": await app.openQuickSwitcher(); break;
    case "controller-hints": await app.setDeckMode(true); break;
  }
  await expect(app.page.locator(screen.root)).toBeVisible();
}

export async function auditSteamDeckScreen(
  page: Page,
  screen: SteamDeckScreen,
  runtime: RuntimeDiagnostics,
  testInfo: TestInfo,
): Promise<SteamDeckAuditReport> {
  const report = await page.evaluate(({ rootSelector, screenId, viewport }) => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    const findings: GeometryFinding[] = [];
    const describe = (element: Element): string => {
      const html = element as HTMLElement;
      if (html.id) return `#${CSS.escape(html.id)}`;
      const testId = html.getAttribute("data-testid");
      if (testId) return `[data-testid="${testId}"]`;
      const label = html.getAttribute("aria-label");
      if (label) return `${html.tagName.toLowerCase()}[aria-label="${label}"]`;
      const classes = [...html.classList].slice(0, 2).map((name) => `.${CSS.escape(name)}`).join("");
      const text = html.textContent?.replace(/\s+/g, " ").trim().slice(0, 30);
      return `${html.tagName.toLowerCase()}${classes}${text ? ` (${text})` : ""}`;
    };
    const isVisible = (element: Element): boolean => {
      const html = element as HTMLElement;
      const style = getComputedStyle(html);
      const rect = html.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    };
    const bounds = (element: Element) => {
      const rect = (element as HTMLElement).getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const scrollParent = (element: Element): Element | null => {
      let parent = element.parentElement;
      while (parent && parent !== root) {
        const style = getComputedStyle(parent);
        if (/(auto|scroll)/.test(`${style.overflow}${style.overflowX}${style.overflowY}`)) return parent;
        parent = parent.parentElement;
      }
      return null;
    };

    if (!root || !isVisible(root)) {
      findings.push({ selector: rootSelector, message: "screen root is missing or hidden" });
      return {
        screen: screenId,
        viewport,
        rootTextLength: 0,
        documentSize: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        findings,
      };
    }

    const rootTextLength = (root.innerText ?? "").replace(/\s+/g, " ").trim().length;
    if (rootTextLength === 0) findings.push({ selector: rootSelector, message: "screen contains no visible text" });

    const documentSize = {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    };
    if (documentSize.width > viewport.width + 1) {
      findings.push({ selector: "html", message: `page width ${documentSize.width}px exceeds ${viewport.width}px` });
    }
    if (documentSize.height > viewport.height + 1) {
      findings.push({ selector: "html", message: `page height ${documentSize.height}px exceeds ${viewport.height}px` });
    }

    const rootRect = root.getBoundingClientRect();
    if (rootRect.left < -1 || rootRect.top < -1 || rootRect.right > viewport.width + 1 || rootRect.bottom > viewport.height + 1) {
      findings.push({ selector: rootSelector, message: "screen root is clipped by the viewport", bounds: bounds(root) });
    }

    const interactiveSelector = "button, a[href], input, select, textarea, [role='button'], [role='link'], [tabindex]:not([tabindex='-1'])";
    for (const element of root.querySelectorAll<HTMLElement>(interactiveSelector)) {
      if (!isVisible(element) || element.closest("[aria-hidden='true']")) continue;
      const rect = element.getBoundingClientRect();
      const outside = rect.right <= 0 || rect.bottom <= 0 || rect.left >= viewport.width || rect.top >= viewport.height;
      if ((outside || rect.left < -1 || rect.top < -1 || rect.right > viewport.width + 1 || rect.bottom > viewport.height + 1) && scrollParent(element)) continue;
      if (!(element instanceof SVGElement) && (rect.left < -1 || rect.top < -1 || rect.right > viewport.width + 1 || rect.bottom > viewport.height + 1)) {
        findings.push({ selector: describe(element), message: "visible interactive control is clipped", bounds: bounds(element) });
      }
      const labelledControl = element as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> };
      const name = element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") ||
        element.getAttribute("title") || element.textContent?.trim() ||
        (element as HTMLInputElement).placeholder || (element as HTMLInputElement).value ||
        labelledControl.labels?.[0]?.textContent?.trim();
      if (!name) findings.push({ selector: describe(element), message: "interactive control has no accessible name" });
    }

    const primarySelector = [
      "nav[aria-label='Main navigation'] button[data-view]",
      "#settings-btn", "#command-palette-btn", "#notif-btn",
      "[data-testid='deck-mode-toggle']",
      "[aria-label='Controller hints'] button",
      `${rootSelector} [data-primary-action='true']`,
    ].join(",");
    for (const element of document.querySelectorAll<HTMLElement>(primarySelector)) {
      if (!isVisible(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        findings.push({ selector: describe(element), message: `primary hit target is ${Math.round(rect.width)}×${Math.round(rect.height)}; minimum is 44×44`, bounds: bounds(element) });
      }
    }

    for (const image of root.querySelectorAll<HTMLImageElement>("img")) {
      if (isVisible(image) && image.complete && image.naturalWidth === 0) {
        findings.push({ selector: describe(image), message: "image failed to load" });
      }
    }

    return { screen: screenId, viewport, rootTextLength, documentSize, findings };
  }, { rootSelector: screen.root, screenId: screen.id, viewport: STEAM_DECK_VIEWPORT });

  const filteredRuntime: RuntimeDiagnostics = {
    consoleErrors: runtime.consoleErrors.filter((entry) =>
      !EXPECTED_OFFLINE_ERRORS.some((allowed) => entry.toLowerCase().includes(allowed))),
    pageErrors: [...runtime.pageErrors],
    failedRequests: [...runtime.failedRequests],
  };
  const complete: SteamDeckAuditReport = { ...report, runtime: filteredRuntime };
  await testInfo.attach(`steam-deck-audit-${screen.id}.json`, {
    body: Buffer.from(JSON.stringify(complete, null, 2)),
    contentType: "application/json",
  });
  return complete;
}

export function expectCleanSteamDeckAudit(report: SteamDeckAuditReport): void {
  expect(report.findings, JSON.stringify(report.findings, null, 2)).toEqual([]);
  expect(report.runtime.consoleErrors, "unexpected console errors").toEqual([]);
  expect(report.runtime.pageErrors, "uncaught page errors").toEqual([]);
  expect(report.runtime.failedRequests, "unexpected failed resources").toEqual([]);
}
