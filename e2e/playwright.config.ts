import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 1,
  workers: process.env.CI ? 2 : undefined,
  use: {
    actionTimeout: 0,
    trace: "on-first-retry",
    baseURL: "http://127.0.0.1:4173",
  },
  expect: {
    timeout: 5000,
  },
  reporter: "html",
  projects: [
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
    reuseExistingServer: true,
    timeout: 30000,
  },
});
