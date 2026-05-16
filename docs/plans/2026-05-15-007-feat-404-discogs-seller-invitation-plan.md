---
title: "feat: 404 page → Discogs seller invitation"
type: feat
status: active
date: 2026-05-15
origin: docs/brainstorms/2026-05-15-404-discogs-seller-invitation-requirements.md
---

# feat: 404 Page → Discogs Seller Invitation

## Summary

Convert the static 404/no-store-found page into a dynamic Inertia invitation that detects Discogs sellers and invites them to claim the URL. When a slug doesn't match a known store, the server checks the Waitlist — if an application exists, acknowledge it; otherwise render a generic invitation. An async client-side Discogs probe upgrades the page to personalized copy ("We found you on Discogs — claim this storefront") when the slug is a real seller. A "Claim this storefront" CTA redirects to `/apply?discogs_username={slug}` with the field pre-filled.

---

## Problem Frame

Every unclaimed `/:slug` is a blind spot. Real Discogs sellers who find their own store URL get the same dead "No stores in rotation yet" as a bot hitting garbage. Sellers who already applied see the same wall — generating confusion and support friction. The 404 page is the top-of-funnel for seller acquisition; treating all visits identically leaves this conversion path on the table.

---

## Requirements

- R1. Convert the `no_stores` ERB template (used by `StoresController#show`) into an Inertia/React page component. The `featured` action at `/` keeps its current ERB behavior unchanged.
- R2. Add a lightweight JSON endpoint for async Discogs seller lookup, reusing `DiscogsClient#seller_profile`.
- R3. In `StoresController#show`, synchronously check the Waitlist table for an entry with `discogs_username = slug` (case-insensitive). If found, render acknowledgment copy instead of the invitation.
- R4. The `/apply` Inertia page reads `discogs_username` from Inertia props (passed from query params via the controller) and pre-fills the form field. The field is editable.
- R5. Apply a slug quality gate before firing the Discogs probe: skip the lookup for slugs that fail a basic heuristic (too short/long, special chars, reserved routes, bot patterns).
- R6. When a Waitlist entry matches, render a simple acknowledgment: "This URL has been claimed — we'll notify the applicant when it's ready." No escalation path, no email exposure.
- R7. Discogs probe results should be cached via `Rails.cache` (Solid Cache) to protect the API rate limit.
- R8. Normalize `discogs_username` on the Waitlist model (downcase on save) matching the Store model pattern.

**Origin actors:** A1 (Visitor, prospective seller), A2 (Returning applicant)
**Origin flows:** F1 (First-time seller), F2 (Non-seller), F3 (Returning applicant), F4 (Bot/garbage slug)
**Origin acceptance examples:** AE1–AE6

---

## Scope Boundaries

- No inline application form on the 404 page — always redirect to `/apply`.
- No post-apply preview or "coming soon" page at the slug URL.
- No referral tracking, UTM param plumbing beyond `discogs_username`.
- No fuzzy Discogs username matching or "Did you mean?" suggestions.
- No Store creation from the 404 — waitlist entry only.
- No email or identity exposure in the "already applied" acknowledgment.
- The `featured` action at `/` keeps its current `no_stores` ERB behavior unchanged.
- No analytics/Plausible events for the probe (can be added later).

---

## Context & Research

### Relevant Code and Patterns

- `app/services/discogs_client.rb` — `seller_profile(username)` calls `GET /users/{username}`. Existing rate-limit handling (retry on 503, RateLimitError on 429).
- `app/controllers/stores_controller.rb` — `show` action branches on `Store.with_discogs_username(params[:slug])`. Currently renders `:no_stores` ERB on miss.
- `app/views/stores/no_stores.html.erb` — 5-line static ERB. Target for Inertia replacement.
- `app/frontend/pages/apply.tsx` — Inertia/React apply form with `useForm` from `@inertiajs/react`.
- `app/models/waitlist.rb` — Has `discogs_username` (unique, but no normalization callback). Add one.
- `app/models/store.rb` — Has `before_validation :normalize_discogs_username`. Pattern to follow.
- `app/controllers/waitlists_controller.rb` — `create` action, accepts `discogs_username` param.
- `app/controllers/pages_controller.rb` — `apply` action renders the apply Inertia page.
- `app/frontend/layouts/marketing_layout.tsx` — Marketing layout (BrandMark + responsive shell) used by the apply page; the new invitation page should use the same.
- `app/frontend/components/storefront_motion_config.tsx` — Framer motion tokens. Apply page uses `springTactile`; pattern to follow for invitation transitions.
- `config/environments/production.rb` — Solid Cache is configured (`cache_store`). First use in application code.

### Institutional Learnings

- `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md` — MarketingLayout and BrandMark usage pattern for vendor-facing pages.
- `docs/ideation/2026-05-14-vendor-facing-marketing-page-ideation.md` — Proposed "Claim an Early Storefront" framing for vendor CTAs.

---

## Key Technical Decisions

- **Probe architecture: New API endpoint (`GET /api/discogs/lookup/:username`).** Client-side async keeps initial page render fast (~10ms vs 500ms+ for synchronous Discogs call). The endpoint reuses `DiscogsClient#seller_profile` with existing auth/rate-limit plumbing.
- **Page conversion: New Inertia page at `stores/invitation`.** The ERB template is replaced by an Inertia React component at `app/frontend/pages/stores/invitation.tsx`. Uses `MarketingLayout` for visual consistency with the apply page. The `no_stores.html.erb` is kept for the `featured` action only.
- **Waitlist normalization: Add `before_validation :normalize_discogs_username` to Waitlist.** Mirrors the Store model pattern exactly. Enables case-insensitive slug matching.
- **Waitlist lookup: Synchronous server-side.** Single `Waitlist.exists?` query before rendering. Fast (~1ms), no async needed.
- **Probe caching: `Rails.cache` with Solid Cache.** TTL of 1 hour for "seller found" results (can be shorter), 24 hours for "not found" results (changes rarely if ever). Cache key: `discogs_lookup/<normalized_username>`.
- **Quality gate: Client-side heuristic before firing probe.** Check in the React component: slug length 3-40 chars, matches `/\A[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]\z/`, not in reserved routes list. Skip probe for failures; keep generic invitation.
- **Query param propagation: Through Inertia props.** `PagesController#apply` reads `params[:discogs_username]` and passes it as `initial_discogs_username` prop. The React component uses it as `useForm` initial value. Field is editable.

---

## Implementation Units

### U1. Normalize discogs_username on Waitlist model

**Goal:** Enable case-insensitive matching between slug and Waitlist `discogs_username`, matching the Store model pattern.

**Requirements:** R8

**Dependencies:** None

**Files:**
- Modify: `app/models/waitlist.rb`

**Approach:**
- Add `before_validation :normalize_discogs_username, if: :discogs_username_changed?`
- Add scope `scope :with_discogs_username, ->(username) { where(discogs_username: username.downcase) }` matching Store's pattern
- Add private method `normalize_discogs_username` that downcases `self.discogs_username`

**Patterns to follow:**
- `app/models/store.rb` — identical normalization pattern (`before_validation :normalize_discogs_username, if: :discogs_username_changed?` → `self.discogs_username = discogs_username&.downcase`)

**Test scenarios:**
- Happy path: Waitlist entry created with "MyStore" stores "mystore" after save
- Edge case: slug lookup `Waitlist.with_discogs_username("MyStore")` matches stored "mystore"
- Edge case: blank discogs_username passes through normalized (presence validation catches it separately)
- Edge case: discogs_username unchanged on update does not re-run normalization

**Verification:**
- `Waitlist.with_discogs_username("MyStore")` returns entries stored as "mystore"
- New entries are stored downcased

---

### U2. Add Discogs lookup API endpoint

**Goal:** Provide a lightweight JSON endpoint that the frontend calls to check if a slug is a real Discogs seller.

**Requirements:** R2, R5, R7

**Dependencies:** None

**Files:**
- Create: `app/controllers/api/discogs_lookup_controller.rb`
- Modify: `config/routes.rb`

**Approach:**
- Namespace under `api/` — `namespace :api { get "discogs/lookup/:username", to: "discogs_lookup#show" }`
- Controller action:
  - Apply quality gate (length, character class). If slug fails, return 200 with `{ found: false, reason: "invalid_slug" }` — don't leak info about what's considered valid
  - Check `Rails.cache` for `discogs_lookup/<normalized_username>`. If cached, return cached result
  - Call `DiscogsClient.new.seller_profile(username)` — catches `DiscogsClient::RateLimitError` and `DiscogsClient::ApiError`
  - If API returns seller data → cache result with TTL 1 hour, return `{ found: true, seller_name: ..., avatar_url: ..., inventory_count: ... }`
  - If API returns 404 → cache "not found" with TTL 24 hours, return `{ found: false }`
  - If API errors → return `{ found: false, reason: "api_error" }` (don't cache errors)
- No authentication required (the endpoint is public — the search/reconnaissance risk is mitigated by caching + quality gate + per-IP throttling in future iteration)

**Patterns to follow:**
- `app/services/discogs_client.rb` — existing client with rate-limit handling
- Controller follows existing Inertia controller conventions (plain `ApplicationController` subclass)

**Test scenarios:**
- Happy path: username matches a real Discogs seller → returns `{ found: true, seller_name: "..." }`
- Happy path: username doesn't exist on Discogs → returns `{ found: false }`
- Edge case: slug fails quality gate → returns `{ found: false, reason: "invalid_slug" }`
- Edge case: cached "found" result → returns from cache without hitting Discogs API
- Edge case: cached "not found" result → returns from cache
- Edge case: Discogs API returns 429 → endpoint returns `{ found: false, reason: "api_error" }`
- Edge case: Discogs API returns 503 → endpoint returns `{ found: false, reason: "api_error" }`

**Verification:**
- `GET /api/discogs/lookup/known_seller` returns `{ found: true }` with seller data
- `GET /api/discogs/lookup/nonexistent_user` returns `{ found: false }`
- Cache entries are created and honored on subsequent requests

---

### U3. Convert 404 page to Inertia with server-side Waitlist check

**Goal:** Replace the static ERB 404 with a dynamic Inertia/React page that checks the Waitlist synchronously and renders the appropriate initial state.

**Requirements:** R1, R3, R6

**Dependencies:** U1 (Waitlist normalization)

**Files:**
- Modify: `app/controllers/stores_controller.rb`
- Create: `app/frontend/pages/stores/invitation.tsx`
- Keep (for `featured` action only): `app/views/stores/no_stores.html.erb`

**Approach:**
- In `StoresController#show`, when `Store.with_discogs_username` returns nil, check `Waitlist.with_discogs_username(params[:slug]).exists?` before rendering
- New branch:
  - Waitlist exists → `render inertia: "stores/invitation", props: { waitlist_present: true, slug: params[:slug], discogs_username: params[:slug] }`
  - Waitlist absent → `render inertia: "stores/invitation", props: { waitlist_present: false, slug: params[:slug], discogs_username: params[:slug] }`
- New Inertia page component `app/frontend/pages/stores/invitation.tsx`:
  - Uses `MarketingLayout` for visual consistency with the apply page
  - Accepts props: `waitlist_present`, `slug`, `discogs_username`
  - **State A (waitlist_present = true):** Render acknowledgment copy — "This URL has been claimed — we'll notify the applicant when it's ready." No Discogs probe. Static, no client-side upgrade.
  - **State B (waitlist_present = false):** Render generic invitation immediately — loading indicator for probe. On mount:
    1. Run quality gate on slug
    2. If gate passes, fire async fetch to `/api/discogs/lookup/${slug}`
    3. If probe returns `found: true`, upgrade copy to personalized ("We found {slug} on Discogs! Claim this storefront") with CTA button
    4. If probe returns `found: false` or `api_error`, keep generic copy ("This URL is available. If you sell records on Discogs, claim it here.")
    5. If gate fails, keep generic copy — no fetch fires
- Preserve HTTP 200 status for all responses (including garbage-looking slugs — don't leak info via status codes)

**Patterns to follow:**
- `app/frontend/pages/apply.tsx` — MarketingLayout usage, framer-motion patterns, responsive layout
- `app/frontend/layouts/marketing_layout.tsx` — Layout wrapper with BrandMark and responsive shell
- `app/controllers/stores_controller.rb` — existing controller structure with `layout "inertia_application"`

**Test scenarios:**
- Happy path (F1): slug not in Store or Waitlist, probe finds seller → generic renders, upgrades to personalized CTA
- Happy path (F2): slug not in Store or Waitlist, probe finds nothing → generic persists
- Happy path (F3): slug in Waitlist → acknowledgment renders, no probe fires
- Edge case (F4): garbage slug fails quality gate → generic renders, no fetch fires
- Edge case: Waitlist exists but Store now also exists → should never reach this page (Store is checked first)
- Edge case: slug in Waitlist, probe would have found seller → probe skipped, acknowledgment shown (per spec)
- Edge case: probe API call fails (network error) → generic copy persists gracefully
- Edge case: Discogs API is rate-limited → probe returns api_error, generic copy persists
- Loading state: probe in-flight shows loading indicator, content upgrades smoothly when result arrives

**Verification:**
- Unknown slug renders Inertia page, not ERB
- Waitlist slug shows acknowledgment, no probe fires
- Non-Waitlist slug shows generic invitation, probe fires asynchronously
- Probe result upgrades UI correctly (found / not found / error)

---

### U4. Wire query-param propagation to apply form

**Goal:** When redirected from the 404 invitation page, the apply form pre-fills `discogs_username` from the query param.

**Requirements:** R4

**Dependencies:** U3

**Files:**
- Modify: `app/controllers/pages_controller.rb`
- Modify: `app/frontend/pages/apply.tsx`

**Approach:**
- In `PagesController#apply`, read `params[:discogs_username]` and pass it as an Inertia prop:
  ```ruby
  props.merge(initial_discogs_username: params[:discogs_username])
  ```
- In `apply.tsx`:
  - Accept new prop `initial_discogs_username` (string, optional)
  - Pass it as the initial value for `discogs_username` in the `useForm` call:
    ```tsx
    const { data, setData, post, processing } = useForm({
      discogs_username: initial_discogs_username || "",
      ...
    })
    ```
  - Keep the field editable — the pre-filled value is a suggestion, not a lock

**Patterns to follow:**
- `app/controllers/pages_controller.rb` — existing `apply` action passes `copy:`, `submitted:`, `turnstile:` props
- `app/frontend/pages/apply.tsx` — existing `useForm` initialization pattern

**Test scenarios:**
- Happy path: `/apply?discogs_username=lost-vinyl` → discogs_username field pre-filled with "lost-vinyl"
- Happy path: `/apply` (no params) → discogs_username field starts empty
- Edge case: user edits the pre-filled value before submitting → edited value is submitted
- Edge case: `discogs_username` param is empty string → field starts empty
- Integration: clicking "Claim this storefront" on invitation page → redirects to `/apply?discogs_username={slug}` → field pre-filled

**Verification:**
- Apply page reads query param and pre-fills the field
- Field remains editable
- Direct navigation to `/apply` works as before (no required param)

---

### U5. Add slug quality gate on the frontend

**Goal:** Prevent unnecessary Discogs API calls for non-username slugs (bots, garbage, reserved routes).

**Requirements:** R5

**Dependencies:** U3 (invitation page exists to add the gate to)

**Files:**
- Modify: `app/frontend/pages/stores/invitation.tsx`

**Approach:**
- Add a `useMemo` or utility function in the invitation component:
  ```tsx
  const isPlausibleUsername = useMemo(() => {
    if (!slug || slug.length < 3 || slug.length > 40) return false
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/.test(slug)) return false
    if (RESERVED_SLUGS.includes(slug.toLowerCase())) return false
    return true
  }, [slug])
  ```
- Define `RESERVED_SLUGS` list: routes that are already handled (`admin`, `apply`, `jobs`, `up`, `assets`, common bot paths)
- Only fire the Discogs probe fetch when `isPlausibleUsername` is true
- When false, keep the generic invitation — no fetch, no personalized upgrade attempt

**Patterns to follow:**
- Existing route handling in `config/routes.rb` for reserved routes reference

**Test scenarios:**
- Happy path: `lost-vinyl` (3 chars, alphanumeric + hyphen) → passes gate
- Edge case: `a` (1 char) → fails gate
- Edge case: `a-very-very-long-slug-that-is-over-forty-characters-long` → fails gate
- Edge case: `../../../etc` → fails gate (contains non-alphanumeric chars)
- Edge case: `wp-admin` → fails gate (reserved route)
- Edge case: `admin` → fails gate (reserved route)

**Verification:**
- Plausible usernames trigger the probe
- Garbage/bot/reserved slugs show generic invitation without a probe fetch

---

## System-Wide Impact

- **Interaction graph:** The `StoresController#show` action grows an additional query (`Waitlist.with_discogs_username`). This is a single `SELECT COUNT(*)` on a column with a unique index — negligible overhead. The new API endpoint (`/api/discogs/lookup/:username`) is a new interaction surface that touches the Discogs API via the existing client.
- **Error propagation:** If the Discogs API is down or rate-limited, the probe endpoint returns a graceful `{ found: false, reason: "api_error" }` response. The frontend handles this by keeping the generic invitation. No user-facing errors.
- **State lifecycle risks:** The Waitlist/Store cross-table race conditions (e.g., a slug becoming a Store between page render and probe) are documented as a pre-existing gap — the probe might return "found: true" for a slug that is now a Store. Acceptable for MVP since the claim redirect would result in a Waitlist duplicate-key error, which the form already handles gracefully.
- **API surface parity:** The existing `/apply` endpoint is unchanged — only its props contract grows an optional `initial_discogs_username` field. Backward compatible.
- **Integration coverage:** The key integration seam is the async probe flow (Inertia page → API endpoint → DiscogsClient → cache → UI upgrade). Unit tests for each layer combined with a system test covering the full F1 flow is the right balance.
- **Unchanged invariants:** The `featured` action at `/` keeps its current behavior. The existing apply form submission flow is unchanged. The Store model and StoreController's found-store path are unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Discogs API rate limit exhausted by probe traffic | Quality gate filters ~90% of bot/garbage traffic. Cache reduces duplicate calls. Per-IP rate limiting deferred but noted. |
| Race condition: slug becomes Store between render and probe | Low probability. If it happens, the "Claim" redirect leads to a duplicate-key error on the Waitlist — the form already handles validation errors gracefully. |
| Existing Waitlist entries with non-normalized discogs_username | Existing entries are NOT back-filled by U1. The scope `with_discogs_username` handles case-insensitive matching regardless of stored case. |
| Mobile layout regression | Invitation page uses existing `MarketingLayout` which already handles responsive breakpoints. Mobile-first design applies. |
| Browser JS disabled or slow | Generic invitation renders immediately server-side. The probe is an enhancement — the page is functional without JS. |

---

## Sources & References

- **Origin document:** `docs/brainstorms/2026-05-15-404-discogs-seller-invitation-requirements.md`
- Related code: `app/services/discogs_client.rb` — Discogs API client
- Related code: `app/models/store.rb` — Store model (normalization pattern to follow)
- Related code: `app/models/waitlist.rb` — Waitlist model (target for normalization)
- Related code: `app/controllers/stores_controller.rb` — stores controller (target for Inertia switch)
- Related code: `app/controllers/pages_controller.rb` — pages controller (target for query-param prop)
- Related code: `app/frontend/pages/apply.tsx` — apply form (target for pre-fill)
- Related code: `app/frontend/layouts/marketing_layout.tsx` — layout to use for invitation page
- Related docs: `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`
- Related docs: `docs/ideation/2026-05-14-vendor-facing-marketing-page-ideation.md`
