import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

const repoRoot = path.resolve(__dirname, "..");
const rendererRoot = path.resolve(repoRoot, "src/renderer");

export default defineConfig({
  // Root is repo root so index.html and src/renderer/ are resolved correctly
  root: repoRoot,
  // publicDir must be explicit because root moved to repoRoot; Vite's default
  // <root>/public/ doesn't exist — static assets live in frontend/public/.
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    target: ["es2022", "chrome110", "safari15"],
    minify: process.env.NODE_ENV === "production" ? "esbuild" : false,
    sourcemap: process.env.NODE_ENV !== "production",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("xterm")) return "xterm";
          if (id.includes("marked")) return "marked";
          if (id.includes("qrcode")) return "qrcode";
          if (id.includes("/features/academy/")) return "view-academy";
          if (id.includes("/features/canvas/") || id.includes("monaco-editor")) return "view-canvas";
          if (id.includes("/features/ide/") || id.includes("/lsp_client")) return "view-ide";
          if (id.includes("/features/browser/")) return "view-browser";
          if (id.includes("/features/terminal/") || id.includes("/features/ssh/")) return "view-terminal";
          if (id.includes("/features/settings/")) return "view-settings";
          if (id.includes("/features/agents/") || id.includes("/features/memory/") || id.includes("/features/project/")) return "view-intel";
          if (id.includes("/features/api-lab/") || id.includes("/features/cli-maker/") || id.includes("/features/git/")) return "view-devtools";
          if (id.includes("/features/diagnostics/") || id.includes("/features/execution/") || id.includes("/features/cache/") || id.includes("/features/plugins/") || id.includes("/features/sessions/")) return "view-system";
          if (id.includes("/features/models/")) return "view-models";
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  plugins: [
    react(),
    ...(process.env.ANALYZE === "true"
      ? [visualizer({ open: true, filename: "frontend/dist/stats.html", gzipSize: true, brotliSize: true })]
      : []),
  ],
  clearScreen: false,
  css: {
    // Vite root is repoRoot, but postcss.config.js lives in frontend/.
    // Explicitly point PostCSS discovery here so Tailwind is processed.
    postcss: __dirname,
  },
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    watch: {
      usePolling: process.platform === "win32",
      interval: 300,
    },
    hmr: {
      host: "127.0.0.1",
      port: 24678,
      protocol: "ws",
      overlay: true,
    },
  },
  envPrefix: ["VITE_"],
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
});
