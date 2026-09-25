# Tiro — AI development department

A standing team of AI agents that takes an outcome from the founder and
returns a working, independently reviewed, evidence-backed result.

## Give an order

**Issues → New issue → Order.** Two required questions: what you want, and
how you'll know it's done. The department plans it, writes the tests first,
builds it, reviews it independently, and opens a pull request. You get a
plain-language "what you can now do" with proof.

## The team

| Role | Job | Can change files? |
|---|---|---|
| Lead | Runs each order end to end, delegates, assembles the evidence | Yes |
| Planner | Turns the order into checkable acceptance criteria and scope | No |
| Tester | Writes the tests that define "done" before any code exists | Tests only (by rule) |
| Coder | Smallest change that makes those tests pass | Yes, within scope |
| Reviewer | Independent verdict with verified findings; never saw the coder's reasoning | No |
| Researcher | Sourced research; every claim has a link or is marked unverified | Reports only |
| Operations | Dispatches orders, chases fixes, merges under policy, reports to you | Merges only |

Plus two automatic gates no agent can talk its way past: the **check** (every
test, every product) and the **PR policy** (no weakening existing tests).

## What reaches you

Only: delivered results, and decisions that are genuinely yours (money,
publishing, real people's data, irreversible steps, changes to the
department's own rules). Issues needing you carry the label `needs-founder`.

## Where things live

- `AGENTS.md` — the department's operating manual and shared memory.
- `docs/decisions.md` — every decision made on your behalf, with the reason.
- `docs/research/` — what the department has verified about the world.
- `docs/founder-setup.md` — the few switches only your account can flip.
- `products/` — what the department builds for you (none yet).
