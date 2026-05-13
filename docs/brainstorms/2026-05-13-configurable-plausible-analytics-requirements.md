---
date: 2026-05-13
topic: configurable-plausible-analytics
---

# Configurable Plausible Analytics

## Summary

Replace Microsoft Clarity with Plausible Analytics across all pages, with the Plausible site domain configured through `config/settings.yml` and overridable via environment variable — no hardcoded script URLs, no dead code.

---

## Problem Frame

Milkcrate has two analytics snippets in two layouts, but only one is actually reaching users. The `application.html.erb` layout (Turbo/Multi-Page) contains a hardcoded Plausible script URL with an opaque site ID, but all controllers render through the `inertia_application` layout — meaning no Plausible data has ever been collected. The Inertia layout has Microsoft Clarity configured via Rails credentials, which is the only analytics currently active.

This means the analytics picture is misleading (dead code suggests Plausible is deployed but it isn't) and uses Clarity — a Microsoft product — when the project already chose Plausible (privacy-focused, first-party-feeling, open-core). Hardcoded IDs and credential-based config also make it hard to change domains or set up per-environment analytics (dev/staging/production).

---

## Actors

- A1. **Developer/operator**: Configures the analytics domain per environment, validates analytics are firing correctly.
- A2. **Visitor**: Browsing the storefront — their pageviews are tracked by Plausible.

---

## Requirements

**Clarity removal**
- R1. Remove the Microsoft Clarity snippet from `inertia_application.html.erb`, including the credential lookup and inline script block.

**Plausible integration**
- R2. Add the Plausible Analytics script (`script.js`) to `inertia_application.html.erb`, with the `data-domain` attribute sourced from a config setting.
- R3. Configure the Plausible domain as `plausible_domain` in `config/settings.yml`, defaulting to `milkcrate.fm`.
- R4. Support environment variable override (`PLAUSIBLE_DOMAIN`) via the config gem's existing env-var integration, following the same pattern as other settings.

**SPA pageview tracking**
- R5. Hook into Inertia's client-side navigation to fire `plausible('pageview')` on every page transition, so SPA route changes are accurately counted.

**Dead code cleanup**
- R6. Remove or replace the dead Plausible snippet from `application.html.erb` — either delete it (clean slate) or replace it with the new config-based approach if that layout is expected to be used again. Given all controllers use `inertia_application`, deleting the hardcoded snippet is sufficient.

**Environment documentation**
- R7. Add `PLAUSIBLE_DOMAIN` to `.env.example` with a descriptive comment.

---

## Acceptance Examples

- AE1. **Covers R1.** Given a page rendered through `inertia_application`, the HTML source contains no references to `clarity`, `clarity.ms`, or `microsoft`.
- AE2. **Covers R2, R3.** Given `config/settings.yml` sets `plausible_domain: milkcrate.fm`, the rendered layout includes `<script defer data-domain="milkcrate.fm" src="https://plausible.io/js/script.js">`.
- AE3. **Covers R4.** Given the environment variable `PLAUSIBLE_DOMAIN=staging.milkcrate.fm` is set, the rendered `data-domain` attribute reflects the env var value, not the YAML default.
- AE4. **Covers R5.** Given a visitor navigates from `/` to `/philadelphiamusic` via an Inertia link click (no full page reload), a `pageview` event is sent to Plausible's API.
- AE5. **Covers R6.** Given `application.html.erb` is rendered, the HTML contains no Plausible script tags.
- AE6. **Covers R7.** Given `.env.example` is read, it contains `# Plausible Analytics` and `PLAUSIBLE_DOMAIN=milkcrate.fm`.

---

## Success Criteria

- A developer can set `plausible_domain` in one place (YAML or env var) and have it reflected across all pages.
- Plausible dashboard shows pageviews for all routes, including SPA navigations within the storefront.
- No Clarity data is sent from any Milkcrate page.
- The codebase has no hardcoded analytics IDs or opaque script URLs.

---

## Scope Boundaries

- **This is not a Plausible self-host setup.** The integration uses Plausible Cloud (`https://plausible.io/js/script.js`). Self-hosting is a future concern.
- **This does not add custom event tracking.** Only standard pageviews will be tracked. Outbound link clicks, file downloads, 404 tracking, and custom goals are excluded.
- **This does not add cookie consent or GDPR banner.** Plausible is GDPR-compliant without consent (no cookies, anonymized data). If legal advice later requires a banner, that's separate work.
- **This does not migrate historical analytics data.** Any existing Clarity data will remain in Microsoft Clarity — no data migration.

---

## Key Decisions

- **Source of truth for Plausible domain:** `config/settings.yml` with env var override. This follows the existing pattern used by `store_name`, `discogs_username`, etc., and avoids duplicating config mechanisms (credentials vs settings vs env).
- **Standard script vs manual script:** Use Plausible's standard `script.js` (which auto-tracks initial pageview and `popstate` events) plus an explicit Inertia navigation hook for `pushState`-based SPA transitions. This ensures coverage across both full-page loads and client-side navigation without missing the `pushState` events that Inertia uses but Plausible's auto-detect doesn't catch.
- **Inertia hook location:** A small inline script or module in the frontend entry point that listens for Inertia's `navigate` event and calls `window.plausible('pageview')`. This is framework-native (no extra dependencies) and fires precisely when Inertia considers a navigation complete.

---

## Dependencies / Assumptions

- The Plausible account/team already has access to the `milkcrate.fm` domain configured in their dashboard. If not, that setup must happen before or alongside deployment.
- The current CSP (`script-src :self, :https`, `connect-src :self, :https`) covers Plausible's CDN and API endpoint without modification. This should be verified during implementation.
- Inertia v3 (`@inertiajs/react ^3.0.3`) exposes the `router.on` event API for navigation hooks, which the implementation will use for SPA pageview firing.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R5][Needs research] What is the exact Inertia v3 API for hooking into navigation completion (event name, registration location)? Should be confirmed against the installed version during implementation.
- [Affects R2][Needs research] Verify that the CSP actually permits `https://plausible.io` for both `script-src` and `connect-src` — test with browser dev tools after implementing.
