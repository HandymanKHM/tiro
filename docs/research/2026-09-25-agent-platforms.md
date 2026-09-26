# Agent platforms and safeguards for the department

Read: 2026-09-25. Sources are GitHub docs (source commit `dec1018` of
`github/docs`), github.blog changelogs, Anthropic documentation and the
papers cited. Features marked *preview* may change.

## Question
How should a repository be configured so AI agents can take orders and deliver
reviewed, trustworthy work with minimal founder involvement, using GitHub
Copilot Pro+ and Claude Pro?

## Answer (short)
Use the Copilot cloud agent with repository custom agents as the builders;
one shared manual (AGENTS.md); skills for procedures; a guard hook; CI gates
that enforce test integrity; Copilot code review as an extra gate; and a Claude
Code operations role to dispatch, chase and merge. Structural checks, not
prompts, are what keep agents honest.

## Findings — GitHub Copilot

- **Name**: "Copilot cloud agent (formerly Copilot coding agent)", renamed
  2026-04-01. https://github.blog/changelog/2026-04-01-research-plan-and-code-with-copilot-cloud-agent/
- **Billing**: usage-based AI credits since 2026-06-01 (1 credit = $0.01); a
  cloud agent session consumes Actions minutes plus AI credits.
  https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing
- **Instruction files**: cloud agent reads `.github/copilot-instructions.md`,
  `.github/instructions/**/*.instructions.md`, `AGENTS.md` (nearest wins) and a
  root `CLAUDE.md`. Code review reads copilot-instructions, path instructions
  and root `AGENTS.md`, but not `CLAUDE.md`. Path files take `applyTo` and
  optional `excludeAgent: "code-review" | "cloud-agent"`.
  https://docs.github.com/en/copilot/reference/custom-instructions-support
- **Custom agents**: `.github/agents/NAME.agent.md`; `description` required;
  `tools` aliases `read, edit, search, execute, agent` and `server/*`; unknown
  tool names are silently ignored; prompt body ≤ 30,000 characters; must be on
  the default branch to be selectable.
  https://docs.github.com/en/copilot/reference/custom-agents-configuration
- **Skills**: `.github/skills/<name>/SKILL.md` (also `.claude/skills`,
  `.agents/skills`); `name` and `description` required; loaded when the task
  matches the description; used by cloud agent and code review.
  https://docs.github.com/en/copilot/concepts/agents/about-agent-skills
- **Setup steps**: `.github/workflows/copilot-setup-steps.yml`, one job named
  exactly `copilot-setup-steps`, effective only on the default branch,
  `timeout-minutes` ≤ 59; a failed step does not stop the session.
  https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment
- **Hooks**: `.github/hooks/*.json` on the default branch, `{"version":1,...}`.
  `preToolUse` input has `toolName` and `toolArgs`; output
  `{"permissionDecision":"deny"}`; a hook that crashes or exits non-zero
  denies the tool call; a timeout allows it.
  https://docs.github.com/en/copilot/reference/hooks-reference
- **Triggers**: assign an issue to Copilot (custom agent selectable), `@copilot`
  in PR comments from users with write access, agent tasks API (user tokens
  only), `gh agent-task`. Copilot reads only issue comments that exist at
  assignment time.
  https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-via-the-api
- **Automations** (native schedule/event triggers): private and internal
  repositories only; stored outside git; private to their creator.
  https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-automations
- **CI on agent PRs**: workflows wait for "Approve and run workflows" unless
  the repo setting "Require approval for workflow runs" is turned off.
  https://github.blog/changelog/2026-03-13-optionally-skip-approval-for-copilot-coding-agent-actions-workflows/
- **Guardrails**: the agent pushes only to its own branch, cannot mark its PR
  ready, approve or merge; the requester cannot approve the agent's PR.
  https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations
- **Code review**: automatic via branch ruleset ("Automatically request
  Copilot code review", "Review new pushes"); Copilot approvals counting
  toward merge requirements are opt-in, *preview*.
  https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review
- **Third-party agents** (Claude, Codex) inside GitHub: *preview*, all paid
  Copilot plans, billed to Copilot credits, no Anthropic key needed.
  https://docs.github.com/en/copilot/concepts/agents/about-third-party-coding-agents
- **GitHub Agentic Workflows** (`gh aw`): *preview*; the `copilot` engine
  needs a `COPILOT_GITHUB_TOKEN` personal token; the `claude` engine needs an
  Anthropic API key (subscription tokens not supported).
  https://github.github.com/gh-aw/reference/engines/

## Findings — how agents fail, and structural mitigations

| Failure | Evidence | Mitigation adopted here |
|---|---|---|
| Claims "done"/"tests pass" falsely | https://code.claude.com/docs/en/best-practices ; arXiv 2503.15223 | CI is the only source of truth; evidence required in PR template; reviewer re-runs gates |
| Edits/deletes tests to pass | https://metr.org/blog/2025-06-05-recent-reward-hacking/ ; arXiv 2510.20270 | Tests written first by another role; `pr-policy` fails on altered tests |
| Hallucinated packages/APIs | arXiv 2406.10279 | Zero dependencies by default; new dependency requires a decision entry |
| Scope creep | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices | Plan declares in/out of scope; reviewer blocks out-of-scope changes |
| Reviewer bias toward own work | arXiv 2404.13076 | Reviewer in fresh context, never sees author reasoning |
| Noisy reviews | arXiv 2412.18531 ; https://code.claude.com/docs/en/code-review | Find broadly, verify each finding, severity tiers, nit cap |
| Prompt injection via issues | https://invariantlabs.ai/blog/mcp-github-vulnerability | Only write-access users trigger agents; text from others is data |
| Secret leakage | arXiv 2309.07639 | Guard hook trips on secret files; GitHub secret scanning and push protection (founder setup #7) |

## Findings — private repository and `main` protection (read 2026-09-26)

- Rulesets: "available in public repositories with GitHub Free … and in
  public and private repositories with GitHub Pro, GitHub Team, and GitHub
  Enterprise Cloud."
  https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- Create ruleset API `POST /repos/{owner}/{repo}/rulesets`: required `name`,
  `enforcement`; `pull_request` requires `dismiss_stale_reviews_on_push`,
  `require_code_owner_review`, `require_last_push_approval`,
  `required_approving_review_count`, `required_review_thread_resolution`;
  `required_status_checks` requires `required_status_checks` and
  `strict_required_status_checks_policy`. The department's body was
  validated against GitHub's OpenAPI description (`github/rest-api-description`).
  https://docs.github.com/rest/repos/rules#create-a-repository-ruleset
- `GET /repos/{owner}/{repo}/rules/branches/{branch}` "Returns all active
  rules that apply to the specified branch".
  https://docs.github.com/rest/repos/rules#get-rules-for-a-branch
- GitHub Actions app id is 15368 (`https://api.github.com/apps/github-actions`;
  also the `app_id` of this repository's `check` and `pr-policy` runs).
- `GET /user` returns the plan only to tokens with `read:user` or `user`
  scope (GitHub OpenAPI description of "Get the authenticated user").
- Copilot cloud agent: "available in all repositories stored on GitHub,
  except repositories owned by managed user accounts…"; it "uses GitHub
  Actions minutes and AI credits"; private-repo minutes are charged to the
  owner (Free 2,000, Pro 3,000 per month).
  https://docs.github.com/copilot/concepts/agents/cloud-agent/about-cloud-agent ;
  https://docs.github.com/billing/concepts/product-billing/github-actions
- Workflow approval: "Allowing GitHub Actions workflows to run without
  approval may allow unreviewed code written by Copilot to gain write access
  to your repository or access your GitHub Actions secrets."
  https://docs.github.com/copilot/how-tos/use-copilot-agents/cloud-agent/configuring-agent-settings
- Claude Code on the web: "Any public repository, and private repositories
  that the Claude GitHub App is installed on." https://code.claude.com/docs/en/claude-code-on-the-web
- Visibility change: stars and watchers are erased; public forks are
  detached and stay public.
  https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility
- UNVERIFIED: exact behaviour of an active ruleset when a Free repository
  becomes private (community reports: "won't be enforced … until you
  upgrade"); package `002` avoids the question by checking the plan first
  and by reading back the rules actually enforced on `main`.

## Recommendation
Adopted as decisions D-008 to D-012 in `docs/decisions.md`.

## UNVERIFIED items
- Whether custom agent `model` is honoured by cloud agent on github.com.
- Whether Copilot acts on `@copilot` comments posted by a bot identity.
- Whether Agent HQ's Claude agent reads `.github/agents/*` files.
- Whether Copilot approvals settings exist for personal-account repositories.
