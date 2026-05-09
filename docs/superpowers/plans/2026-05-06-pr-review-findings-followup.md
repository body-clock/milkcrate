# PR Review Findings Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the currently open review findings on PRs `#108`, `#112`, `#113`, and `#115` while preserving each branch's issue-specific scope.

**Architecture:** Apply the fixes in each PR's dedicated worktree so branch history stays isolated. Favor request-level regression coverage where the findings are about controller and layout contracts, and adapt mailer behavior to the already-approved PRG waitlist flow instead of inventing a second success contract.

**Tech Stack:** Rails 8.1, RSpec request/mailer/service specs, Inertia Rails, Vite Ruby, Active Job.

---

### Task 1: Fix `#108` coverage gap for retired dig-session surface

**Files:**
- Modify: `spec/requests/pages_spec.rb`
- Modify: `spec/requests/stores_spec.rb` if needed for a rendering path that exercises the retired surface absence
- Verify: `app/views/layouts/application.html.erb`, `config/routes.rb`

- [ ] Add request examples that prove no retired dig-session navigation leaks into rendered pages and that key app surfaces still render successfully.
- [ ] Run the focused request spec file(s) for the `#108` worktree.
- [ ] Commit the `#108` coverage-only change.

### Task 2: Fix `#112` CSP verification to target the active public surface

**Files:**
- Modify: `spec/requests/pages_spec.rb`
- Modify: `spec/requests/stores_spec.rb` if needed to verify the currently active public storefront surface
- Verify: `app/views/layouts/application.html.erb`, `app/views/layouts/inertia_application.html.erb`, `config/initializers/content_security_policy.rb`

- [ ] Remove assumptions tied to the retired dig-session Rails layout from the CSP verification approach.
- [ ] Add request coverage that exercises the active public pages affected by CSP and checks the emitted CSP header/nonce behavior there.
- [ ] Run the focused request spec file(s) for the `#112` worktree.
- [ ] Commit the `#112` verification update.

### Task 3: Fix `#113` missing end-to-end Turnstile coverage

**Files:**
- Modify: `spec/requests/waitlists_spec.rb`
- Verify: `app/services/turnstile_verifier.rb`, `app/controllers/waitlists_controller.rb`

- [ ] Add request examples proving `POST /waitlist` rejects invalid Turnstile verification and upstream Turnstile failures conservatively.
- [ ] Keep the existing service-level observability specs intact and only add the missing request contract coverage.
- [ ] Run the focused request and service spec files for the `#113` worktree.
- [ ] Commit the `#113` coverage update.

### Task 4: Fix `#115` mailer flow to align with PRG success behavior

**Files:**
- Modify: `app/controllers/waitlists_controller.rb`
- Modify: `app/controllers/pages_controller.rb`
- Modify: `spec/requests/waitlists_spec.rb`
- Verify: `spec/mailers/seller_mailer_spec.rb`

- [ ] Move successful waitlist signup to redirect-after-save while enqueuing the confirmation email only on the persisted success path.
- [ ] Preserve the submitted confirmation state after redirect in the apply page props.
- [ ] Update request specs to prove redirect behavior and email enqueueing on the PRG success path.
- [ ] Run the focused request and mailer spec files for the `#115` worktree.
- [ ] Commit the `#115` behavior update.

### Task 5: Verify and publish branch heads

**Files:**
- Verify only in worktrees: `.worktrees/pr-108`, `.worktrees/pr-112`, `.worktrees/pr-113`, `.worktrees/pr-115`

- [ ] Run the targeted RSpec commands for each affected worktree with the repo’s Ruby and Node toolchains plus sourced `.env`.
- [ ] Confirm each branch is clean and exactly one commit ahead of `origin/development`.
- [ ] Push each updated branch head with `--force-with-lease`.
