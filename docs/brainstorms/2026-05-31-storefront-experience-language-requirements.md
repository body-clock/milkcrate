---
date: 2026-05-31
topic: storefront-experience-language
reconstructed: true
---

# Storefront Experience Language Requirements

## Summary

Milkcrate needs one product model for the shopper-facing storefront: store,
wall, crate, record, pile, and Discogs handoff are connected moments in the
same browsing session. This language should guide product copy, design
hierarchy, accessibility labels, and future UI issues without forcing backend,
service, or Discogs integration renames.

This document was reconstructed from the preserved issue bodies for #215,
#216, and #217 after the original untracked brainstorm artifact was removed.

---

## Problem Frame

The product already has strong backend and integration confidence around seller
inventory, shopper piles, OAuth, Wantlist handoff, and listing links. The
current confidence gap is frontend cohesion: shoppers should feel as if they
entered one record store session, not a set of separate page tools.

The language model should make that session legible. Store, wall, crate,
record, pile, and handoff are the nouns that clarify the loop. "Register" is
not a primary shopper-facing noun because Milkcrate does not provide checkout.

---

## Core Vocabulary

- **Store:** The owned storefront context. It orients the shopper to the
  seller, tone, current browsing surfaces, and available handoff.
- **Wall:** The curated Milkcrate Picks surface. It behaves like a store wall:
  a quick read on taste and a distinct entry into browsing.
- **Crate:** The immersive browsing mode. It is the center of the product loop
  and should not collapse into a generic menu or filter set.
- **Record:** The inspection unit. It carries cover, artist, title, price,
  notes, and the decision to keep browsing or add to the pile.
- **Pile:** The persistent shopper-intent layer. It collects records without
  claiming reservation, cart behavior, or checkout.
- **Handoff:** The moment Milkcrate sends intent to Discogs. Product copy can
  call this a handoff, while integration code should keep precise Discogs names
  such as OAuth, Wantlist, listing, release, and seller.

---

## Requirements

- R1. Shopper-facing copy uses store, wall, crate, record, pile, and handoff
  where those nouns clarify the browsing loop.
- R2. The app does not use "register" as a primary shopper-facing noun because
  Milkcrate does not provide checkout.
- R3. Store floor, crate browsing, record inspection, pile review, and Discogs
  handoff feel like connected moments in one storefront session.
- R4. Transitions preserve context and shopper intent when entering a crate,
  inspecting a record, adding to the pile, opening the pile, returning to
  browse, or leaving for Discogs.
- R5. Mobile-first means the compact sequence defines the product hierarchy,
  not that mobile is the only designed environment.
- R6. Desktop and larger layouts adapt outward by revealing context, previews,
  and parallel inspection while preserving the same loop, vocabulary, and
  state model.
- R7. Frontend confidence is evaluated at the system level across hierarchy,
  copy, motion, affordance, responsive adaptation, and accessibility before
  isolated component polish drives the roadmap.
- R8. Presentation code may use tactile product language, but Discogs
  integration code keeps precise external-system names.
- R9. Changes prefer targeted hierarchy docs, copy, aria-label, and test
  updates before broader component or data-model renames.
- R10. Each follow-up issue is independently shippable and testable.

---

## Acceptance Examples

- AE1. Canonical product and design docs explain store, wall, crate, record,
  pile, handoff, and the decision not to use register as a primary shopper
  noun.
- AE2. A frontend audit can evaluate the whole store loop at compact and larger
  breakpoints without reopening stable backend OAuth, Wantlist, seller filter,
  or listing-link behavior.
- AE3. A hierarchy spec can explain how StoreFloor, CrateView, RecordCard,
  PileSheet, and AppLayout fit together on mobile, then adapt outward on larger
  layouts without changing the product loop.
- AE4. Follow-up UI work is prioritized by storefront continuity rather than by
  easiest component edits.

---

## Scope Boundaries

- No backend, service object, OAuth, Wantlist, seller filter, or Discogs API
  rename is implied.
- No immediate visual redesign is required by this vocabulary work.
- No checkout, cart, reservation, or purchase-completion claim is introduced.
- No desktop-only or mobile-only hierarchy is introduced; compact hierarchy is
  the source sequence and larger screens adapt from it.

---

## Issue Decomposition

- #215 documents the unified storefront experience model in canonical
  product/design docs.
- #216 audits the shopper-facing frontend as one unified storefront system.
- #217 defines the mobile-first adaptive store page hierarchy and surface
  relationships.
