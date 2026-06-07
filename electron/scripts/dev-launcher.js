/**
 * Dev launcher — unsets ELECTRON_RUN_AS_NODE before spawning Electron.
 * This environment variable is set by some IDEs (e.g. Cursor/Antigravity)
 * and causes Electron to run as Node.js, breaking the main process.
 */
const { spawn } = require('child_process');
const path = require('path');

const env = { ...process.env, ELECTRON_DEV: '1' };
delete env.ELECTRON_RUN_AS_NODE;

const electronPath = require('electron');
const child = spawn(electronPath, ['.', '--remote-debugging-port=9222'], {
  cwd: path.dirname(__dirname),
  env,
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
