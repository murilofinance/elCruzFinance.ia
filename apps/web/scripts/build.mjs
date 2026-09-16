import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const require = createRequire(path.join(webRoot, 'package.json'));

let vitePkg;
try {
  vitePkg = require.resolve('vite/package.json');
} catch {
  console.error(
    'Pacote vite não encontrado. Rode npm install na raiz do repositório.',
  );
  process.exit(1);
}

const bin = path.join(path.dirname(vitePkg), 'bin/vite.js');
const result = spawnSync(process.execPath, [bin, 'build'], {
  cwd: webRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
