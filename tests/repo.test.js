// Guards the department itself: if its manual, roles or skills go missing or
// become malformed, every future session works blind, so the build fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, realpathSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const frontmatter = (text) => {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, 'missing frontmatter');
  return Object.fromEntries(m[1].split('\n').filter((l) => /^[\w-]+:/.test(l)).map((l) => {
    const i = l.indexOf(':');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
  }));
};

test('operating files exist', () => {
  for (const p of [
    'AGENTS.md', 'CLAUDE.md', 'README.md', 'docs/decisions.md', 'docs/founder-setup.md',
    '.github/copilot-instructions.md', '.github/pull_request_template.md',
    '.github/ISSUE_TEMPLATE/order.yml', '.github/workflows/check.yml',
    '.github/workflows/copilot-setup-steps.yml', '.github/workflows/labels.yml','.github/hooks/guard.json', '.claude/settings.json',
  ]) {
    assert.ok(existsSync(new URL(p, root)), `missing ${p}`);
  }
});

test('manual keeps its essential sections and CLAUDE.md imports it', () => {
  const manual = read('AGENTS.md');
  for (const h of ['## Commands', '## How an order becomes a result', '## Definition of done', '## Boundaries', '## Lessons learned']) {
    assert.ok(manual.includes(h), `AGENTS.md lost section: ${h}`);
  }
  assert.match(read('CLAUDE.md'), /^@AGENTS\.md$/m);
});

test('every role agent has a description and every referenced role exists', () => {
  const dir = new URL('.github/agents/', root);
  const names = readdirSync(dir).filter((f) => f.endsWith('.agent.md'));
  for (const f of names) {
    const fm = frontmatter(readFileSync(new URL(f, dir), 'utf8'));
    assert.ok(fm.description && fm.description.length > 20, `${f} needs a description`);
    assert.equal(fm.name, f.replace('.agent.md', ''), `${f} name must match file name`);
  }
  for (const role of ['lead', 'planner', 'tester', 'coder', 'reviewer', 'researcher']) {
    assert.ok(names.includes(`${role}.agent.md`), `missing role ${role}`);
  }
});

test('every skill is well-formed and reachable by Claude Code', () => {
  const dir = new URL('.github/skills/', root);
  for (const name of readdirSync(dir)) {
    const fm = frontmatter(readFileSync(new URL(`${name}/SKILL.md`, dir), 'utf8'));
    assert.equal(fm.name, name, `skill ${name}: name must match directory`);
    assert.match(name, /^[a-z0-9-]+$/);
    assert.ok(fm.description && fm.description.length > 20, `skill ${name} needs a description`);
  }
  assert.equal(realpathSync(new URL('.claude/skills', root)), realpathSync(dir));
});

test('hook configurations are valid and point at the guard', () => {
  const copilot = JSON.parse(read('.github/hooks/guard.json'));
  assert.equal(copilot.version, 1);
  assert.match(copilot.hooks.preToolUse[0].bash, /scripts\/agent-guard\.sh/);
  const claude = JSON.parse(read('.claude/settings.json'));
  assert.match(claude.hooks.PreToolUse[0].hooks[0].command, /scripts\/agent-guard\.sh/);
});

test('path instructions target code review only', () => {
  const fm = frontmatter(read('.github/instructions/code-review.instructions.md'));
  assert.equal(fm.applyTo, '**');
  assert.equal(fm.excludeAgent, 'cloud-agent');
});

test('decision entries have unique ids', () => {
  const ids = [...read('docs/decisions.md').matchAll(/^## (D-\d{3})/gm)].map((m) => m[1]);
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length, 'duplicate decision id');
});
