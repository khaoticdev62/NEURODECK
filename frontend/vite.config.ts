import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: './',
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Force Vite to use polling on Windows/WSL where inotify events are unreliable
      usePolling: process.platform === 'win32',
      interval: 300,
    },
    hmr: {
      host: 'localhost',
      port: 24678,
      protocol: 'ws',
      // Overlay error display inside Electron renderer
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
          if (id.includes("xterm")) return "xterm";
          if (id.includes("marked")) return "marked";
          if (id.includes("qrcode")) return "qrcode";
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
