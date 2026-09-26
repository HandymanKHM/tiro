// Tests for the execution-sensitive report, explicit head refs, and
// governance of founder action packages (D-016, D-018).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluate } from '../scripts/pr-policy.mjs';

const policyScript = new URL('../scripts/pr-policy.mjs', import.meta.url).pathname;

test('execution-sensitive paths are reported, ordinary paths are not', () => {
  const r = evaluate([
    { status: 'M', path: '.github/workflows/check.yml' },
    { status: 'A', path: '.github/actions/setup/action.yml' },
    { status: 'A', path: 'tools/action.yaml' },
    { status: 'M', path: '.github/hooks/guard.json' },
    { status: 'M', path: '.claude/settings.json' },
    { status: 'R', oldPath: '.github/workflows/old.yml', path: 'docs/old.yml' },
    { status: 'A', path: 'products/x/src/workflow.js' },
    { status: 'M', path: '.github/agents/coder.agent.md' },
  ]);
  assert.deepEqual(r.executionSensitive, [
    '.github/workflows/check.yml',
    '.github/actions/setup/action.yml',
    'tools/action.yaml',
    '.github/hooks/guard.json',
    '.claude/settings.json',
    '.github/workflows/old.yml',
  ]);
  assert.deepEqual(evaluate([{ status: 'A', path: 'products/x/a.js' }]).executionSensitive, []);
});

test('CLI evaluates an explicit head ref without checking it out', () => {
  const dir = mkdtempSync(join(tmpdir(), 'policy-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  writeFileSync(join(dir, 'a.txt'), 'a\n');
  git('add', '.');
  git('commit', '-qm', 'base');
  git('checkout', '-qb', 'pr');
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
  writeFileSync(join(dir, '.github', 'workflows', 'x.yml'), 'on: push\n');
  git('add', '.');
  git('commit', '-qm', 'pr change');
  git('checkout', '-q', 'main');
  const out = execFileSync(process.execPath, [policyScript, 'main', 'pr'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /PR policy: main\.\.\.pr/);
  assert.match(out, /execution-sensitive: \.github\/workflows\/x\.yml/);
  assert.match(out, /governance: \.github\/workflows\/x\.yml/);
});

test('founder action packages are governance: agents cannot change them unreviewed', () => {
  const r = evaluate([{ status: 'M', path: 'docs/founder-actions/002-private-and-protect-main.sh' }]);
  assert.deepEqual(r.governance, ['docs/founder-actions/002-private-and-protect-main.sh']);
});
