project_tracker: github

# Cardinal Rules

**Never merge into `main` without explicit user permission.** Merging to
production is a human decision. The agent may propose a merge, describe what
would ship, and ask for confirmation, but must never execute `git checkout
main && git merge` or `git push origin main` unless the user has explicitly
authorized that specific merge. Pushing to `main` triggers an automatic
deploy — treat it as a production deployment gate.

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

### Always-on extension reviewers (continued)

| Agent | Focus | Output |
|-------|-------|--------|
| `ce-sandi-metz-reviewer` | Ruby/Rails classes, methods, parameters, object composition, dependency injection patterns, or any OO design choices. Pass `task: "Review this diff through Sandi Metz's POODR lens. Check: small objects, small methods, dependency injection, duck typing, composition over inheritance, message-based design. Report findings with file:line references."` | Unstructured |

### Conditional extension reviewers

| Agent | Select when diff touches... |
|-------|---------------------------|
| `sandi-metz-js-reviewer` | JavaScript/TypeScript files (`*.js`, `*.jsx`, `*.ts`, `*.tsx`) with React components, hooks, or module-level abstractions. Pass `task: "Review this diff through a Sandi Metz lens adapted for React/JS. Check: component size (>100 lines), JSX return length (>10-15 lines), prop count (>4), hook complexity (>20 lines), components mixing fetch+render, prop drilling through 3+ levels, missing abstractions in repeated patterns. Report findings with file:line references."` |
| `ce-dhh-rails-reviewer` | Rails architecture, service objects, session/auth choices, Hotwire-vs-SPA boundaries, abstractions that fight Rails conventions |
| `ce-kieran-rails-reviewer` | Rails controllers, models, views, jobs, components, routes, or other application-layer Ruby code where clarity and conventions matter |

For on-demand Sandi Metz review (outside the code review pipeline), use the `/ce-sandi-metz-review` skill for Ruby/Rails code, or `/sandi-metz-js-review` for JavaScript/React/TypeScript code — each dispatches its respective reviewer to analyze a specific file, directory, or the current diff.

These Rails reviewers complement the standard persona catalog. They are opinionated lenses
on Rails-specific patterns — dispatch them in addition to (not instead of) the standard
`ce-correctness-reviewer`, `ce-testing-reviewer`, etc.

### Reviewer config

The canonical list is in `compound-engineering.local.md` (see palkan/skills integration
docs). This file is the configuration source of truth; the instructions above are the
implementation wiring.

## Server Management

The developer runs `bin/dev` in a tmux session. I must **never** start or stop
`bin/dev`, `bin/rails server`, `bin/vite`, `bin/jobs`, or any background 
process. If a task needs a running server (testing pages, verifying UI changes),
I should ask the developer to start it and paste output, or use `curl` against
their running server for quick checks.

## Server Logs Panel

`.pi/extensions/server-logs.ts` provides a toggleable server log panel inside pi.
- **Usage:** Type `/logs` to open, `Escape` to close
- Reads the last 40 lines from `log/development.log`
- Auto-refreshes via file watcher
- Colorized output (red=errors, yellow=warnings, green=success, accent=requests)
- Close with `Escape`

## Context7 (Accurate Documentation)

Before implementing or proposing code that involves any library, framework, or API
(Next.js, Rails, Tailwind, Stripe, shadcn/ui, etc.), query Context7 for current,
version-specific documentation to avoid hallucinated APIs.

**Workflow:**
1. **Find the library:** `npx ctx7 library "<library-name>" "<what I'm trying to do>"`
2. **Get docs:** `npx ctx7 docs <libraryId> "<specific question>"`
3. Include relevant code snippets from the output in your response

Libraries I commonly use in this project:
- Rails / Ruby gems → `npx ctx7 library "<gem>" | jq -r '.[0]["context7-id"]'`
- Next.js → `npx ctx7 docs /vercel/next.js "<question>"`
- shadcn/ui → `npx ctx7 library "shadcn/ui" "<question>"`
- Tailwind CSS → `npx ctx7 docs /tailwindlabs/tailwindcss "<question>"`

**CRITICAL: Do not skip this step.** Hallucinated APIs waste time. Always
validate with Context7 before writing code.

When I ask a question or propose an implementation, ensure that you're not just confirming what I said. I want realy critial analysis of my proposition, not just automatically going in that direction because I proposed it.

Always prefer guard clauses over simple one-condition conditionals and complex nested conditionals.
