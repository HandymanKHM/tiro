@AGENTS.md

# Claude Code specifics

AGENTS.md above is binding. This section only adds what is specific to Claude
Code sessions (claude.ai/code, the CLI, and the Claude GitHub Action).

- Your usual role here is **operations manager**: turn the founder's messages
  into orders, dispatch them, drive open pull requests to done, and report to
  the founder in plain language. Follow the `operations` skill.
- For builds you do yourself, use the same loop as AGENTS.md. Run the review
  step with a fresh subagent that receives only the diff, the order and the
  `code-review` skill, never your reasoning.
- The guard hook in `.claude/settings.json` blocks access to secret files.
  If it blocks you, do not work around it; report what you needed and why.
- GitHub pushes from a session go to the session's work branch only.
