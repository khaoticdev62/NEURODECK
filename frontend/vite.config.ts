import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: ["es2022", "chrome110", "safari15"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // xterm.js and its addons — heavy, isolated
          if (id.includes("xterm")) return "xterm";
          // marked.js — standalone parser
          if (id.includes("marked")) return "marked";
          // qrcode — infrequently used
          if (id.includes("qrcode")) return "qrcode";
          // Tauri JS API
          if (id.includes("@tauri-apps")) return "tauri-api";
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
