const { spawnSync } = require('child_process');

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node run-fallow-if-available.js <fallow-args...>');
    process.exit(1);
  }

  const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['fallow'], { stdio: 'ignore' });
  if (probe.status !== 0) {
    console.log('fallow CLI is not installed. Skipping: fallow ' + args.join(' '));
    console.log('Install fallaw to regenerate reports locally.');
    process.exit(0);
  }

  const result = spawnSync('fallow', args, { stdio: 'inherit', shell: false });
  process.exit(result.status ?? 0);
}

main();
