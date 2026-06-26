import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    build: {
      rollupOptions: {
        // Epic X3's ExtensionHost forks this as a real, separate Node
        // process per extension (supplemental spec §9.3) — it needs its
        // own compiled entry alongside the main process's own index.js,
        // not a dynamic `tsx`/`ts-node` runtime dependency in production.
        input: {
          index: resolve('src/main/index.ts'),
          extensionHostEntry: resolve('src/main/extensions/extensionHostEntry.ts')
        }
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    // The preload script runs sandboxed (sandbox: true, required by our
    // hardening baseline) — Electron's sandboxed preload environment has its
    // own polyfilled `require` that can only resolve a small set of Node
    // built-ins, not arbitrary npm packages. electron-vite externalizes all
    // npm dependencies by default (fine for the unsandboxed main process,
    // which has real Node module resolution), so without this the preload
    // bundle ships a bare `require("zod")` that throws at runtime and the
    // whole preload script — including `contextBridge.exposeInMainWorld`
    // for `window.ndx` — silently fails to run. Bundle zod in instead.
    build: {
      externalizeDeps: {
        exclude: ['zod']
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
