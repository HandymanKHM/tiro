---
applyTo: "**"
excludeAgent: "cloud-agent"
---
# Review rubric for this repository

- Review for correctness against the linked order and the plan in the PR
  description. The founder does not read code; only defects that matter count.
- Flag as blocking: unmet acceptance criteria; logic errors with a concrete
  failing input; unhandled errors at I/O, parsing or user-input boundaries;
  secrets or personal data in code or logs; any existing test modified,
  deleted, skipped or weakened; expected values hard-coded in source; changes
  outside the declared scope; new dependencies without a decision entry.
- Give `file:line` and the failing scenario for every blocking comment.
- Do not comment on formatting, naming preferences, or hypothetical future
  concerns. At most five minor suggestions per review.
- Claims in the PR description ("tests pass") are not evidence; the CI
  results are.
