import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseNameStatus, parseAddedLines, isTestFile } from '../scripts/pr-policy.mjs';

test('adding new tests alongside source changes is allowed', () => {
  const r = evaluate([
    { status: 'A', path: 'products/x/src/a.js' },
    { status: 'A', path: 'products/x/tests/a.test.js' },
  ]);
  assert.equal(r.ok, true);
});

test('modifying an existing test alongside source changes fails', () => {
  const r = evaluate([
    { status: 'M', path: 'products/x/src/a.js' },
    { status: 'M', path: 'products/x/tests/a.test.js' },
  ]);
  assert.equal(r.ok, false);
  assert.match(r.violations[0], /modified.*a\.test\.js/);
});

test('deleting or renaming an existing test alongside source changes fails', () => {
  assert.equal(evaluate([{ status: 'M', path: 'src/a.js' }, { status: 'D', path: 'tests/a.test.js' }]).ok, false);
  assert.equal(evaluate([{ status: 'M', path: 'src/a.js' }, { status: 'R', oldPath: 'tests/a.test.js', path: 'tests/b.test.js' }]).ok, false);
});

test('a tests-only change may modify tests but becomes founder-only', () => {
  const r = evaluate([{ status: 'M', path: 'products/x/tests/a.test.js' }]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.testsChanged, ['products/x/tests/a.test.js']);
  assert.deepEqual(r.governance, ['products/x/tests/a.test.js']);
});

test('multi-line skip options are caught; unrelated keys are not', () => {
  const f = (text) => evaluate([{ status: 'A', path: 'tests/a.test.js' }], [{ path: 'tests/a.test.js', text }]).ok;
  assert.equal(f('    { skip: true },'), false);
  assert.equal(f('    only: true,'), false);
  assert.equal(f('    skip: false,'), true);
  assert.equal(f('    skipped: 3,'), true);
  // ordinary fixture data in a product's tests is not a skipped test
  assert.equal(f("  todo: 'Buy milk',"), true);
  assert.equal(f("  { todo: 'Buy milk', done: false },"), true);
  assert.equal(f("  skip: 'intro',"), true);
});

test('newly skipped or focused tests fail', () => {
  for (const text of ["test.skip('x', () => {})", "it.only('x', () => {})", "describe.todo('x')", "test('x', { skip: true }, () => {})"]) {
    const r = evaluate([{ status: 'A', path: 'tests/a.test.js' }], [{ path: 'tests/a.test.js', text }]);
    assert.equal(r.ok, false, text);
  }
});

test('skip calls inside a running test and awaited forms fail', () => {
  for (const text of ['  t.skip();', "  await test.only('x', f);", "    t.todo('later');"]) {
    assert.equal(evaluate([{ status: 'A', path: 'tests/a.test.js' }], [{ path: 'tests/a.test.js', text }]).ok, false, text);
  }
});

test('skip-like text inside strings or comments in test files is not a skipped test', () => {
  for (const text of ["  const s = \"test.skip('x')\";", "  for (const t of ['it.only(1)']) {}", '  // test.skip is forbidden']) {
    assert.equal(evaluate([{ status: 'A', path: 'tests/a.test.js' }], [{ path: 'tests/a.test.js', text }]).ok, true, text);
  }
});

test('skip-like text in non-test files and explicit skip:false are fine', () => {
  assert.equal(evaluate([{ status: 'A', path: 'src/a.js' }], [{ path: 'src/a.js', text: 'list.skip(2)' }]).ok, true);
  assert.equal(evaluate([{ status: 'A', path: 'tests/a.test.js' }], [{ path: 'tests/a.test.js', text: "test('x', { skip: false }, f)" }]).ok, true);
});

test('governance paths are reported, product paths are not', () => {
  const r = evaluate([
    { status: 'M', path: 'AGENTS.md' },
    { status: 'A', path: '.github/agents/new.agent.md' },
    { status: 'A', path: 'products/x/README.md' },
  ]);
  assert.deepEqual(r.governance, ['AGENTS.md', '.github/agents/new.agent.md']);
  assert.deepEqual(evaluate([{ status: 'A', path: 'products/x/a.js' }]).governance, []);
});

test('git output parsers', () => {
  assert.deepEqual(parseNameStatus('M\tsrc/a.js\nR087\ttests/a.test.js\ttests/b.test.js\n'), [
    { status: 'M', path: 'src/a.js' },
    { status: 'R', oldPath: 'tests/a.test.js', path: 'tests/b.test.js' },
  ]);
  const diff = '+++ b/tests/a.test.js\n@@ -0,0 +1 @@\n+test.skip(1)\n+++ /dev/null\n+ignored';
  assert.deepEqual(parseAddedLines(diff), [{ path: 'tests/a.test.js', text: 'test.skip(1)' }]);
});

test('test file detection', () => {
  for (const p of ['tests/a.js', 'products/x/test/a.js', 'src/a.test.js', 'src/a.test.mjs', 'src/__tests__/a.js', 'src/a.spec.ts']) assert.ok(isTestFile(p), p);
  for (const p of ['src/a.js', 'docs/testing.md', 'contest/a.js']) assert.ok(!isTestFile(p), p);
});
