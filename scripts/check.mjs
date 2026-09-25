// The single quality gate: repository tests, then every product's own check.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, stdio: 'inherit' }).status === 0;

const results = [['repository tests', run(process.execPath, ['--test', 'tests/**/*.test.js'], root)]];

const productsDir = join(root, 'products');
if (existsSync(productsDir)) {
  for (const name of readdirSync(productsDir).sort()) {
    const pkg = join(productsDir, name, 'package.json');
    if (!existsSync(pkg)) {
      results.push([`products/${name}: missing package.json with a "check" script`, false]);
      continue;
    }
    const hasCheck = Boolean(JSON.parse(readFileSync(pkg, 'utf8')).scripts?.check);
    results.push([`products/${name}`, hasCheck && run('npm', ['run', 'check', '--silent'], join(productsDir, name))]);
  }
}

console.log('\n== check summary ==');
for (const [label, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
if (results.some(([, ok]) => !ok)) process.exitCode = 1;
