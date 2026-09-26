# Decision log

Newest first. Each entry: what was decided, why, and what would change it.
The founder delegated these decisions on 2026-09-25.

## D-019 — Merge commits, not squash, for reviewed work (2026-09-26)
**Decision:** Pull requests are merged with a merge commit, so the exact
commit that the outside review approved becomes part of `main`'s history
and can be proven there (`compare/<SHA>...main` is `ahead` or `identical`).
**Why:** A squash merge creates a new commit; the reviewed SHA would never
reach `main`, so "the reviewed commit is what shipped" could only be shown
indirectly. Found by the outside review of PR #4.

## D-018 — Founder action packages instead of website instructions (2026-09-26)
**Decision:** Every action that needs the founder's own authority and cannot
be done with the department's tools is delivered as one tested terminal
block (skill `founder-action-package`): preflight, exact scope, read-back,
`RESULT: PASS|FAIL`. A wrong package is the department's failure.
**Why:** Founder instruction: he authorizes decisions; he does not implement
technical designs.

## D-017 — `main` is protected by a repository ruleset (2026-09-26)
**Decision:** Ruleset `main-protection` on the default branch, enforcement
active, no bypass actors: changes only through pull requests with 0 required
human approvals; required status checks `check` and `pr-policy` (GitHub
Actions) on the head commit; force pushes and branch deletion blocked.
Branches are not required to be up to date before merging.
**Why:** Founder instruction. A required human approval would make every
agent job wait for him; the mandatory SHA-bound outside AI review (D-014)
is the review gate. "Up to date" is not required because updating an agent
branch creates a new head commit, which voids the outside review and would
loop; the policy check already runs on the exact head commit.
**Revisit if:** merges start landing on a stale base and breaking `main`.

## D-016 — Keep GitHub's approval for Copilot workflow runs (2026-09-26)
**Decision:** "Require approval for workflow runs" for Copilot stays on.
Operations releases a held run by re-running it under the founder's
authority only when the trusted `pr-policy` on `main` reports
`execution-sensitive: none`; otherwise `needs-founder`. Supersedes the
earlier founder-setup item that recommended turning approval off.
**Why:** Founder decision. GitHub warns that without approval, unreviewed
agent code can gain write access or read Actions secrets. The live test
(#3) proved operations can release held runs safely.
**Revisit if:** the founder chooses to remove the boundary as a separate
security decision.

## D-015 — `tiro` becomes private (2026-09-26)
**Decision:** The repository is proprietary infrastructure and will be
private. No open-source license is added; licensing is a separate future
founder decision. The visibility change happens after the governance PR #4
is merged, through a founder action package.
**Why:** Founder decision. Free public Actions minutes are not a reason to
expose proprietary infrastructure. Supersedes the earlier recommendation to
keep the repository public.

## D-014 — Outside review is mandatory before merge (2026-09-26)
**Decision:** No PR merges on the builder's own review verdict. Operations
runs a fresh reviewer on a different model against the latest commit, and
only its APPROVE counts.
**Why:** Live order #2: Copilot's in-session reviewer approved code with 3
Important defects; the outside reviewer found them and later a regression
introduced by a fix. Evidence: HandymanKHM/tiro#3.
**Revisit if:** the builder's in-session review matches the outside verdict
across several consecutive orders.

## D-013 — Founding PR merged by Claude under the founder's delegation (2026-09-25)
**Decision:** The PR that creates the department is merged by the building
Claude session after an independent APPROVE and green CI, although D-011 makes
governance changes founder-merge only.
**Why:** D-011 cannot apply before the department exists, and the founder
explicitly delegated this ("going forward, I don't see you needing my
intervention"). From this merge on, D-011 applies without exception.

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
*Amended by D-014: the verdict that counts for merge is the outside review.*
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
