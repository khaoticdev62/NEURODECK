import { defineConfig, devices } from "@playwright/test";

const IS_CI = !!process.env.CI;
const INCLUDE_FIREFOX = process.env.E2E_FIREFOX === "1";

const chromiumDesktop = {
  name: "chromium-desktop",
  use: { ...devices["Desktop Chrome"] },
};

const firefoxDesktop = {
  name: "firefox-desktop",
  use: { ...devices["Desktop Firefox"] },
};

const steamDeck = {
  name: "steam-deck",
  use: {
    viewport: { width: 1280, height: 800 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    screen: { width: 1280, height: 800 },
    userAgent: "NEURODECK-Steam-Deck-E2E",
  },
};

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/electron-native.spec.ts"],
  timeout: 30000,
  globalTimeout: IS_CI ? 600_000 : 600_000,
  globalSetup: "./support/global-setup.cjs",
  retries: IS_CI ? 1 : 0,
  workers: IS_CI ? 2 : undefined,
  fullyParallel: false,
  outputDir: "test-results",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  use: {
    actionTimeout: 15000,
    navigationTimeout: 15000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    baseURL: "http://127.0.0.1:4173",
  },
  expect: {
    timeout: 10000,
  },
  reporter: IS_CI ? [["html"], ["list"]] : "html",
  projects: [chromiumDesktop, ...(INCLUDE_FIREFOX && !IS_CI ? [firefoxDesktop] : []), steamDeck],
});
