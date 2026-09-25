import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const checkerScript = join(repoRoot, 'scripts', 'markdown-links.mjs');

const runChecker = (targetPath) => {
  const r = spawnSync(process.execPath, [checkerScript, targetPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
};

const withMarkdownFixture = (files, run) => {
  const dir = mkdtempSync(join(tmpdir(), 'tiro-md-links-'));
  try {
    for (const [relPath, content] of Object.entries(files)) {
      const full = join(dir, relPath);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, content);
    }
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('reports broken internal markdown file and folder links with file, line, and raw link', () => {
  // Criterion 1
  withMarkdownFixture(
    {
      'docs/guide.md': [
        '# Guide',
        '[missing-file](./missing.md)',
        '[missing-folder](./missing-folder/)',
      ].join('\n'),
    },
    (dir) => {
      const { status, output } = runChecker(dir);
      assert.equal(status, 1, output);
      assert.match(output, /guide\.md/i);
      assert.match(output, /2/);
      assert.match(output, /\.\/missing\.md/);
      assert.match(output, /3/);
      assert.match(output, /\.\/missing-folder\//);
    },
  );
});

test('reports broken heading fragments while allowing valid fragments in the same file', () => {
  // Criterion 2
  withMarkdownFixture(
    {
      'docs/headings.md': [
        '# Heading Index',
        '## Existing Section',
        '[valid](./headings.md#existing-section)',
        '[broken](./headings.md#missing-section)',
      ].join('\n'),
    },
    (dir) => {
      const { status, output } = runChecker(dir);
      assert.equal(status, 1, output);
      assert.match(output, /headings\.md/i);
      assert.match(output, /4/);
      assert.match(output, /#missing-section/);
      assert.doesNotMatch(output, /#existing-section/);
    },
  );
});

test('ignores website links using http and https schemes', () => {
  // Criterion 3
  withMarkdownFixture(
    {
      'docs/sites.md': [
        '# Links',
        '[http-link](http://example.com/missing)',
        '[https-link](https://example.com/missing#frag)',
      ].join('\n'),
    },
    (dir) => {
      const { status, output } = runChecker(dir);
      assert.equal(status, 0, output);
    },
  );
});

test('reports invalid URL encoding as a broken link instead of crashing', () => {
  withMarkdownFixture(
    {
      'docs/encoding.md': [
        '# Encoding',
        '[bad-path](./bad%ZZ.md)',
        '[bad-fragment](./encoding.md#frag%ZZ)',
      ].join('\n'),
    },
    (dir) => {
      const { status, output } = runChecker(dir);
      assert.equal(status, 1, output);
      assert.match(output, /encoding\.md/i);
      assert.match(output, /2/);
      assert.match(output, /\.\/bad%ZZ\.md/);
      assert.match(output, /3/);
      assert.match(output, /#frag%ZZ/);
      assert.doesNotMatch(output, /URIError/i);
    },
  );
});

test('finds no markdown-link issues when run against the current repository markdown', () => {
  // Criterion 4
  const { status, output } = runChecker(repoRoot);
  assert.equal(status, 0, output);
});
