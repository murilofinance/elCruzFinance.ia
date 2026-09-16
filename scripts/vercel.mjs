import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function npm(cwd, args) {
  const result = spawnSync('npm', args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_workspaces: 'false',
    },
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const target = process.argv[2];
const apiDir = path.join(root, 'apps', 'api');
const webDir = path.join(root, 'apps', 'web');

if (target === 'install') {
  npm(apiDir, ['install', '--include=dev']);
  npm(webDir, ['install', '--include=dev']);
} else if (target === 'build') {
  npm(apiDir, ['run', 'build']);
  npm(webDir, ['run', 'build']);
} else {
  console.error('Uso: node scripts/vercel.mjs install|build');
  process.exit(1);
}
