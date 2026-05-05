# Milkcrate Storefront Curation

This context defines how a store page is curated and presented so discovery feels intentional, deterministic, and testable.

## Language

**Picks Wall**:
The top storefront section showing Milkcrate Picks as the primary daily discovery surface.
_Avoid_: picks strip, top crate row

**Featured Crates**:
Two curated desktop crates shown between the Picks Wall and the Genre Grid: New Arrivals plus one rotating thematic crate.
_Avoid_: promo cards, middle cards

**Genre Grid**:
The lower storefront section containing the remaining genre crates in a controlled equal-height card layout.
_Avoid_: masonry leftovers, misc crates

**New Arrivals Crate**:
A featured crate populated from recently listed records using a dynamic freshness window.
_Avoid_: latest bin, recent-only list

**Thematic Crate**:
A featured crate selected by deterministic daily theme rotation over rule-based criteria.
_Avoid_: random crate, ad-hoc crate

**Featured Rotation**:
Date-seeded, deterministic daily theme selection using app server day boundaries.
_Avoid_: randomization, manual daily pick

**Visibility Contract**:
The explicit payload ordering contract: Picks Wall, then Featured Crates, then Genre Grid.
_Avoid_: inferred UI order, frontend-derived sections

## Relationships

- The **Picks Wall** always renders before **Featured Crates**
- **Featured Crates** contain exactly two crates: **New Arrivals Crate** and **Thematic Crate**
- The **Genre Grid** renders after **Featured Crates** and excludes records already shown in higher sections
- **Featured Rotation** determines the current **Thematic Crate**
- The **Visibility Contract** governs backend-to-frontend section ordering

## Example dialogue

> **Dev:** "If a record appears in the Picks Wall, can it also appear in Featured Crates?"
> **Domain expert:** "No, dedupe flows top-down: Picks Wall, then Featured Crates, then Genre Grid."

## Flagged ambiguities

- "crate" was previously overloaded to mean both navigable browse crates and featured editorial crates; resolved by separating **Featured Crates** from **Genre Grid** in the **Visibility Contract**.
