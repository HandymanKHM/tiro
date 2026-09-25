#!/usr/bin/env bash
# Hook entry point. Delegates to agent-guard.mjs. If Node.js is unavailable the
# guard allows the call rather than blocking every tool (a failing preToolUse
# hook denies all tool calls in Copilot cloud agent); CI remains the backstop.
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if command -v node >/dev/null 2>&1; then
  exec node "$dir/agent-guard.mjs"
fi
cat >/dev/null
exit 0
