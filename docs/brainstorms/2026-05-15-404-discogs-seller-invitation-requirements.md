---
date: 2026-05-15
topic: 404-discogs-seller-invitation
---

# 404 Page → Discogs Seller Invitation

## Summary

Turn the 404/no-store-found page into a Discogs seller invitation flow: when a slug doesn't match a known store, detect whether the visitor is a Discogs seller — and if so, invite them to claim the URL with a personalized call-to-action and one-click redirect to a pre-filled apply form. Already-applied visitors see a simple acknowledgment instead of a dead end.

---

## Problem Frame

Every unclaimed `/:slug` is a missed conversion opportunity. Today, sellers who find their own store URL get "No stores in rotation yet" — a dead end that communicates nothing about the URL being available, or that the visitor is exactly the person who should claim it. Meanwhile, sellers who already applied and revisit their URL get the same blank wall, generating confusion and support friction.

The 404 page is the top-of-funnel for seller acquisition — every unclaimed slug visit is someone who typed a Discogs-adjacent URL. Treating all visits identically leaves a seller-detection and conversion path on the table.

---

## Actors

- A1. **Visitor (prospective seller)**: Arrives at `/:slug` that doesn't match any Store. May or may not be a Discogs seller. If they are, the page should recognize and invite them.
- A2. **Returning applicant**: A seller who has already submitted a Waitlist entry. Visits their slug again hoping to see progress — should see acknowledgment, not a dead 404.

---

## Key Flows

- F1. **First-time visitor — is a Discogs seller**
  - **Trigger:** Visitor hits `/:slug` that doesn't match a Store or Waitlist entry; their slug IS a real Discogs username
  - **Actors:** A1
  - **Steps:**
    1. Server renders the invitation page with generic copy + `discogs_username` prop (fast, no API call)
    2. Client-side JS fires Discogs username lookup via a lightweight endpoint
    3. Lookup succeeds → UI upgrades to personalized copy: "We found {slug} on Discogs — Claim this storefront"
    4. Visitor clicks "Claim this storefront" → redirected to `/apply?discogs_username={slug}`
    5. Apply form pre-fills the discogs_username field (editable) from the query param
  - **Outcome:** Visitor lands on apply form with their Discogs identity carried forward. Zero re-typing.
  - **Covered by:** R1, R2, R4, R5

- F2. **First-time visitor — not a Discogs seller**
  - **Trigger:** Visitor hits `/:slug` that doesn't match a Store or Waitlist entry; slug is NOT a real Discogs username
  - **Actors:** A1
  - **Steps:**
    1. Server renders the invitation page with generic copy
    2. Client-side Discogs lookup fires, returns 404
    3. Generic copy persists: "This URL is available. If you sell records on Discogs, claim it here."
    4. Visitor clicks CTA → redirected to `/apply` (no pre-fill)
    5. Or visitor leaves
  - **Outcome:** Generic invitation shown. No personalized upgrade.
  - **Covered by:** R1, R2, R5

- F3. **Returning applicant (already in Waitlist)**
  - **Trigger:** Visitor hits `/:slug` that doesn't match a Store, but matches a Waitlist entry with the same `discogs_username`
  - **Actors:** A2
  - **Steps:**
    1. Server checks Waitlist for `discogs_username = slug` synchronously
    2. Match found → render acknowledgment: "This URL has been claimed — we'll notify the applicant when it's ready."
    3. No Discogs lookup fires. No personalized CTA.
    4. No escalation path (no email display, no re-apply option)
  - **Outcome:** Returning applicant sees acknowledgment instead of a dead 404.
  - **Covered by:** R3, R6

---

## Requirements

**Page conversion (404 to Inertia)**
- R1. Convert the existing `no_stores` ERB template (used by `StoresController#show`) into an Inertia/React page component. The `featured` action at `/` retains its current `no_stores` ERB behavior unchanged.

**Discogs identity detection**
- R2. Add a lightweight, authenticated JSON endpoint that accepts a Discogs username and returns whether it corresponds to a real Discogs seller (using `DiscogsClient#seller_profile`). The 404 page fires this check asynchronously after rendering. If the lookup succeeds, the page upgrades from generic to personalized copy.

**Waitlist cross-reference**
- R3. In `StoresController#show`, before the 404 page renders, synchronously check the Waitlist table for an entry with `discogs_username = slug` (case-insensitive, normalized). If found, render acknowledgment copy instead of the invitation. No client-side Discogs lookup fires.

**Apply form pre-fill**
- R4. The `/apply` Inertia page must read `discogs_username` from URL query params on mount and pre-fill the `useForm` initial value. The field is editable — the pre-filled value is a suggestion, not a lock.

**Slug quality gate**
- R5. Before the async Discogs lookup fires, apply a lightweight client-side heuristic: skip the lookup for slugs that are clearly non-username (too short/long, contains path separators, reserved route names, typical bot patterns). API calls should only target plausible Discogs usernames.

**Already-applied acknowledgment**
- R6. When a Waitlist entry matches the slug, the page renders a simple acknowledgment: "This URL has been claimed — we'll notify the applicant when it's ready." No escalation path, no email exposure, no re-apply option. Must work within the mobile-first design system and adaptive screen size workflow.

---

## Acceptance Examples

- AE1. **Covers R2, R5.** A visitor hits `/lost-vinyl` where `lost-vinyl` IS a real Discogs seller. Server renders generic invitation immediately. Within ~1 second, client-side lookup confirms the seller → the page upgrades to "We found lost-vinyl on Discogs! Claim this storefront" with a button linking to `/apply?discogs_username=lost-vinyl`.
- AE2. **Covers R2, R5.** A visitor hits `/asdfgh1234` which is NOT a Discogs seller. Generic invitation renders. Client-side lookup returns no match. Generic copy persists.
- AE3. **Covers R1, R5.** A bot hits `/wp-admin`. Slug quality gate fires — slug is reserved / doesn't pass heuristic. No Discogs lookup fires. Generic or minimal 404 shown.
- AE4. **Covers R3, R6.** A returning applicant visits their slug. Server finds matching Waitlist entry. Page shows "This URL has been claimed — we'll notify the applicant when it's ready." No Discogs lookup fires.
- AE5. **Covers R4.** A visitor clicks "Claim this storefront" and lands on `/apply?discogs_username=lost-vinyl`. The discogs_username field is pre-filled with "lost-vinyl". The visitor can edit the value before submitting.
- AE6. **Covers R4.** A visitor navigates directly to `/apply` (no query params). The discogs_username field starts empty as it does today.

---

## Success Criteria

- Verified Discogs sellers see personalized copy and a direct path to apply with pre-filled identity.
- Returning applicants see acknowledgment instead of a dead 404 — no support friction.
- Generic visitors/bots get a lightweight invitation without unnecessary API calls.
- Apply form carries `discogs_username` from the slug through query params; field is editable.
- Discogs API rate limits are protected by the slug quality gate.
- The page adapts to all screen sizes per the existing marketing layout / mobile-first design system.

---

## Scope Boundaries

- No inline application form on the 404 page — always redirect to `/apply`.
- No post-apply preview or "coming soon" page at the slug URL.
- No referral tracking, UTM param plumbing beyond `discogs_username`.
- No fuzzy matching or "Did you mean?" slug suggestions.
- No Store creation from the 404 — waitlist entry only.
- No email or identity exposure in the "already applied" acknowledgment.
- The `featured` action at `/` keeps its current `no_stores` ERB behavior.

---

## Key Decisions

- **Async Discogs probe:** Client-side, after initial page render — keeps initial response fast regardless of API latency.
- **Redirect to apply form (not inline):** This avoids building a separate submission mechanism on the 404 page. Reuses the existing `/apply` flow.
- **Editable discogs_username field:** Pre-fill is a suggestion — some sellers may use a different username than their store URL.
- **Simple waitlist acknowledgment, no escalation:** Keeps scope tight; escalation adds auth and identity resolution complexity.
- **Mobile-first design:** All new components and pages must follow the existing marketing layout and adaptive screen size workflow.

---

## Dependencies / Assumptions

- `DiscogsClient#seller_profile(username)` continues to work with the existing Discogs API token. No new API keys needed.
- The Inertia.js infrastructure in the project is already wired for new pages (`layout "inertia_application"`, `render inertia:` calls).
- The apply form (`app/frontend/pages/apply.tsx`) can read `window.location.search` on mount. This is a local React-only change.
- Discogs API rate limit (~60 requests/minute for authenticated tokens) must not be exceeded. The slug quality gate is the primary defense; per-IP throttling can be added later if needed.
- Mobile-first design system and adaptive screen size workflow (viewport context, responsive breakpoints) are already established in the codebase and will be used for the new Inertia page.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R5][Needs research] Exact heuristic for the slug quality gate — what length range, which reserved paths, which character classes. Can be determined by examining existing bot traffic patterns.
- [Affects R1][Technical] Whether to create a new Inertia page component (e.g., `stores/invitation`) or modify the existing Inertia page structure. Depends on how the store show action branches.
