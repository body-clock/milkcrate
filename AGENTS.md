project_tracker: github

# ce-work Branching

This project uses `development` as its integration branch (not `main`). When
`ce-work` detects that the current branch is `development`, it should create a
new feature branch from `development` (pulling `origin/development` first), not
from the remote HEAD default.

In Phase 1 Step 2 of ce-work, treat `development` as if it were the default
branch for branching decisions. Feature branches should be named e.g.
`feat/my-feature` or `fix/my-fix` and target `development`.

# Documented Solutions

`docs/solutions/` — documented solutions to past problems (bugs, best practices,
architecture patterns), organized by category with YAML frontmatter (`module`,
`tags`, `problem_type`). Relevant when implementing or debugging in documented
areas.

When planning new features or architectural changes, use the `layered-rails` skill for analysis:
- `/layers:gradual` — plan incremental adoption of layered patterns
- `/layers:analyze` — full codebase architecture analysis
- `/layers:review` — review code from a layered architecture perspective
- `/layers:spec-test` — apply the specification test to evaluate layer placement

## Code Review Extensions

In addition to the standard ce-code-review persona catalog, always dispatch these
additional reviewers in parallel with the standard persona agents. Their output is
unstructured and must be synthesized into the final report (same treatment as
`ce-agent-native-reviewer` and `ce-learnings-researcher`).

### Always-on extension reviewers

| Agent | Focus | Output |
|-------|-------|--------|
| `layered-rails` | Architecture layer violations, reverse dependencies, Current in models, fat controllers, anemic models, mis-layered abstractions. Pass `task: "Review this diff for layered architecture violations per the layered-rails skill. Check for: reverse dependencies between layers, domain code in presentation layer, Current in models, business logic in controllers. Report findings with file:line references."` | Unstructured |
| `ce-security-sentinel` | OWASP Top 10, hardcoded secrets, input validation gaps, auth/authz bypasses, SQL injection, XSS. Pass `task: "Audit this diff for security vulnerabilities. Check: input validation on all params, SQL injection via raw queries, XSS in views, hardcoded secrets/keys, missing auth on endpoints, unsafe redirects. Report findings with file:line references and severity (Critical/High/Medium/Low)."` | Unstructured |

### Conditional extension reviewers

| Agent | Select when diff touches... |
|-------|---------------------------|
| `ce-dhh-rails-reviewer` | Rails architecture, service objects, session/auth choices, Hotwire-vs-SPA boundaries, abstractions that fight Rails conventions |
| `ce-kieran-rails-reviewer` | Rails controllers, models, views, jobs, components, routes, or other application-layer Ruby code where clarity and conventions matter |
| `ce-sandi-metz-reviewer` | Ruby/Rails classes, methods, parameters, object composition, dependency injection patterns, or any OO design choices |

For on-demand Sandi Metz review (outside the code review pipeline), use the `/ce-sandi-metz-review` skill — dispatches the same reviewer to analyze a specific file, directory, or the current diff.

These Rails reviewers complement the standard persona catalog. They are opinionated lenses
on Rails-specific patterns — dispatch them in addition to (not instead of) the standard
`ce-correctness-reviewer`, `ce-testing-reviewer`, etc.

### Reviewer config

The canonical list is in `compound-engineering.local.md` (see palkan/skills integration
docs). This file is the configuration source of truth; the instructions above are the
implementation wiring.

Use Context7 for all developer documentation.

When I ask a question or propose an implementation, ensure that you're not just confirming what I said. I want realy critial analysis of my proposition, not just automatically going in that direction because I proposed it.
