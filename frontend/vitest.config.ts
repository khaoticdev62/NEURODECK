import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.js"],
    environment: "node",
    // Run all tests serially to keep memory usage predictable
    pool: "forks",
    forks: {
      singleFork: true,
    },
  },
});
