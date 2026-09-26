PKG="$(mktemp)" && cat > "$PKG" <<'FOUNDER_PACKAGE_002'
# Founder action package 002 — make HandymanKHM/tiro private and protect main
# Scope: (1) create or update the repository ruleset "main-protection" on
# refs/heads/main exactly as decided in D-017, then (2) set visibility to
# private (D-015), then (3) read GitHub back and prove both states.
# Depends on package 001: PR #4 must already be merged.
set -uo pipefail
REPO="HandymanKHM/tiro"
RULESET_NAME="main-protection"
CHANGED="nothing was changed"
fail() { echo "FAIL: $1"; echo "RESULT: FAIL — $1 ($CHANGED)"; exit 1; }
ok()   { echo "ok:   $1"; }

EXPECTED='active|branch|refs/heads/main||0|deletion,non_fast_forward,pull_request,required_status_checks|0,false,false,false,false|false|check:15368,pr-policy:15368'
NORMALIZE='[.enforcement, .target, (.conditions.ref_name.include|join(",")), (.conditions.ref_name.exclude|join(",")), ((.bypass_actors // [])|length|tostring), ([.rules[].type]|sort|join(",")), (.rules[]|select(.type=="pull_request")|.parameters|[(.required_approving_review_count|tostring),(.dismiss_stale_reviews_on_push|tostring),(.require_code_owner_review|tostring),(.require_last_push_approval|tostring),(.required_review_thread_resolution|tostring)]|join(",")), (.rules[]|select(.type=="required_status_checks")|.parameters.strict_required_status_checks_policy|tostring), (.rules[]|select(.type=="required_status_checks")|[.parameters.required_status_checks[]|"\(.context):\(.integration_id)"]|sort|join(","))]|join("|")'

echo "== Package 002: private repository + protected main for $REPO =="
command -v gh >/dev/null 2>&1 || fail "the GitHub CLI (gh) is not installed"
gh auth status >/dev/null 2>&1 || fail "gh is not logged in (run: gh auth login)"
LOGIN="$(gh api user --jq .login 2>/dev/null)" || fail "cannot read the logged-in GitHub user"
[ "$LOGIN" = "HandymanKHM" ] || fail "gh is logged in as '$LOGIN', expected HandymanKHM"
ok "logged in as HandymanKHM"
REPOINFO="$(gh api "repos/$REPO" --jq '[.full_name, (.permissions.admin|tostring), .default_branch] | join(" ")' 2>/dev/null)" \
  || fail "cannot read repository $REPO"
[ "$REPOINFO" = "$REPO true main" ] || fail "unexpected repository identity or permission: '$REPOINFO'"
ok "repository $REPO, admin rights, default branch main"

# Dependency: package 001 done.
[ "$(gh api "repos/$REPO/pulls/4" --jq '.merged|tostring')" = "true" ] || fail "PR #4 is not merged yet — run package 001 first"
gh api "repos/$REPO/contents/.github/skills/founder-action-package/SKILL.md?ref=main" --jq .sha >/dev/null 2>&1 \
  || fail "main does not contain the rules from PR #4 — run package 001 first"
ok "PR #4 is merged and its rules are on main"

# Entitlement: rulesets on a PRIVATE personal repository need GitHub Pro or higher.
if ! gh auth status 2>&1 | grep -Eq "read:user|'user'"; then
  echo "note: gh needs permission to read your plan. Approve it in the browser when asked (one time)."
  gh auth refresh -h github.com -s read:user || fail "plan-reading permission was not approved"
fi
PLAN="$(gh api user --jq '.plan.name // "unknown"' 2>/dev/null)" || fail "cannot read your GitHub plan"
case "$PLAN" in
  pro) ok "GitHub plan: pro (rulesets are enforced on private repositories)" ;;
  free) fail "your GitHub plan is Free: a private repository cannot enforce the main ruleset. Founder decision needed — upgrade to GitHub Pro, or accept private without enforced protection" ;;
  *) fail "GitHub plan is '$PLAN'; this package only supports 'pro' — report this output" ;;
esac

# Existing configuration must be exactly what we expect.
OTHERS="$(gh api "repos/$REPO/rulesets?includes_parents=false" --jq "[.[] | select(.name != \"$RULESET_NAME\") | .name] | join(\",\")")" \
  || fail "cannot list rulesets"
[ -z "$OTHERS" ] || fail "unexpected existing rulesets: $OTHERS"
RULESET_ID="$(gh api "repos/$REPO/rulesets?includes_parents=false" --jq "[.[] | select(.name == \"$RULESET_NAME\") | .id][0] // \"\"")"
VIS="$(gh api "repos/$REPO" --jq .visibility)"
ok "current state: visibility=$VIS, ruleset '$RULESET_NAME' ${RULESET_ID:+exists (id $RULESET_ID)}${RULESET_ID:-absent}"

# (1) Ruleset first: if this fails, the visibility is not touched.
BODY='{"name":"main-protection","target":"branch","enforcement":"active","bypass_actors":[],"conditions":{"ref_name":{"include":["refs/heads/main"],"exclude":[]}},"rules":[{"type":"deletion"},{"type":"non_fast_forward"},{"type":"pull_request","parameters":{"required_approving_review_count":0,"dismiss_stale_reviews_on_push":false,"require_code_owner_review":false,"require_last_push_approval":false,"required_review_thread_resolution":false,"allowed_merge_methods":["merge","squash","rebase"]}},{"type":"required_status_checks","parameters":{"strict_required_status_checks_policy":false,"do_not_enforce_on_create":false,"required_status_checks":[{"context":"check","integration_id":15368},{"context":"pr-policy","integration_id":15368}]}}]}'
if [ -n "$RULESET_ID" ] && [ "$(gh api "repos/$REPO/rulesets/$RULESET_ID" --jq "$NORMALIZE")" = "$EXPECTED" ]; then
  ok "ruleset '$RULESET_NAME' already matches D-017 — not changed"
else
  if [ -n "$RULESET_ID" ]; then
    printf '%s' "$BODY" | gh api -X PUT "repos/$REPO/rulesets/$RULESET_ID" --input - --jq .id >/dev/null || fail "GitHub refused the ruleset update"
  else
    RULESET_ID="$(printf '%s' "$BODY" | gh api -X POST "repos/$REPO/rulesets" --input - --jq .id)" || fail "GitHub refused the ruleset creation"
  fi
  CHANGED="ruleset '$RULESET_NAME' (id $RULESET_ID) was written; visibility not yet changed"
  ok "ruleset '$RULESET_NAME' written (id $RULESET_ID)"
fi
GOT="$(gh api "repos/$REPO/rulesets/$RULESET_ID" --jq "$NORMALIZE")" || fail "cannot read the ruleset back"
[ "$GOT" = "$EXPECTED" ] || fail "ruleset read back as '$GOT', expected '$EXPECTED'"
ok "ruleset read back exactly as decided"

# (2) Visibility.
if [ "$VIS" = "private" ]; then
  ok "repository already private — not changed"
else
  gh api -X PATCH "repos/$REPO" -f visibility=private --jq .visibility >/dev/null || fail "GitHub refused the visibility change"
  CHANGED="ruleset written and repository made private"
fi

# (3) Read back both states from GitHub.
[ "$(gh api "repos/$REPO" --jq .visibility)" = "private" ] || fail "repository did not read back as private"
ok "repository reads back as private"
ACTIVE="$(gh api "repos/$REPO/rules/branches/main" --jq '[.[].type] | unique | join(",")')" || fail "cannot read active rules on main"
[ "$ACTIVE" = "deletion,non_fast_forward,pull_request,required_status_checks" ] \
  || fail "rules actively enforced on main are '$ACTIVE', expected deletion,non_fast_forward,pull_request,required_status_checks"
ok "enforced on main: $ACTIVE (required checks: check, pr-policy from GitHub Actions)"
echo "RESULT: PASS — $REPO is private and main is protected by ruleset '$RULESET_NAME' (id $RULESET_ID)"
FOUNDER_PACKAGE_002
bash "$PKG"; RC=$?; rm -f "$PKG"; (exit $RC)
