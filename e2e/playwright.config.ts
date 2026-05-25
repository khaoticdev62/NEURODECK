import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    actionTimeout: 0,
    trace: "on-first-retry",
    baseURL: "http://127.0.0.1:4173",
  },
  expect: {
    timeout: 5000,
  },
  reporter: "html",
  webServer: {
    command: "node support/static-server.cjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
