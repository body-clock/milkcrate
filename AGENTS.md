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

Always dispatch `layered-rails` and `ce-sandi-metz-reviewer` in parallel with
standard ce-code-review personas. For JS/React/TS, use `sandi-metz-js-reviewer`.
Other checks (security, correctness, testing) are handled by agent hooks running
linters — no need to dispatch separate reviewer agents for those.

### Reviewer config

Canonical list in `compound-engineering.local.md` (see palkan/skills integration
docs). This file = config source of truth; instructions above = implementation wiring.

## Server Management

Developer runs `bin/dev` in tmux session. Never start or stop `bin/dev`,
`bin/rails server`, `bin/vite`, `bin/jobs`, or any background process. Task needs
running server (testing pages, verifying UI changes): ask developer to start it,
paste output, or use `curl` against running server for quick checks.

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
