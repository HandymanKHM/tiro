---
name: founder-action-package
description: Standard for any action that genuinely needs the founder's own authority (merging a governance PR, changing repository settings or visibility, rulesets, billing) and cannot be done with the department's authorized tools. Produces one tested copy-paste terminal block. Use whenever you would otherwise give the founder instructions to click through a website.
---
# Founder action package

The founder authorizes decisions; he does not implement technical designs.
A package is a procurement-grade specification: a wrong command, schema,
repository, rule name, check name or setting is a failed engineering
delivery, not founder error. Never repair a package after he runs it and
call the failure his.

## Requirements (all mandatory)
1. **Form**: one bash block for his authenticated Ubuntu terminal, using only
   `gh` (≥ 2.40) and its built-in `--jq`, with `gh api` REST calls rather
   than newer convenience flags. Website steps only if no CLI/API path
   exists, and then say why.
2. **No placeholders**: exact owner, repository, branch, PR number, SHAs,
   check names and JSON bodies are written in.
3. **Preflight before any mutation**, each failing with a clear `FAIL:` line:
   `gh auth status`; authenticated login is `HandymanKHM`; the repository
   exists with the expected identity; the founder has the permission the
   action needs; every assumption the action depends on (state, SHA, plan,
   existing configuration) matches what was reviewed.
4. **Scope**: performs only the approved action. No bypass, no admin
   override, no force.
5. **Idempotent**: if the desired end state already exists, it verifies and
   reports PASS without mutating.
6. **Read-back**: after mutating, reads GitHub back and compares every
   property that was meant to change.
7. **Verdict**: ends with exactly one of `RESULT: PASS — …` or
   `RESULT: FAIL — …` (and a non-zero exit on FAIL). On FAIL, say whether
   anything was changed.
8. **Tested**: before delivery, run `bash -n` on it, and run every read-only
   call against the live repository from the session. State in the delivery
   which parts were exercised and which could not be (mutations).
9. **Record**: store the exact block in `docs/founder-actions/` with its date
   and purpose, and state dependencies between packages in one sentence.
