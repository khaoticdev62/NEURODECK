import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  base: './',
  plugins: [
    react(),
    ...(process.env.ANALYZE === 'true'
      ? [visualizer({ open: true, filename: 'dist/stats.html', gzipSize: true, brotliSize: true })]
      : []),
  ],
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    watch: {
      usePolling: process.platform === 'win32',
      interval: 300,
    },
    hmr: {
      host: '127.0.0.1',
      port: 24678,
      protocol: 'ws',
      overlay: true,
    },
  },
  envPrefix: ["VITE_"],
  build: {
    target: ["es2022", "chrome110", "safari15"],
    minify: process.env.NODE_ENV === "production" ? "esbuild" : false,
    sourcemap: process.env.NODE_ENV !== "production",
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Third-party library isolation
          if (id.includes("xterm")) return "xterm";
          if (id.includes("marked")) return "marked";
          if (id.includes("qrcode")) return "qrcode";
          // Group all academy sub-modules to avoid 15+ micro-chunks
          if (id.includes("/features/academy/")) return "view-academy";
          // Group canvas + monaco into one editor chunk
          if (id.includes("/features/canvas/") || id.includes("monaco-editor")) return "view-canvas";
          // Group IDE + LSP (also uses Monaco)
          if (id.includes("/features/ide/") || id.includes("/lsp_client")) return "view-ide";
          // Browser feature group
          if (id.includes("/features/browser/")) return "view-browser";
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
