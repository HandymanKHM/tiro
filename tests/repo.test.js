// Guards the operating system itself: if the team's memory files go missing,
// every future session starts blind, so treat that as a failing build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('operating files exist', () => {
  for (const p of [
    'CLAUDE.md',
    'README.md',
    'docs/decisions.md',
    '.github/pull_request_template.md',
    '.github/ISSUE_TEMPLATE/order.yml',
    '.github/workflows/check.yml',
  ]) {
    assert.ok(existsSync(new URL(p, root)), `missing ${p}`);
  }
});

test('manual keeps its essential sections', () => {
  const manual = read('CLAUDE.md');
  for (const heading of ['## The loop', '## Decisions: yours vs. Tiro\'s', '## Definition of done', '## Lessons learned']) {
    assert.ok(manual.includes(heading), `CLAUDE.md lost section: ${heading}`);
  }
});

test('every product is listed on the dashboard and has a README', () => {
  const dashboard = read('README.md');
  const products = readdirSync(new URL('products/', root), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  assert.ok(products.length > 0);
  for (const name of products) {
    assert.ok(dashboard.includes(`products/${name}/`), `README.md does not list products/${name}/`);
    assert.ok(existsSync(new URL(`products/${name}/README.md`, root)), `products/${name} has no README.md`);
  }
});

test('decision entries have unique ids', () => {
  const ids = [...read('docs/decisions.md').matchAll(/^## (D-\d{3})/gm)].map((m) => m[1]);
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length, 'duplicate decision id');
});
