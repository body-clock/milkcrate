---
date: 2026-05-25
topic: home-page-redesign
---

# Home Page Redesign: Shopper-First Marketing Page with Self-Serve OAuth

## Summary

Redesign the Milkcrate home page with a shopper-first hierarchy: lead with a store browsing preview, reframe the hero to contrast with Discogs' search-grid weakness, and replace the waitlist CTA with a self-serve Discogs username + OAuth flow for sellers — keeping the existing `/apply` page as a secondary fallback path.

---

## Problem Frame

The current home page serves one audience (store owners) with one message ("your Discogs inventory, now a storefront"), but Milkcrate has two distinct audiences. Store browsers (shoppers) land on the page and see nothing inviting them to browse — the hero sells them on a product they don't need, and the actual crate preview is buried below the fold under seller-oriented messaging. Store owners find an application form (name, email, inventory size) that routes them through a waitlist, when the self-serve infrastructure to onboard immediately via Discogs OAuth already exists.

The page tries to sell the product instead of showing it. Leading with the experience — a live crate from a real store — serves both audiences: shoppers can browse immediately, and sellers can see exactly what they're signing up for before the onboarding CTA appears.

The old "onboarding one at a time" messaging is also stale. With self-serve OAuth already working (via the invitation page flow), the home page should be the primary entry point for a seller to claim their storefront directly.

---

## Actors

- A1. **Shopper**: A record buyer browsing Milkcrate. They want to discover stores and browse curated crates. No account needed.
- A2. **Discogs seller**: A record store with a Discogs inventory. They want a Milkcrate storefront for their existing listings.
- A3. **Discogs API**: Seller lookup and OAuth 1.0a identity. Already integrated.

---

## Key Flows

- F1. **Shopper browses the demo store**
  - **Trigger:** Shopper lands on the home page and scrolls to the storefront preview.
  - **Actors:** A1
  - **Steps:**
    1. Shopper sees a curated crate wall from Philadelphia Music (or the demo store).
    2. Shopper can flip through picks, see record details, and explore genre bins.
    3. Shopper clicks "See the full store →" to visit the store's Milkrated page.
  - **Outcome:** Shopper experiences Milkcrate's browsing experience without any account or commitment.
  - **Covered by:** R4

- F2. **Seller initiates self-serve OAuth onboarding**
  - **Trigger:** Seller scrolls to the seller section below the store preview and enters their Discogs username.
  - **Actors:** A2, A3
  - **Steps:**
    1. Seller enters their Discogs username in the inline input field.
    2. System probes Discogs API to verify the seller exists (reusing `DiscogsSellerLookup`).
    3. If found, a seller preview card appears showing the seller name and avatar.
    4. Seller clicks "Claim with Discogs" to start the OAuth flow.
    5. Seller authorizes on Discogs and is redirected back to Milkcrate.
    6. Store is created (if it doesn't exist), store owner is linked, CSV export sync is queued.
    7. Seller is redirected to their dashboard.
  - **Outcome:** A new storefront is created and a full inventory sync begins.
  - **Covered by:** R2, R3, R5, R6, R7, R8

- F3. **Seller uses waitlist fallback**
  - **Trigger:** Seller's Discogs username is not found, or they prefer not to use OAuth.
  - **Actors:** A2
  - **Steps:**
    1. From the seller section or a not-found error state, seller clicks "Apply via waitlist."
    2. Seller fills the existing multi-field form at `/apply`.
    3. Waitlist record is created for admin review.
  - **Outcome:** Seller enters the existing waitlist pipeline.
  - **Covered by:** R9

---

## Requirements

**Page structure**
- R1. The home page follows a shopper-first hierarchy, from top to bottom:
  1. Shopper hero (short, invites browsing)
  2. Storefront preview (crate wall from the demo store)
  3. Store character cards (kept as-is: Picks, Crates, Genre Bins, Pile)
  4. Seller OAuth section (Discogs username input + flow)
  5. How it works (updated steps referencing OAuth)
  6. Lean bottom section (short sign-off, no full CTA repetition)

- R2. The seller OAuth section replaces the former "Get your store on Milkcrate" button in the page flow. No "Get your store" button should appear in the hero or as the page's primary CTA.

**Hero**
- R3. The hero headline contrasts with the Discogs browsing experience. (Direction: "Browse Discogs like a record store, not an inventory." Final copy to be refined during implementation.)
- R4. The "See the demo →" button remains in the hero, and links to the demo store (Philadelphia Music or the current demo store slug). Its role shifts from "proof for sellers" to "entry point for shoppers."

**Storefront preview**
- R5. The existing crate wall preview (currently below the hero) is elevated to be the second section on the page — immediately below the hero — making it the primary content a visitor sees after the tagline.
- R6. The preview component, data source (`MarketingPreviewPresenter`), and props remain unchanged. The section's positioning in the page renders it after the hero instead of after the hero + character cards.

**Seller OAuth inline flow**
- R7. The section presents a Discogs username input field and a submit button (e.g., "Check availability").
- R8. On submit, the system performs a Discogs seller lookup using the existing `DiscogsSellerLookup` and `/api/discogs/lookup/:username` endpoint. While the lookup runs, show a loading state.
- R9. On successful lookup (seller found on Discogs), show a preview card with:

  - Seller name (from Discogs profile) and avatar
  - "Claim with Discogs" button that POSTs to `/{username}/authorize` (the existing OAuth initiation route)
- R10. On failed lookup (seller not found or Discogs API error), show an error state inline with:
  - "We couldn't find this username on Discogs" or similar
  - A fallback link to `/apply` for the waitlist path
- R11. If the submitted Discogs username already has a Milkcrate store or active waitlist application, the preview state should surface this clearly and link to the existing store or explain the pending application. (The existing `AuthorizeStoreService` and OAuth callback handle this gracefully — the preview state should surface it before the user reaches OAuth.)
- R12. The "Claim with Discogs" button reuses the existing `/:slug/authorize` route and `AuthorizeStoreService`, including the 500-minimum-listing quality gate. If the seller has too few listings, the OAuth initiation returns an error displayed to the user.

**How it works**
- R13. The three-step section is updated. Step 1 changes from "Share your Discogs" / "Tell us your Discogs username" to "Connect with Discogs" — referencing the OAuth flow. Steps 2 and 3 should be reviewed for copy alignment with the OAuth-first model.
- R14. The section's layout and visual treatment remain unchanged.

**Store character cards**
- R15. The four feature cards (Milkcrate Picks, Featured Crates, Genre Bins, Build Your Pile) remain in the page as-is, positioned between the store preview and the seller OAuth section.

**Bottom section**
- R16. The existing full-width final CTA section ("We're onboarding stores one at a time..." + "Get your store on Milkcrate" button) is removed. Replace with a lean bottom section: a short sign-off message with a subtle link back to the seller OAuth section or the `/apply` fallback.

**Copy and layout**
- R17. The existing `footnote` ("Early access. We handle the setup.") is removed from the hero. Relocate to the seller OAuth section if it still applies.
- R18. The page remains responsive and functions on mobile (the input + preview must work in single-column layout).
- R19. No new Turnstile or additional CAPTCHA is added to the home page. Bot protection relies on the Discogs API lookup (rate-limited and cached by `DiscogsSellerLookup`) and the Discogs OAuth human-authorization step.

---

## Acceptance Examples

- AE1. **Covers R1, R3, R4, R5.** Given a shopper lands on milkcrate.com, when the page loads, the hero shows a short tagline contrasting with Discogs and a "See the demo →" button. Below the hero, the first full section is the crate wall preview from Philadelphia Music (no "Get your store" button appears above the preview).
- AE2. **Covers R7, R8, R9.** Given a seller scrolls to the seller OAuth section and enters a valid Discogs username, when they click "Check availability," the system shows a loading state, then a preview card with the seller name and avatar, and a "Claim with Discogs" button.
- AE3. **Covers R10.** Given a seller enters a Discogs username that does not exist on Discogs, when they submit, the system shows an inline error message and a link to `/apply`.
- AE4. **Covers R11.** Given a seller enters a Discogs username that already has an active Milkcrate store, when they submit, the system shows a clear state indicating the store already exists.
- AE5. **Covers R2.** Given a visitor scrolls through the entire home page, no "Get your store on Milkcrate" button appears as a primary CTA anywhere in the page.
- AE6. **Covers R16.** Given a visitor scrolls to the bottom of the page, the old full final CTA section ("We're onboarding one at a time...") is absent. A lean bottom section appears instead.

---

## Success Criteria

- A shopper can land on the home page and start browsing a store's curated crates without scrolling past seller-oriented messaging.
- A Discogs seller can onboard from the home page in under 30 seconds (enter username → verify → OAuth), without filling a multi-field form or waiting for admin approval.
- The `/apply` waitlist page remains accessible and functional as a fallback, with no regressions.
- The existing OAuth flow (authorization, callback, store creation, sync queueing) works identically from the new home page entry point as it does from the invitation page.
- Planning has a clear, prioritized set of changes to implement across frontend (home page component, copy) and backend (if any new behavior is needed beyond reusing existing routes).

---

## Scope Boundaries

- No changes to the `/apply` page itself (stays as-is with Turnstile, multi-field form, waitlist submission).
- No changes to the admin dashboard, admin onboarding flow, or applicant review workflow.
- No changes to the OAuth callback handler (`AuthCallbackService`), store creation logic, or sync infrastructure.
- No changes to the invitation page (unclaimed slug experience at `/{slug}`).
- No store directory or discovery surface product — the page remains a marketing page with a preview, not a full storefront directory.
- No new models, database tables, or API endpoints. Reuses `/:slug/authorize`, `AuthCallbackService`, `DiscogsSellerLookup`, and `/api/discogs/lookup/:username`.
- No new Turnstile or CAPTCHA integration on the home page.
- No changes to `MarketingPreviewPresenter` or the crate preview data infrastructure.

---

## Key Decisions

- **Shopper-first hierarchy over seller-first:** Leading with the browsing experience serves both audiences better — shoppers browse immediately, sellers see proof before the CTA.
- **Inline OAuth over separate landing page:** The Discogs username input + preview lives on the home page itself rather than a dedicated `/onboard` page, minimizing friction for the seller path.
- **Verify-before-OAuth over one-click redirect:** Previewing the seller's identity before redirecting to Discogs prevents confusion from invalid usernames and mirrors the invitation page pattern the product already validates.
- **Waitlist/apply as secondary path:** Self-serve OAuth is the primary onboarding path, but the waitlist remains for sellers who can't or won't use OAuth (e.g., Discogs API issues, no access to the Discogs account, etc.).
- **Bot protection via Discogs gates:** The Discogs API lookup (properly rate-limited and cached) and the OAuth human-authorization step on Discogs's site provide stronger anti-abuse protection than a Turnstile widget would on the home page.

---

## Dependencies / Assumptions

- The existing `/:slug/authorize` route, `AuthorizeStoreService`, and `AuthCallbackService` work correctly for self-serve onboarding where the store does not yet exist — this has been validated via the invitation page flow.
- The existing `DiscogsSellerLookup` cache (1-hour TTL for found, 24-hour for not-found) provides adequate rate limiting and performance for the home page lookup.
- The existing `MarketingPreviewPresenter` already provides the crate preview data needed for the elevated storefront preview section.
- The existing `"See the demo →"` link target (currently `/philadelphiamusic` or the demo store slug) is the correct destination for the shopper browsing experience.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R7, R8, R9][Design] What is the exact copy for the Discogs username input label, submit button, preview card, error states, and the seller OAuth section heading?
- [Affects R3][Design] What is the final hero copy and subhead? Direction: "Browse Discogs like a record store, not an inventory." Refine during implementation.
- [Affects R16][Design] What is the exact content of the lean bottom section — short sign-off copy and link destination?
- [Affects R13][Design] What are the updated copy and titles for how-it-works steps 2 and 3?
- [Affects R5][Technical] Where in the home page component does the crate preview section need to move to — verify the exact JSX reordering in `home.tsx`.
- [Affects R3][Technical] What happens to the `footnote` and `cta_apply` translation keys — removed or repurposed?
- [Affects R11][Needs research] Does the current `DiscogsSellerLookup` or `AuthorizeStoreService` already check if the username has an active store or waitlist record, or does this need a new check? Verify against `StoreOnboardingChecks` and `AuthCallbackService`.
