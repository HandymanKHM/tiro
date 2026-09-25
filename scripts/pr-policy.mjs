// PR policy enforced in CI and runnable locally: `node scripts/pr-policy.mjs <base-ref>`.
// - Test integrity: existing tests may not be modified, deleted or renamed in a
//   change that also touches non-test files, and no test may be newly skipped
//   or focused (.skip / .only / todo). Violations fail the check.
// - Governance: changes to the department's own rules are reported so that
//   operations never merges them automatically; they do not fail the check.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const GOVERNANCE = [
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
  /^\.github\//,
  /^\.claude\//,
  /^scripts\/(pr-policy|agent-guard|check)\./,
  /^tests\/(policy|guard|repo)\.test\.js$/,
  /^package\.json$/,
];

export const isTestFile = (p) => /(^|\/)tests?\//.test(p) || /\.test\.[cm]?[jt]sx?$/.test(p);
const DISABLED_TEST = /\b(?:describe|it|test|suite)\.(?:skip|only|todo)\b|\{\s*(?:skip|only|todo)\s*:\s*(?!false\b)\S/;

// changes: [{ status: 'A'|'M'|'D'|'R', path, oldPath? }]
// addedLines: [{ path, text }] — lines added in the diff
export function evaluate(changes, addedLines = []) {
  const violations = [];
  const touchesNonTest = changes.some((c) => !isTestFile(c.path));
  const alteredTests = changes.filter((c) => c.status !== 'A' && isTestFile(c.oldPath ?? c.path));

  if (touchesNonTest && alteredTests.length > 0) {
    for (const c of alteredTests) {
      violations.push(`existing test ${c.status === 'D' ? 'deleted' : c.status === 'R' ? 'renamed' : 'modified'} alongside non-test changes: ${c.oldPath ?? c.path}`);
    }
  }
  for (const l of addedLines) {
    if (isTestFile(l.path) && DISABLED_TEST.test(l.text)) {
      violations.push(`test skipped or focused in ${l.path}: ${l.text.trim()}`);
    }
  }
  const governance = [...new Set(changes.flatMap((c) => [c.path, c.oldPath]).filter((p) => p && GOVERNANCE.some((r) => r.test(p))))];
  const testsChanged = alteredTests.map((c) => c.oldPath ?? c.path);
  return { ok: violations.length === 0, violations, governance, testsChanged };
}

export function parseNameStatus(text) {
  return text.split('\n').filter(Boolean).map((line) => {
    const [status, a, b] = line.split('\t');
    const s = status[0];
    return s === 'R' || s === 'C' ? { status: s === 'R' ? 'R' : 'A', oldPath: a, path: b } : { status: s, path: a };
  });
}

export function parseAddedLines(diff) {
  const out = [];
  let file = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) file = line.startsWith('+++ b/') ? line.slice(6) : null;
    else if (file && line.startsWith('+') && !line.startsWith('+++')) out.push({ path: file, text: line.slice(1) });
  }
  return out;
}

function main() {
  const base = process.argv[2] ?? 'origin/main';
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const range = `${base}...HEAD`;
  const result = evaluate(parseNameStatus(git('diff', '--name-status', '-M', range)), parseAddedLines(git('diff', '-U0', range)));

  const report = [
    `## PR policy against ${base}`,
    `test integrity: ${result.ok ? 'pass' : 'FAIL'}`,
    ...result.violations.map((v) => `- ${v}`),
    `governance: ${result.governance.length ? result.governance.join(', ') : 'none'}`,
    result.governance.length ? '(governance changes are merged by the founder only)' : '',
  ].filter(Boolean).join('\n');
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
