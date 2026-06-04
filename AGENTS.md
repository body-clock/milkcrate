project_tracker: github

# Cardinal Rules

**Never use eslint-disable, oxlint-disable, or any lint-suppression comment.**
Resolve lint offenses with real code fix: extract components, split functions,
restructure logic, or adjust lint rule if genuinely wrong. Suppression comments
rot over time, hide real bugs.

**Never merge into `main` without explicit user permission.** Merge to prod =
human decision. Agent may propose merge, describe what ships, ask confirmation.
Never execute `git checkout main && git merge` or `git push origin main` without
explicit authorization. Push to `main` triggers auto-deploy — treat as prod gate.

# ce-work Branching

Project uses `development` as integration branch (not `main`). When `ce-work`
detects current branch = `development`, create feature branch from `development`
(pull `origin/development` first), not remote HEAD default.

Phase 1 Step 2 of ce-work: treat `development` as default branch for branching
decisions. Feature branches: `feat/my-feature` or `fix/my-fix`, target `development`.

# Documented Solutions

`docs/solutions/` — solutions to past problems (bugs, best practices, architecture
patterns), organized by category with YAML frontmatter (`module`, `tags`,
`problem_type`). Relevant when implementing or debugging documented areas.

Plan new features or architectural changes: use `layered-rails` skill for analysis:

- `/layers:gradual` — plan incremental adoption of layered patterns
- `/layers:analyze` — full codebase architecture analysis
- `/layers:review` — review code from layered architecture perspective
- `/layers:spec-test` — apply specification test to evaluate layer placement

## Code Review Extensions

Beyond standard ce-code-review persona catalog, always dispatch these reviewers
in parallel with standard persona agents. Output unstructured, synthesize into
final report (same treatment as `ce-agent-native-reviewer` and
`ce-learnings-researcher`).

### Always-on extension reviewers

| Agent                  | Focus                                                                                                                                                                                                                                                                                                                                                                                                              | Output       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| `layered-rails`        | Architecture layer violations, reverse dependencies, Current in models, fat controllers, anemic models, mis-layered abstractions. Pass `task: "Review this diff for layered architecture violations per the layered-rails skill. Check for: reverse dependencies between layers, domain code in presentation layer, Current in models, business logic in controllers. Report findings with file:line references."` | Unstructured |
| `ce-security-sentinel` | OWASP Top 10, hardcoded secrets, input validation gaps, auth/authz bypasses, SQL injection, XSS. Pass `task: "Audit this diff for security vulnerabilities. Check: input validation on all params, SQL injection via raw queries, XSS in views, hardcoded secrets/keys, missing auth on endpoints, unsafe redirects. Report findings with file:line references and severity (Critical/High/Medium/Low)."`          | Unstructured |

### Always-on extension reviewers (continued)

| Agent                    | Focus                                                                                                                                                                                                                                                                                                                                                         | Output       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `ce-sandi-metz-reviewer` | Ruby/Rails classes, methods, parameters, object composition, dependency injection patterns, or any OO design choices. Pass `task: "Review this diff through Sandi Metz's POODR lens. Check: small objects, small methods, dependency injection, duck typing, composition over inheritance, message-based design. Report findings with file:line references."` | Unstructured |

### Conditional extension reviewers

| Agent                      | Select when diff touches...                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sandi-metz-js-reviewer`   | JavaScript/TypeScript files (`*.js`, `*.jsx`, `*.ts`, `*.tsx`) with React components, hooks, or module-level abstractions. Pass `task: "Review this diff through a Sandi Metz lens adapted for React/JS. Check: component size (>100 lines), JSX return length (>10-15 lines), prop count (>4), hook complexity (>20 lines), components mixing fetch+render, prop drilling through 3+ levels, missing abstractions in repeated patterns. Report findings with file:line references."` |
| `ce-dhh-rails-reviewer`    | Rails architecture, service objects, session/auth choices, Hotwire-vs-SPA boundaries, abstractions that fight Rails conventions                                                                                                                                                                                                                                                                                                                                                       |
| `ce-kieran-rails-reviewer` | Rails controllers, models, views, jobs, components, routes, or other application-layer Ruby code where clarity and conventions matter                                                                                                                                                                                                                                                                                                                                                 |

On-demand Sandi Metz review (outside code review pipeline): use `/ce-sandi-metz-review`
for Ruby/Rails code, or `/sandi-metz-js-review` for JavaScript/React/TypeScript code —
each dispatches respective reviewer to analyze specific file, directory, or current diff.

Rails reviewers complement standard persona catalog. Opinionated lenses on
Rails-specific patterns — dispatch in addition to (not instead of) standard
`ce-correctness-reviewer`, `ce-testing-reviewer`, etc.

### Reviewer config

Canonical list in `compound-engineering.local.md` (see palkan/skills integration
docs). This file = config source of truth; instructions above = implementation wiring.

## Server Management

Developer runs `bin/dev` in tmux session. Never start or stop `bin/dev`,
`bin/rails server`, `bin/vite`, `bin/jobs`, or any background process. Task needs
running server (testing pages, verifying UI changes): ask developer to start it,
paste output, or use `curl` against running server for quick checks.

## Server Logs Panel

`.pi/extensions/server-logs.ts` provides toggleable server log panel inside pi.

- **Usage:** Type `/logs` to open, `Escape` to close
- Reads last 40 lines from `log/development.log`
- Auto-refreshes via file watcher
- Colorized output (red=errors, yellow=warnings, green=success, accent=requests)
- Close with `Escape`

## Context7 (Accurate Documentation)

Before implementing or proposing code with any library, framework, or API
(Next.js, Rails, Tailwind, Stripe, shadcn/ui, etc.), query Context7 for current,
version-specific docs to avoid hallucinated APIs.

**Workflow:**

1. **Find the library:** `npx ctx7 library "<library-name>" "<what I'm trying to do>"`
2. **Get docs:** `npx ctx7 docs <libraryId> "<specific question>"`
3. Include relevant code snippets from output in response

Libraries commonly used in this project:

- Rails / Ruby gems → `npx ctx7 library "<gem>" | jq -r '.[0]["context7-id"]'`
- Next.js → `npx ctx7 docs /vercel/next.js "<question>"`
- shadcn/ui → `npx ctx7 library "shadcn/ui" "<question>"`
- Tailwind CSS → `npx ctx7 docs /tailwindlabs/tailwindcss "<question>"`

**CRITICAL: Do not skip this step.** Hallucinated APIs waste time. Always validate
with Context7 before writing code.

When I ask question or propose implementation: don't just confirm what I said.
Want real critical analysis of proposition, not auto-going in that direction
because I proposed it.

Always prefer guard clauses over simple one-condition conditionals and complex
nested conditionals.

Use caveman skill at all times.

Working on issue, suggest fix not in scope: redirect to creating issue for that
specific problem before implementation. Scope ambiguous: assume change in scope.
Scope very clear (specific issue): use that context to determine if proposed
change in scope.
