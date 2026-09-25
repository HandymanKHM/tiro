# Founder setup — one-time switches only your account can flip

These are repository and account settings. No agent can change them, by
design. Each takes under a minute. Done once, they never need repeating.

| # | Setting | Where | Why | Status |
|---|---|---|---|---|
| 1 | Copilot cloud agent enabled for `tiro` | github.com/settings/copilot/coding_agent → Repository access | Lets the department's agents work in this repository | Check |
| 2 | Partner agents: Claude on | Same page → Partner agents | A second model family available as coder or reviewer, paid from your Copilot credits (public preview) | Optional |
| 3 | Turn off "Require approval for workflow runs" for the cloud agent | tiro → Settings → Copilot → Cloud agent → Actions workflow approval | Otherwise every agent pull request waits for you to click "Approve and run workflows" before the checks run | Needed |
| 4 | Ruleset on `main`: require status checks `check` and `pr-policy`; block force pushes; automatically request Copilot code review, including new pushes | tiro → Settings → Rules → Rulesets → New branch ruleset | Makes the gates binding: nothing broken reaches `main` | Needed |
| 5 | Allow auto-merge | tiro → Settings → General → Pull Requests | Lets operations queue a merge that completes only when every gate is green | Recommended |
| 6 | Copilot spending budget | github.com/settings/billing → Budgets | Caps AI-credit spend beyond your plan's included credits | Recommended |
| 7 | Secret scanning and push protection on | tiro → Settings → Advanced Security | GitHub blocks pushes that contain passwords or keys | Recommended |

## Decision for you: public or private repository

`tiro` is currently **public**. Trade-off, verified in `docs/research/`:

- **Public (current):** GitHub Actions minutes on standard runners are free;
  anyone can read the department's rules. Only people with write access can
  trigger agents, so strangers cannot command it. GitHub's native Copilot
  *Automations* (event and schedule triggers) are not available.
- **Private:** your work is confidential and Automations become available;
  Actions minutes count against your plan's monthly allowance.

Recommendation: keep `tiro` (the department itself) public for now, and create
each business product in its own **private** repository when it involves
customers, insurers or money.
