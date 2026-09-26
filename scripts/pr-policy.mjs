// PR policy enforced in CI and runnable locally:
//   node scripts/pr-policy.mjs <base-ref> [<head-ref>]   (head defaults to HEAD)
// - Test integrity: existing tests may not be modified, deleted or renamed in a
//   change that also touches non-test files, and no test may be newly skipped
//   or focused (.skip / .only / todo). Violations fail the check.
// - Governance: changes to the department's own rules are reported so that
//   operations never merges them automatically; they do not fail the check.
// - Execution-sensitive: changes to workflow definitions, actions, or agent
//   execution controls are reported so that operations never releases held
//   workflow runs for them (founder decision); they do not fail the check.
//   Operations evaluates this with the trusted copy of this script on main,
//   passing the PR's head ref, before any held workflow run is released.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const GOVERNANCE = [
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
  /^\.github\//,
  /^\.claude\//,
  /^scripts\/(pr-policy|agent-guard|check)\./,
  /^tests\/(policy|guard|repo)[\w-]*\.test\.js$/,
  /^package\.json$/,
  /^docs\/founder-actions\//,
];

export const EXECUTION_SENSITIVE = [
  /^\.github\/workflows\//,
  /^\.github\/actions\//,
  /(^|\/)action\.ya?ml$/,
  /^\.github\/hooks\//,
  /^\.claude\/settings(\.local)?\.json$/,
  /^\.github\/dependabot\.ya?ml$/,
];

export const isTestFile = (p) => /(^|\/)(tests?|__tests__)\//.test(p) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(p);
// Matches statements, not text inside strings: a line that starts with a skip,
// only or todo call, or a test call passing { skip | only | todo: <truthy> }.
const DISABLED_TEST = [
  /^\s*(?:await\s+)?(?:describe|it|test|suite)\.(?:skip|only|todo)\s*\(/,
  /^\s*(?:await\s+)?t\.(?:skip|todo)\s*\(/,
  /^\s*(?:await\s+)?(?:describe|it|test|suite)\s*\(.*\{\s*(?:skip|only|todo)\s*:\s*(?!false\b)\S/,
  /^\s*\{?\s*(?:skip|only)\s*:\s*true\b/,
];

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
    if (isTestFile(l.path) && DISABLED_TEST.some((r) => r.test(l.text))) {
      violations.push(`test skipped or focused in ${l.path}: ${l.text.trim()}`);
    }
  }
  const testsChanged = alteredTests.map((c) => c.oldPath ?? c.path);
  // Changing an existing test is founder-only even in a tests-only PR, so a
  // test cannot be weakened in one PR and exploited in the next.
  const governance = [...new Set([
    ...changes.flatMap((c) => [c.path, c.oldPath]).filter((p) => p && GOVERNANCE.some((r) => r.test(p))),
    ...testsChanged,
  ])];
  const executionSensitive = [...new Set(changes.flatMap((c) => [c.path, c.oldPath]).filter((p) => p && EXECUTION_SENSITIVE.some((r) => r.test(p))))];
  return { ok: violations.length === 0, violations, governance, testsChanged, executionSensitive };
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
  const head = process.argv[3] ?? 'HEAD';
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const range = `${base}...${head}`;
  const result = evaluate(parseNameStatus(git('diff', '--name-status', '-M', range)), parseAddedLines(git('diff', '-U0', range)));

  const report = [
    `## PR policy: ${base}...${head}`,
    `test integrity: ${result.ok ? 'pass' : 'FAIL'}`,
    ...result.violations.map((v) => `- ${v}`),
    `tests changed: ${result.testsChanged.length ? result.testsChanged.join(', ') : 'none'}`,
    `governance: ${result.governance.length ? result.governance.join(', ') : 'none'}`,
    result.governance.length ? '(governance changes are merged by the founder only)' : '',
    `execution-sensitive: ${result.executionSensitive.length ? result.executionSensitive.join(', ') : 'none'}`,
    result.executionSensitive.length ? '(held workflow runs are not released by operations; needs-founder)' : '',
  ].filter(Boolean).join('\n');
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
