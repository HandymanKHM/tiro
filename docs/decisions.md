# Decision log

Newest first. Each entry: what was decided, why, and what would change it.
Tiro delegated all of these on 2026-09-25 ("you make all the good decisions").

## D-006 — First product: Job Request page (2026-09-25)
**Decision:** Prove the loop end-to-end with one small, genuinely useful
product for a handyman business: a mobile page where a customer fills in a job
request, which opens WhatsApp with a complete, well-formatted message to the
business.
**Why:** Incomplete job details cost call-backs. This needs no server, no
database, no stored customer data and no monthly cost, so it is safe to build
without CEO-only decisions.
**Revisit if:** Tiro wants requests stored, tracked or assigned — that needs a
backend and a customer-data decision.

## D-005 — WhatsApp number left empty until Tiro supplies it (2026-09-25)
**Decision:** `config.js` ships with an empty number. The page runs in a
clearly labelled preview mode (shows the message instead of sending it).
**Why:** Guessing a phone number would route customers to a stranger.

## D-004 — No hosting yet (2026-09-25)
**Decision:** The page is a static file; no public hosting set up.
**Why:** Publishing is a CEO decision. Once approved, GitHub Pages or any
static host works with zero changes.

## D-003 — Zero dependencies (2026-09-25)
**Decision:** Plain HTML/CSS/JS; tests use Node's built-in `node --test`.
**Why:** Nothing to install, nothing to break, nothing to patch. Cheapest
possible maintenance for a team with no memory.

## D-002 — One command is the quality gate (2026-09-25)
**Decision:** `npm run check` runs every test; CI runs the same command on
every push and pull request.
**Why:** Tiro doesn't read code, so a machine must refuse broken work.
Same command locally and in CI means no "works on my machine".

## D-001 — Fresh start; `main` is the accepted record (2026-09-25)
**Decision:** Nothing from earlier systems is reused. `main` holds only work
Tiro has accepted; all work arrives via pull requests.
**Why:** Tiro's instruction: start clean in this repo. Pull requests give him
one place to see, try and accept each piece of work.
