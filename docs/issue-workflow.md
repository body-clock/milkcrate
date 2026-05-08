# Issue Workflow

How we move from a GitHub issue to a merged PR.

---

## Branch

One branch per issue. Branch from `development`.

```bash
git checkout development && git pull
git checkout -b feat/issue-{number}-{short-description}
```

Examples:
- `feat/issue-77-storefront-curation`
- `feat/issue-65-onboard-store-rake`

No worktrees. Work directly in the main repo checkout.

---

## Implementation

Use TDD: red → green → refactor, one behavior at a time.

Run tests continuously:

```bash
set -a && source .env && set +a
bundle exec rspec spec/path/to/new_spec.rb --format documentation
```

---

## Pre-Push Checklist

Run all of these before pushing and opening a PR. Fix everything before proceeding.

```bash
# 1. Full test suite
bundle exec rspec

# 2. RuboCop — all changed files (app AND spec)
bundle exec rubocop app/path/to/changed.rb spec/path/to/changed_spec.rb

# 3. Security (when touching auth, input handling, or dependencies)
bundle exec brakeman --no-pager
bundle exec bundler-audit
```

RuboCop autocorrect for safe fixes:

```bash
bundle exec rubocop -a app/... spec/...
```

---

## Pull Request

Push branch and open PR:

```bash
git push -u origin feat/issue-{number}-{short-description}
gh pr create --title "..." --body "..."
```

PR body must include:
- `Closes #{number}` — links PR to issue, closes it on merge
- Summary bullets (what changed and why)
- Test plan checklist

Never close issues directly. The PR merge closes the issue via `Closes #N`.

---

## Review and Merge

After opening the PR:
- Wait for human review and merge signal
- Do not start the next issue until merge is confirmed
- After merge signal: delete worktree if any, pull `main`, start next branch

---

## Issue Execution Order

See [tdd-execution-order.md](tdd-execution-order.md) for dependency ordering across open issues.
