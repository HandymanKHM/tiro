# Tiro HQ

This repository is where Tiro's ideas become working products. Tiro gives the
order; the AI development team builds, tests and delivers; Tiro accepts by
using the result. No code reading required.

## How to give an order

1. Go to **Issues → New issue → Order**.
2. Fill in two things: **what you want** and **how you'll know it's done**.
3. Start a Claude Code session on this repo and say: *"Work on order #N."*

## What you get back

A **pull request** (a "finished work, please sign off" package) with:
- **Try it** — exactly how to see it working yourself.
- **Proof** — the automatic checks that passed.
- **Decisions made for you** — so nothing happens behind your back.

You press **Merge** to accept, or comment to redirect.

## Your four jobs

| You decide | Everything else |
|---|---|
| What outcome you want and what "done" means | The team decides and writes |
| What comes first | down why in `docs/decisions.md` |
| Accept or reject by trying it | |
| Money, publishing, customer data, anything irreversible | |

## Products

| Product | What it does | Status |
|---|---|---|
| [Job Request](products/job-request/) | A customer describes a job on their phone; it arrives in your WhatsApp as a neat, complete message. | Built and tested. Needs your WhatsApp number in `products/job-request/config.js` to go live. |

## Quality gate

Every change runs `npm run check` automatically. Broken work can't pass.
