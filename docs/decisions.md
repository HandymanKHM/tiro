# Decision log

Newest first. Each entry: what was decided, why, and what would change it.
The founder delegated these decisions on 2026-09-25.

## D-012 — Operations manager is a Claude Code role (2026-09-25)
**Decision:** Dispatching orders, chasing fixes and merging under policy is
done by Claude Code sessions following the `operations` skill, acting through
the founder's GitHub connection.
**Why:** Assigning Copilot and posting `@copilot` requests from a GitHub
workflow requires a personal access token; the Copilot cloud agent cannot
merge or approve its own work. A Claude Code operations run does both without
storing any new secret.
**Revisit if:** the founder wants fully in-GitHub automation; then a
fine-grained token and GitHub Agentic Workflows replace this role.

## D-011 — Governance changes are merged by the founder only (2026-09-25)
**Decision:** PRs touching AGENTS.md, CLAUDE.md, `.github/**`, `.claude/**`,
the policy/guard/check scripts or their tests are never merged automatically.
**Why:** Agents must not be able to rewrite their own guardrails; this is the
main structural defence against reward hacking.

## D-010 — Tests are the contract; CI forbids weakening them (2026-09-25)
**Decision:** Tests are written before code by a separate role. `pr-policy`
fails any PR that modifies, deletes or renames an existing test alongside
source changes, or newly skips/focuses a test.
**Why:** Deleting or editing tests to get green is the best-documented
failure of coding agents (METR 2025; ImpossibleBench, arXiv 2510.20270).

## D-009 — Independent reviewer in a fresh context, plus Copilot code review (2026-09-25)
**Decision:** Every change is reviewed by the `reviewer` role, which sees only
the order, plan and diff, verifies each finding, and returns a verdict. Copilot
code review is a second, separately configured gate.
**Why:** Self-review is biased toward the model's own output; a fresh
verifier outperforms self-critique (Anthropic best-practices docs).

## D-008 — One manual for all engines: AGENTS.md (2026-09-25)
**Decision:** AGENTS.md holds the rules; CLAUDE.md imports it;
`.github/copilot-instructions.md` points to it; skills live in
`.github/skills` with `.claude/skills` linking there.
**Why:** Copilot cloud agent, Copilot code review and Claude Code each read
different files (see docs/research). One source avoids drift.

## D-007 — Job Request product withdrawn (2026-09-25)
**Decision:** Removed. D-004 to D-006 are superseded.
**Why:** Founder: keep the founder and the company separate; build the
department first.

## D-003 — Zero dependencies (2026-09-25)
**Decision:** Plain Node.js; tests use the built-in `node --test`.
**Why:** Nothing to install, patch or hallucinate. Revisit per product.

## D-002 — One command is the quality gate (2026-09-25)
**Decision:** `npm run check` runs every test and every product's check; CI
runs the same command.

## D-001 — Fresh start; `main` holds only accepted work (2026-09-25)
**Decision:** Nothing from earlier systems is reused; all work reaches
`main` through pull requests.
