import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ["./vitest.setup.js"],
    environment: "happy-dom",
    globals: true,
    // Run all tests serially to keep memory usage predictable
    pool: "forks",
    forks: {
      singleFork: true,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/react/**/*.{ts,tsx}"],
      exclude: [
        "src/react/types/**",
        "src/react/**/*.d.ts",
        "src/**/__tests__/**",
      ],
    },
  },
});
