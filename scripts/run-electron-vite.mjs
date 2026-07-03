#!/usr/bin/env node
// Strips `ELECTRON_RUN_AS_NODE` before launching electron-vite. When that
// var is set in the parent shell (some Electron-based dev tools set it for
// their own spawned subprocesses), the `electron` binary launches in plain
// Node compatibility mode instead of real Electron, so `electron.app` is
// undefined and `@electron-toolkit/utils` crashes immediately on startup —
// the exact issue `e2e/helpers/launchApp.ts` already works around for test
// launches. This wrapper gives `npm run dev`/`npm run start` the same
// immunity regardless of what environment they're invoked from.
import { spawn } from 'node:child_process'

const mode = process.argv[2]
if (!mode) {
  console.error('Usage: node scripts/run-electron-vite.mjs <dev|preview>')
  process.exit(1)
}

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn('electron-vite', [mode], { stdio: 'inherit', env, shell: true })
child.on('exit', (code) => process.exit(code ?? 0))
