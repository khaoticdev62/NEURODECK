// Global mocks for Vitest (Node + jsdom/happy-dom environments)
// This runs before any test file imports execute.

import { vi } from "vitest";

const storage = new Map();

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  },
  writable: true,
  configurable: true,
});

// Define a mutable navigator so tests can spy on getGamepads
const nav = {
  getGamepads: () => [],
  userAgent: "vitest",
};
Object.defineProperty(globalThis, "navigator", {
  get() {
    return nav;
  },
  set(v) {
    Object.assign(nav, v);
  },
  configurable: true,
});

// Define a mutable performance so tests can spy on now
const perf = {
  now: () => Date.now(),
};
Object.defineProperty(globalThis, "performance", {
  get() {
    return perf;
  },
  set(v) {
    Object.assign(perf, v);
  },
  configurable: true,
});

// Mock @tauri-apps/api/core so modules that import invoke() work in tests
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

// Mock @tauri-apps/api/event
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn().mockResolvedValue(undefined),
}));
