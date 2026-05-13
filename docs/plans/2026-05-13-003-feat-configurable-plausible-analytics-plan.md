---
title: Replace Clarity with Configurable Plausible Analytics
type: feat
status: active
date: 2026-05-13
origin: docs/brainstorms/2026-05-13-configurable-plausible-analytics-requirements.md
---

# Replace Clarity with Configurable Plausible Analytics

## Summary

Remove Microsoft Clarity from the Inertia layout, add Plausible Analytics with the `data-domain` sourced from a new `plausible_domain` config setting (defaulting to `milkcrate.fm`, overridable via `PLAUSIBLE_DOMAIN` env var), hook Plausible into Inertia's SPA navigation for accurate pageview tracking, and clean up the dead hardcoded Plausible snippet in the unused `application.html.erb` layout.

---

## Problem Frame

Milkcrate has dead Plausible code in an unused layout (`application.html.erb`) and Microsoft Clarity — a different analytics tool — running in the active layout (`inertia_application.html.erb`). No Plausible data has ever been collected despite the code suggesting otherwise. The hardcoded approach also makes per-environment configuration (dev/staging/production) impossible. This plan implements the swap cleanly with proper configuration.

---

## Requirements

- R1. Remove Microsoft Clarity from `inertia_application.html.erb`
- R2. Add Plausible Analytics script to `inertia_application.html.erb` with configurable `data-domain`
- R3. Add `plausible_domain` to `config/settings.yml`, defaulting to `milkcrate.fm`
- R4. Support env var override via `PLAUSIBLE_DOMAIN` (config gem convention)
- R5. Hook Inertia client-side navigation to fire `plausible('pageview')` for accurate SPA tracking
- R6. Remove dead Plausible code from `application.html.erb`
- R7. Add `PLAUSIBLE_DOMAIN` to `.env.example`

**Origin actors:** A1 (developer/operator), A2 (visitor)
**Origin acceptance examples:** AE1 (no Clarity in source), AE2 (Plausible script with correct domain), AE3 (env var override), AE4 (SPA pageview fires on navigation), AE5 (no Plausible in application.html.erb), AE6 (.env.example has PLAUSIBLE_DOMAIN)

---

## Scope Boundaries

- **Not** a Plausible self-host setup — uses Plausible Cloud (`https://plausible.io/js/script.js`)
- **Not** adding custom event tracking (outbound links, file downloads, 404s, goals)
- **Not** adding cookie consent or GDPR banner
- **Not** migrating historical Clarity data

---

## Context & Research

### Relevant Code and Patterns

- Layouts: `app/views/layouts/inertia_application.html.erb` (active), `app/views/layouts/application.html.erb` (unused for page rendering)
- Config: `config/settings.yml` uses the `config` gem with env var override convention
- Frontend entry: `app/frontend/entrypoints/application.tsx` (Inertia app bootstrap)
- CSP: `config/initializers/content_security_policy.rb` (`script-src :self, :https`, `connect-src :self, :https`)
- Env example: `.env.example`

### Institutional Learnings

- The `config` gem auto-generates env var names by uppercasing the setting key (e.g., `store_name` → `STORE_NAME`). No special wiring needed — adding `plausible_domain` to `settings.yml` gives `PLAUSIBLE_DOMAIN` for free.

### External References

- Plausible script: `<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>`
- Inertia v3 events: `router.on('navigate', callback)` from `@inertiajs/react`, fires `CustomEvent('inertia:navigate', ...)` on `document` — works for SPA pageview tracking

---

## Key Technical Decisions

- **Use standard `script.js` (not `script.manual.js`):** The standard script auto-tracks initial pageview and popstate (back/forward). Combined with an explicit Inertia `navigate` hook, this covers all navigation modes.
- **Attach Plausible script via `<script>` tag in layout, not via npm/yarn:** Keeps it simple — no bundling overhead, and the script loads asynchronously without blocking render.
- **Register Inertia navigate hook in `application.tsx`:** Single location, fires once on app boot, no per-page setup needed.

---

## Implementation Units

### U1. Add Plausible Domain Configuration

**Goal:** Add the `plausible_domain` setting to the config system with a production default and env var override.

**Requirements:** R3, R4

**Dependencies:** None

**Files:**
- Modify: `config/settings.yml`
- Modify: `.env.example`

**Approach:**
- Add `plausible_domain: milkcrate.fm` to `config/settings.yml` alongside the existing settings
- Add `PLAUSIBLE_DOMAIN=milkcrate.fm` to `.env.example` with a descriptive comment
- The config gem automatically handles env var override — setting `PLAUSIBLE_DOMAIN` at deploy time overrides the YAML value

**Test scenarios:**
- Happy path: config loads `plausible_domain` from YAML with value `milkcrate.fm`
- Happy path: with `PLAUSIBLE_DOMAIN` env var set, `Settings.plausible_domain` returns the env var value

**Verification:**
- `Settings.plausible_domain` returns `milkcrate.fm` in development without env var
- Settings load without error

---

### U2. Remove Clarity and Add Plausible to Inertia Layout

**Goal:** Replace the Clarity snippet with a config-driven Plausible Analytics script in the active layout.

**Requirements:** R1, R2 (covers AE1, AE2, AE3)

**Dependencies:** U1 (config must exist before layout can reference it)

**Files:**
- Modify: `app/views/layouts/inertia_application.html.erb`

**Approach:**
- Remove the entire Clarity block:
  ```erb
  <% clarity_id = Rails.application.credentials.dig(:clarity, :project_id) || ENV["CLARITY_PROJECT_ID"] %>
  <% if clarity_id.present? %>
    <script type="text/javascript" nonce="<%= request.content_security_policy_nonce %>">
      (function(c,l,a,r,i,t,y){...})(window,document,"clarity","script","<%= clarity_id %>");
    </script>
  <% end %>
  ```
- Add Plausible snippet in the `<head>` section:
  ```erb
  <% analytics_domain = Settings.plausible_domain.presence || ENV['PLAUSIBLE_DOMAIN'] %>
  <% if analytics_domain.present? %>
    <script defer data-domain="<%= analytics_domain %>" src="https://plausible.io/js/script.js" nonce="<%= request.content_security_policy_nonce %>"></script>
    <script nonce="<%= request.content_security_policy_nonce %>">
      window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)}
    </script>
  <% end %>
  ```
- The `if present?` guard allows disabling analytics by emptying `plausible_domain` or not setting the env var (useful for development)
- The `Settings.plausible_domain.presence || ENV['PLAUSIBLE_DOMAIN']` chain prefers the YAML default and falls back to env var override — no config gem changes needed
- Use `nonce` attribute for CSP compatibility, following the existing pattern

**Patterns to follow:**
- The existing CSP nonce pattern used by other `<script>` tags in the same layout

**Test scenarios:**
- Happy path: with `plausible_domain` set to `milkcrate.fm`, rendered HTML includes `<script defer data-domain="milkcrate.fm" src="https://plausible.io/js/script.js">`
- Happy path: no `clarity`, `clarity.ms`, or `microsoft` references appear in rendered HTML
- Edge case: with `plausible_domain` set to empty string, no Plausible script is rendered
- Edge case: `PLAUSIBLE_DOMAIN=staging.milkcrate.fm` without YAML `plausible_domain` produces `data-domain="staging.milkcrate.fm"` (env var override via `ENV[]` fallback)

**Verification:**
- Render a page in development and inspect the HTML source
- No Clarity code present
- Plausible script tag present with correct `data-domain`

---

### U3. Clean Up Dead Plausible Code in application.html.erb

**Goal:** Remove the hardcoded Plausible snippet from the unused layout to avoid confusion.

**Requirements:** R6 (covers AE5)

**Dependencies:** None (this is a standalone cleanup)

**Files:**
- Modify: `app/views/layouts/application.html.erb`

**Approach:**
- Remove the two comment-and-script blocks:
  ```erb
  <!-- Privacy-friendly analytics by Plausible -->
  <script async src="https://plausible.io/js/pa-f3yufBsBIr2Unqx-osXmc.js"></script>
  <script nonce="<%= request.content_security_policy_nonce %>">
    window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
    plausible.init()
  </script>
  ```
- This layout is not used by any controller, but removing the dead code prevents future confusion

**Test scenarios:**
- Happy path: rendered `application.html.erb` (should it ever be used) contains no Plausible script tags

**Verification:**
- Visual inspection confirms the hardcoded Plausible tags are gone

---

### U4. Add Inertia SPA Pageview Tracking

**Goal:** Fire `plausible('pageview')` on every Inertia client-side navigation so SPA route changes are counted.

**Requirements:** R5 (covers AE4)

**Dependencies:** U2 (the Plausible global `window.plausible` function must be initialized by the layout script)

**Files:**
- Modify: `app/frontend/entrypoints/application.tsx`

**Approach:**
- Import `router` from `@inertiajs/react` in the entry point
- Register a `navigate` event handler after `createInertiaApp`:
  ```ts
  router.on('navigate', () => {
    if (typeof window.plausible === 'function') {
      window.plausible('pageview')
    }
  })
  ```
- This fires after Inertia considers a navigation fully complete (page component rendered, scroll position restored)
- The guard (`typeof window.plausible === 'function'`) prevents errors if Plausible fails to load

**Patterns to follow:**
- Existing Inertia setup pattern in `application.tsx`

**Test scenarios:**
- Integration: given Plausible is loaded, an Inertia link click from home to storefront fires `window.plausible('pageview')`
- Edge case: given Plausible fails to load, an Inertia navigation does not throw an error

**Verification:**
- In a browser with Plausible loaded, navigate between Inertia pages and observe `pageview` events in the browser's Network tab (POST to `https://plausible.io/api/event`)

---

### U5. Verification Pass

**Goal:** Confirm everything works end-to-end — no regressions, Plausible fires correctly on both initial page load and SPA navigation.

**Requirements:** All

**Dependencies:** U1, U2, U3, U4

**Files:** None

**Approach:**
- Run `bundle exec rspec` to confirm no test suite regressions
- Run `npm run test:frontend` and `npm run test:components` for frontend tests
- Browse the app in development, inspect rendered HTML for correct Plausible script tag and absent Clarity code
- Verify CSP allows Plausible by checking browser console for any blocked-resource errors

**Test scenarios:**
- Happy path: full test suite passes
- Edge case: CSP does not block Plausible's script or API endpoint
- Edge case: Plausible fails gracefully when the domain is empty (no script, no console errors)

**Verification:**
- `bundle exec rspec` passes
- Frontend tests pass
- Browser console shows no CSP errors related to Plausible

---

## System-Wide Impact

- **Interaction graph:** The Plausible script loads from an external CDN; the `data-domain` config change could affect tracking accuracy if set incorrectly but poses no runtime risk
- **Error propagation:** Plausible failing to load is non-blocking — the `window.plausible` guard in the SPA hook prevents console errors
- **Unchanged invariants:** The app's server-rendered HTML structure, CSP policy, HTTP caching, and JavaScript bundle are unchanged except for the analytics snippet swap

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Plausible CDN is unreachable (stops analytics) | Non-blocking — script loads async; app works fine without it |
| CSP blocks Plausible script or API | Current policy (`script-src :self, :https`, `connect-src :self, :https`) should permit it; verify in U5 |
| Plausible domain not configured in Plausible dashboard | Must be set up in Plausible Cloud before analytics show data; documented in Dependencies |
| Inertia `navigate` event API changes in future v3 patch | Inertia v3 `router.on` API is stable and tested against v3.0.3 installed in this project |

### Deferred to Implementation

- CSP compatibility verification with Plausible endpoints (browser test in U5)
- Exact Plausible script URL variant (standard `script.js` is the plan; verify it accepts `data-domain` attribute)

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-13-configurable-plausible-analytics-requirements.md](../brainstorms/2026-05-13-configurable-plausible-analytics-requirements.md)
- **Plausible script docs:** https://plausible.io/docs/plausible-script
- **Plausible SPA tracking:** https://plausible.io/docs/spa-applications
