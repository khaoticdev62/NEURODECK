import { defineConfig, devices } from "@playwright/test";

const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  globalTimeout: IS_CI ? 300_000 : 600_000,
  retries: IS_CI ? 1 : 0,
  workers: IS_CI ? 2 : undefined,
  fullyParallel: false,
  use: {
    actionTimeout: 15000,
    navigationTimeout: 15000,
    trace: "on-first-retry",
    baseURL: "http://127.0.0.1:4173",
  },
  expect: {
    timeout: 10000,
  },
  reporter: IS_CI ? [["html"], ["list"]] : "html",
  projects: IS_CI
    ? [
        {
          name: "chromium-desktop",
          use: { ...devices["Desktop Chrome"] },
        },
      ]
    : [
        {
          name: "chromium-desktop",
          use: { ...devices["Desktop Chrome"] },
        },
        {
          name: "firefox-desktop",
          use: { ...devices["Desktop Firefox"] },
        },
        {
          name: "steam-deck",
          use: {
            viewport: { width: 1280, height: 800 },
            isMobile: true,
            hasTouch: true,
          },
        },
      ],
  webServer: {
    command: "node support/static-server.cjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !IS_CI,
    timeout: 30000,
  },
});
