import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const repoRoot = path.resolve(__dirname, "..");
const rendererRoot = path.resolve(repoRoot, "src/renderer");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@renderer": rendererRoot,
      "@features": path.resolve(rendererRoot, "features"),
      "@components": path.resolve(rendererRoot, "components"),
      "@hooks": path.resolve(rendererRoot, "hooks"),
      "@state": path.resolve(rendererRoot, "state"),
      "@services": path.resolve(rendererRoot, "services"),
      "@theme": path.resolve(rendererRoot, "theme"),
      "@input": path.resolve(rendererRoot, "input"),
      "@types-renderer": path.resolve(rendererRoot, "types"),
      "@ds": path.resolve(rendererRoot, "design-system"),
      "@shared": path.resolve(repoRoot, "src/shared"),
    },
  },
  test: {
    root: repoRoot,
    setupFiles: [path.resolve(__dirname, "vitest.setup.js")],
    environment: "happy-dom",
    globals: true,
    pool: "forks",
    forks: {
      singleFork: true,
    },
    include: ["src/renderer/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/renderer/**/*.{ts,tsx}"],
      exclude: [
        "src/renderer/types/**",
        "src/renderer/**/*.d.ts",
        "src/renderer/**/__tests__/**",
      ],
    },
  },
});
