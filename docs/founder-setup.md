# Founder setup — decisions and one-time authorizations

Everything here needs the founder's own authority. Each item is delivered as
a tested terminal package (`docs/founder-actions/`), never as website steps
when a CLI or API path exists (D-018).

## Decided

| Decision | Record | How it is carried out | Status |
|---|---|---|---|
| `tiro` is private; no open-source license | D-015 | Package `002` (after `001`) | Pending founder run |
| Copilot workflow runs keep GitHub's approval boundary | D-016 | Nothing to change: it is already on. Operations releases held runs only when `pr-policy` reports `execution-sensitive: none` | In force |
| `main` protected by ruleset `main-protection` | D-017 | Package `002` | Pending founder run |
| Outside AI review, bound to the head SHA, gates every merge | D-014 | Operations procedure | In force once PR #4 is merged |
| Governance PR #4 merged by the founder | D-011 | Package `001` | Pending founder run |

Order: `001` (merge PR #4) must succeed before `002`, because `002` checks
that the rules it enforces are already on `main`.

Entitlement: GitHub enforces rulesets on a **private** personal repository
only on GitHub Pro or higher; on GitHub Free they apply to public
repositories only. Package `002` reads the account plan first and stops
before changing anything if the plan cannot protect a private `main` — that
would be a founder decision (upgrade, or private without enforced
protection). Private repositories also use the account's Actions minutes
(Free 2,000 / Pro 3,000 per month) for CI and Copilot agent sessions.

## Optional, not yet decided

- **Copilot spending budget** (github.com/settings/billing → Budgets): caps
  AI-credit spend beyond the plan's included credits. No CLI path is
  documented for personal budgets.
- **Partner agents (Claude, Codex) inside GitHub**: a second model family as
  coder, paid from Copilot credits (public preview).
