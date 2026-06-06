import { defineConfig } from "@playwright/test";

const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  globalTimeout: IS_CI ? 600_000 : 600_000,
  retries: IS_CI ? 1 : 0,
  workers: 1, // Run tests sequentially in Electron to prevent port/sidecar collisions
  fullyParallel: false,
  use: {
    actionTimeout: 15000,
    navigationTimeout: 15000,
    trace: "on-first-retry",
  },
  expect: {
    timeout: 10000,
  },
  reporter: IS_CI ? [["html"], ["list"]] : "html",
  projects: [
    {
      name: "electron",
    },
  ],
});
