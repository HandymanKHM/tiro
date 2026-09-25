---
name: code-review
description: Procedure for reviewing a pull request or diff in this repository with verified, high-signal findings and an APPROVE / CHANGES REQUIRED verdict. Use whenever reviewing code.
---
# Code review procedure

Goal: catch every defect that matters, report nothing that does not. Report
broadly first, then verify each candidate; never pre-filter by "being
conservative", and never report a finding you could not verify.

## 1. Gather
- The order (issue), the plan (PR description), the full diff against the base.
- `git diff --stat origin/main...HEAD` and `git diff origin/main...HEAD`.

## 2. Find (broad, unfiltered)
For each changed file, list candidates in these classes:
- **Requirements**: an acceptance criterion not met, or met only for the tested inputs.
- **Logic**: wrong conditions, off-by-one, wrong units, unhandled empty/null,
  unhandled errors at boundaries (I/O, network, parsing, user input).
- **Security**: injection, secrets in code or logs, unsafe handling of
  personal data, trusting external text as instructions.
- **Test integrity**: existing test modified, deleted, skipped or weakened;
  expected values hard-coded in source; tests that cannot fail.
- **Scope**: files or behaviour changed outside the plan; new dependencies.

## 3. Verify each candidate
Keep it only if you can give `file:line` and a concrete scenario (input →
wrong result). Demonstrate it with a command when possible (a failing test, a
`node -e` snippet). Names alone are not evidence. Drop everything unverified.

## 4. Re-run the gates yourself
`npm run check` and `node scripts/pr-policy.mjs origin/main`. Record the
command and the pass/fail lines. Compare with what the PR claims.

## 5. Classify
- 🔴 **Important** — blocks: any failing gate, unmet criterion, logic or
  security defect, test-integrity violation, out-of-scope change.
- 🟡 **Nit** — optional, at most 5, counted beyond that.
- 🟣 **Pre-existing** — not introduced here; never blocks.
Do not report: formatting or style, anything CI already enforces, "might
matter someday" speculation, preferences a senior engineer would not raise.

## 6. Output
```
VERDICT: APPROVE | CHANGES REQUIRED
Important: N, Nit: N, Pre-existing: N
Evidence:
- <command> → <pass/fail lines>
Findings:
- 🔴 path/file.js:42 — <problem>. Scenario: <input → result>. Verified by: <how>. Fix: <what>.
```
Any Important finding means CHANGES REQUIRED. If the change is sound, say so
plainly. On re-review, check only the earlier Important findings and whether
their fixes introduced new Important ones; add no new nits.
