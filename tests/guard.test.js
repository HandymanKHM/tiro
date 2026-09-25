import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { decide, isSecretPath, isForcePush } from '../scripts/agent-guard.mjs';

const script = new URL('../scripts/agent-guard.sh', import.meta.url).pathname;
const runHook = (payload) => spawnSync('bash', [script], { input: JSON.stringify(payload), encoding: 'utf8' });

test('secret file detection', () => {
  for (const p of ['.env', 'app/.env.local', '.env.production', 'deploy/key.pem', 'id_rsa', '/home/u/.ssh/id_ed25519']) assert.ok(isSecretPath(p), p);
  for (const p of ['.env.example', 'src/env.js', 'docs/.envelope.md', 'README.md', 'keyboard.js']) assert.ok(!isSecretPath(p), p);
});

test('force push detection', () => {
  for (const c of ['git push --force', 'git push -f origin main', 'git push --force-with-lease', 'git push origin +main', 'npm test && git push -fu origin x']) assert.ok(isForcePush(c), c);
  for (const c of ['git push origin feature', 'git push -u origin feature', 'echo force', 'git commit -m "force push later"']) assert.ok(!isForcePush(c), c);
});

test('Copilot cloud agent payloads (toolArgs object or JSON string)', () => {
  assert.match(decide({ toolName: 'view', toolArgs: { path: '/workspace/.env' } }), /secret/);
  assert.match(decide({ toolName: 'bash', toolArgs: JSON.stringify({ command: 'cat .env | head' }) }), /secret/);
  assert.match(decide({ toolName: 'bash', toolArgs: { command: 'git push --force' } }), /Force push/);
  assert.equal(decide({ toolName: 'bash', toolArgs: { command: 'npm run check' } }), null);
});

test('Claude Code payloads (tool_input)', () => {
  assert.match(decide({ tool_name: 'Read', tool_input: { file_path: '/repo/.env.local' } }), /secret/);
  assert.equal(decide({ tool_name: 'Edit', tool_input: { file_path: 'AGENTS.md', new_string: 'Never commit .env files' } }), null);
  assert.equal(decide({ tool_name: 'Bash', tool_input: { command: 'cp .env.example .env.sample' } }), null);
});

test('hook process: deny exits 2 with Copilot JSON; allow exits 0 silently', () => {
  const denied = runHook({ toolName: 'bash', toolArgs: { command: 'cat .env' } });
  assert.equal(denied.status, 2);
  assert.equal(JSON.parse(denied.stdout).permissionDecision, 'deny');
  assert.match(denied.stderr, /secret/);

  const allowed = runHook({ tool_name: 'Bash', tool_input: { command: 'ls' } });
  assert.equal(allowed.status, 0);
  assert.equal(allowed.stdout, '');
});

test('hook process: unparseable input is allowed, not crashed on', () => {
  const r = spawnSync('bash', [script], { input: 'not json', encoding: 'utf8' });
  assert.equal(r.status, 0);
});
