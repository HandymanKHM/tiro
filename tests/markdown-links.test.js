import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
      assert.match(output, /docs\/guide\.md:2:/);
      assert.match(output, /\.\/missing\.md/);
      assert.match(output, /docs\/guide\.md:3:/);
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
      assert.match(output, /docs\/headings\.md:4:/);
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
        '[protocol-relative](//example.com/missing)',
      ].join('\n'),
    },
    (dir) => {
      const { status, output } = runChecker(dir);
      assert.equal(status, 0, output);
    },
  );
});

test('supports root-relative markdown links from repository root', () => {
  withMarkdownFixture(
    {
      'docs/target.md': '# Target',
      'docs/start.md': '[target](/docs/target.md)',
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
      assert.match(output, /docs\/encoding\.md:2:/);
      assert.match(output, /\.\/bad%ZZ\.md/);
      assert.match(output, /docs\/encoding\.md:3:/);
      assert.match(output, /#frag%ZZ/);
      assert.doesNotMatch(output, /URIError/i);
    },
  );
});

test('accepts valid local markdown paths with spaces and parentheses', () => {
  withMarkdownFixture(
    {
      'docs/Guide (v2).md': '# Guide v2',
      'docs/index.md': '[guide](./Guide (v2).md)',
    },
    (dir) => {
      const { status, output } = runChecker(dir);
      assert.equal(status, 0, output);
    },
  );
});

test('resolves heading fragments on directory links via README.md', () => {
  withMarkdownFixture(
    {
      'docs/guide/README.md': '# Guide Home\n## Start Here',
      'docs/index.md': [
        '[valid](./guide/#start-here)',
        '[broken](./guide/#missing)',
      ].join('\n'),
    },
    (dir) => {
      const { status, output } = runChecker(dir);
      assert.equal(status, 1, output);
      assert.match(output, /docs\/index\.md:2:/);
      assert.match(output, /\.\/guide\/#missing/);
      assert.doesNotMatch(output, /#start-here/);
    },
  );
});

test('ignores links and headings inside fenced and inline code', () => {
  withMarkdownFixture(
    {
      'docs/code.md': [
        '```md',
        '[example](./missing.md)',
        '# Not a heading',
        '```',
        'Use `[inline](./missing-inline.md)` as an example.',
        '[valid](./code.md#real-heading)',
        '# Real Heading',
      ].join('\n'),
    },
    (dir) => {
      const { status, output } = runChecker(dir);
      assert.equal(status, 0, output);
    },
  );
});

test('checks reference-style links', () => {
  withMarkdownFixture(
    {
      'docs/ref.md': [
        'See [example][ref].',
        '[ref]: ./missing.md',
      ].join('\n'),
    },
    (dir) => {
      const { status, output } = runChecker(dir);
      assert.equal(status, 1, output);
      assert.match(output, /docs\/ref\.md:2:/);
      assert.match(output, /\[ref\]: \.\/missing\.md|\.\/missing\.md/);
    },
  );
});

test('supports duplicate heading suffixes and setext headings', () => {
  withMarkdownFixture(
    {
      'docs/headings.md': [
        'Title',
        '=====',
        '## Example',
        '## Example',
        '[setext](./headings.md#title)',
        '[second](./headings.md#example-1)',
      ].join('\n'),
    },
    (dir) => {
      const { status, output } = runChecker(dir);
      assert.equal(status, 0, output);
    },
  );
});

test('does not resolve links outside repository root and does not auto-append .md', () => {
  withMarkdownFixture(
    {
      'docs/a.md': [
        '[outside](../outside.md)',
        '[no-fallback](./foo)',
      ].join('\n'),
      'outside.md': '# external',
      'docs/foo.md': '# existing markdown file only',
    },
    (dir) => {
      const { status, output } = runChecker(join(dir, 'docs'));
      assert.equal(status, 1, output);
      assert.match(output, /a\.md:1:/);
      assert.match(output, /\.\.\/outside\.md/);
      assert.match(output, /a\.md:2:/);
      assert.match(output, /\.\/foo/);
    },
  );
});

test('skips symlink loops while scanning markdown files', () => {
  withMarkdownFixture(
    {
      'docs/readme.md': '# Readme\n[ok](./readme.md)',
    },
    (dir) => {
      symlinkSync(join(dir, 'docs'), join(dir, 'docs', 'loop'));
      const { status, output } = runChecker(dir);
      assert.equal(status, 0, output);
      assert.doesNotMatch(output, /ELOOP|too many symbolic links/i);
    },
  );
});

test('finds no markdown-link issues when run against the current repository markdown', () => {
  // Criterion 4
  const { status, output } = runChecker(repoRoot);
  assert.equal(status, 0, output);
});
