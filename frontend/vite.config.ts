import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_"],
  build: {
    target: ["es2022", "chrome110", "safari15"],
    minify: process.env.NODE_ENV === "production" ? "esbuild" : false,
    sourcemap: process.env.NODE_ENV !== "production",
    rollupOptions: {
      output: {
        manualChunks(id) {
          // xterm.js and its addons — heavy, isolated
          if (id.includes("xterm")) return "xterm";
          // marked.js — standalone parser
          if (id.includes("marked")) return "marked";
          // qrcode — infrequently used
          if (id.includes("qrcode")) return "qrcode";
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
