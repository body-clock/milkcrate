---
title: "Storefront Header and Pile Responsive Design"
date: 2026-05-25
status: approved-design
scope: public-shopper-surfaces
---

# Storefront Header and Pile Responsive Design

## Summary

Redesign Milkcrate's buyer-facing headers and pile workflow around one rule:
persistent chrome communicates the shopper's current location and the one
active task they have created. Before a shopper selects a record, the mobile
store header exists only for orientation. After a shopper adds a record, the
pile becomes a persistent action. Discogs connection and task-facing account
status move out of global navigation and into the pile handoff where they have
an immediate purpose. A quiet connected-account disconnect control remains in
the store footer so revocation never depends on building a pile.

Mobile receives the strongest change: public headers become brand-only, crate
browsing replaces the store-floor header with crate context, and a non-empty
pile opens as a full-screen accessible workflow. Desktop remains roomier and
less disruptive: it preserves store identity during crate browsing, keeps the
theme toggle, and continues to use a side drawer for the pile.

Accessibility and mobile usability are release criteria for this work. The
target is WCAG 2.2 AA, with a stricter product design goal of at least 44 CSS
pixels for primary compact touch controls.

## Problem Frame

The current header grew from several separate product decisions:

- Storefront identity is shown in `AppLayout`.
- Shopper Discogs OAuth introduced an always-present Discogs icon in the
  store header.
- The pile appears in the header only after the first item is added.
- The theme toggle remains visible in the most space-constrained browsing
  surface.
- Crate browsing renders its own compact crate header below the persistent
  store header.

Those decisions no longer produce a coherent mobile hierarchy. The Discogs
control appears before a shopper has a handoff task; its connected-account
menu depends on mouse hover for discovery. The compact crate experience spends
vertical space on two orientation layers. The bottom-sheet pile must carry
record review, total, authentication, truthful Wantlist disclosure, progress,
and outcome states in an overlay capped at `85vh`.

This is not a proposal to make checkout dominate Milkcrate. The product purpose
is browsing and discovery. The design makes the pile visible only after the
shopper has formed intent, then makes completing that intent clear and usable.

## Current-State Review

### What Is Working

- `MilkcrateShell` already provides a thin, reusable structural boundary for
  skip navigation, header placement, main content, and footer.
- `ViewportProvider` and named `compact`, `comfy`, and `wide` tiers establish
  the right responsive vocabulary.
- Pile state is already owned above store browsing content and persists in the
  browser.
- `PileSheet` already has dialog labeling, Escape close behavior, and focus
  restoration scaffolding.
- Crate view already has a strong compact context treatment: back action,
  active crate name, record count, and crate tabs.
- The seller-scoped Wantlist handoff now uses honest language and preserves
  Discogs as the marketplace destination.

### What Needs To Change

| Current behavior | Problem | Design response |
|---|---|---|
| `AppLayout` always renders `DiscogsAuthIcon` on store pages | Authentication competes with identity before it is relevant | Remove from persistent header; prompt connection and show task-facing status within a non-empty pile |
| Connected Discogs disconnect is exposed inside a hover tooltip | Touch users cannot reliably discover or operate account management, and revocation must not require a pile | Provide tappable and keyboard-accessible disconnect controls in the pile when populated and a quiet connected-only store footer control |
| Compact header includes theme switching at all times | Appearance configuration consumes primary mobile browsing space | Remove compact theme controls; retain desktop theme control |
| Compact crate view renders beneath the global store header | Stacked orientation chrome reduces space for record riffle browsing | Replace the compact store header with crate context while inside a crate |
| Compact pile is an `85vh` bottom sheet | Handoff states and record review compete for constrained space | Make a non-empty compact pile a full-screen modal workflow |
| Prior mobile navigation concept proposed permanent bottom tabs | It promotes navigation chrome over curated browsing and predates the focused handoff flow | Keep the store floor as continuous scroll; do not add bottom navigation |

Relevant implementation surfaces:

- `app/frontend/layouts/app_layout.tsx`
- `app/frontend/layouts/marketing_layout.tsx`
- `app/frontend/layouts/milkcrate_shell.tsx`
- `app/frontend/pages/stores/show.tsx`
- `app/frontend/components/crate_view.tsx`
- `app/frontend/components/pile_sheet.tsx`
- `app/frontend/components/discogs_auth_icon.tsx`

## Design Principles

1. **Orient first.** Before purchase intent exists, compact chrome identifies
   where the shopper is; it does not advertise account setup or utility
   controls.
2. **Persist active intent.** Once the shopper adds a record, `Pile (n)` is
   the one persistent action across the active store browsing flow.
3. **Authenticate at payoff.** Discogs connection is requested in the pile,
   immediately alongside the handoff it enables; existing connections can
   still be revoked from a quiet footer control without creating a task.
4. **Let mobile be focused.** A compact crate is the current browsing place,
   not content beneath a second global store bar. A compact pile is a
   full-screen task, not a crowded partial drawer.
5. **Expand rather than duplicate on desktop.** Desktop keeps the enclosing
   store identity and a theme convenience while crate and pile content occupy
   their own regions.
6. **Accessible by contract.** Responsive changes must preserve keyboard,
   screen-reader, motor-access, reduced-motion, and focus-management needs.

## Actors And Jobs

- **Shopper browsing a public entry page:** understands the Milkcrate identity
  without being forced into a buyer-versus-seller global action decision.
- **Shopper browsing a store floor:** recognizes whose store they are in and
  explores the curated surface.
- **Shopper browsing a crate:** stays oriented within a crate while using the
  record-riffle interaction.
- **Shopper with a pile:** returns to selected records, reviews cost, and
  chooses whether to continue through Discogs.
- **Connected shopper:** can complete the seller-scoped Wantlist handoff or
  disconnect without relying on hover interaction.

## Header Contract

The header is a context-specific presentation contract, not a universal action
list.

| Context | Compact / Mobile Header | Desktop Header |
|---|---|---|
| Home, Apply, Invitation | Milkcrate brand only | Preserve current public utility model for this scope: brand, `Demo`, `Apply`, theme |
| Store floor, empty pile | Store name with quiet Milkcrate attribution; connected-only disconnect available in footer | Store name / attribution and theme toggle; connected-only disconnect available in footer |
| Store floor, non-empty pile | Store name and prominent `Pile (n)` action | Store name / attribution, `Pile (n)`, theme toggle |
| Crate view, empty pile | `Back to store`, crate name, record count | Persistent store header; crate context remains in content |
| Crate view, non-empty pile | `Back to store`, crate name/count, `Pile (n)` | Persistent store header with `Pile (n)`; crate context remains in content |
| Pile open | Full-screen pile header replaces browsing chrome | Drawer title/count and close control over the visible store context |
| Store footer, connected shopper | Quiet account status and `Disconnect` escape hatch | Quiet account status and `Disconnect` escape hatch |

### Header Rules

- No persistent Discogs connect, status, or disconnect control exists in any
  storefront header. The connected-only footer disconnect escape hatch is not
  a header action and never invites connection.
- No compact theme toggle exists in public or store browsing headers.
- Public compact pages do not resolve the homepage's unresolved
  buyer-versus-seller positioning in navigation; their content retains
  responsibility for calls to action.
- `Pile (n)` is not shown for an empty pile. It appears as soon as the first
  item is added and does not take focus when it appears.
- Compact crate view uses exactly one sticky header. Crate name and count move
  into that header instead of repeating in page content.
- Desktop intentionally differs from compact: store identity remains visible
  while a crate is open because it does not meaningfully crowd the work area.

## Primary Flows

### Browse Before Selection

1. A mobile shopper enters a store.
2. The header identifies the store with quiet Milkcrate attribution.
3. The shopper scrolls the curated floor or enters a crate.
4. No pile, theme, or Discogs account control competes with browsing before an
   item has been selected.

### Add The First Record

1. The shopper taps `+ Pile` from record detail context.
2. The record enters local pile state using existing behavior.
3. `Pile (1)` appears in the applicable store or crate header.
4. Focus remains in the current browsing context; the shopper may continue
   digging or open the pile.

### Disconnect Without A Pile

1. A previously connected shopper visits a store with an empty pile.
2. The header remains orienting only and does not advertise authentication.
3. The footer quietly identifies the connected Discogs account and exposes a
   keyboard- and touch-operable `Disconnect` control.
4. Disconnecting clears connection state without requiring the shopper to add
   a record or open a nonexistent pile task.

### Browse A Crate On Mobile

1. The shopper enters a crate.
2. The store-floor mobile header is replaced by a sticky crate header.
3. The crate header provides `Back to store`, crate title, record count, and
   `Pile (n)` only when applicable.
4. Crate tabs and record riffle content render beneath one header, preserving
   maximum vertical space.

### Review And Hand Off A Pile On Mobile

1. The shopper activates `Pile (n)`.
2. A full-screen modal pile surface opens without losing the underlying floor
   or crate position.
3. The shopper reviews selected records, removes records if needed, and sees
   the total.
4. If disconnected and handoff is available, the surface explains why Discogs
   connection is needed and presents `Connect with Discogs`.
5. If connected, it displays the connected account and a secondary
   `Disconnect` control, explains the Wantlist behavior, and presents
   `Send to Discogs Wantlist`.
6. Progress, success, and failure are displayed in place; successful handoff
   may offer the existing `Shop My Wants` destination.
7. Closing returns the shopper to the same browsing context and restores focus
   to the originating pile trigger where it remains present.

### Remove The Last Record

1. The shopper removes the final item while the pile is open.
2. The open workflow displays its empty state; it does not disappear
   unexpectedly.
3. On close, no `Pile (n)` trigger remains in the browsing header.
4. If focus cannot return to the removed trigger, focus moves to a logical
   contextual control, such as `Back to store` in crate view or the store
   identity/navigation start on the floor.

## Pile Workflow Design

The pile remains saved shopper intent rather than a cart. It does not promise
exact checkout completion, reservation, or transfer of exact listing state
through Discogs Wantlist.

### Compact Container

- Full viewport modal workflow, replacing the current partial bottom sheet for
  a non-empty pile.
- Respects safe area insets at the top and bottom.
- Has a fixed workflow header and an independently scrollable review list so
  the handoff action remains understandable on short screens.
- Preserves the underlying page and its navigation state while open.

### Desktop Container

- Retains the right-side drawer model.
- Uses the same information hierarchy, disclosure language, connection
  controls, and state behavior as compact.
- Leaves visible store/crate context useful for comparing a pile against
  browsing content.

### Content Hierarchy

1. Header: close/back control, `Your pile`, record count, and guarded clear
   action.
2. Record review list: artwork, title, artist, price, remove action, and
   optional exact-listing Discogs link.
3. Total.
4. Discogs handoff explanation and action, based on state.

### Handoff States

| State | Presentation |
|---|---|
| No records | Empty-pile explanation; no handoff or connection prompt; persistent revocation remains available through the store footer while connected |
| Records, handoff unavailable | Review and total remain usable; no unsupported handoff promise |
| Records, handoff available, disconnected | Explain connection as required for Wantlist/store shopping; primary `Connect with Discogs` |
| Records, handoff available, connected | Display account status and secondary `Disconnect`; disclose Wantlist behavior; primary `Send to Discogs Wantlist` |
| Creating | Non-destructive progress message and disabled duplicate submission |
| Success | Truthful added/skipped outcome and `Shop My Wants` link when returned by the existing flow |
| Error | Error message and retry/reset path without losing the pile |

## Accessibility And Mobile Usability Requirements

The release target is **WCAG 2.2 AA**. WCAG 2.2 is used rather than 2.1
because it adds Level AA Success Criterion 2.5.8, Target Size (Minimum), which
is directly applicable to compact header and pile controls. Primary compact
controls use a product target of at least **44 by 44 CSS pixels**, exceeding
the AA minimum of 24 by 24 CSS pixels.

### Header And Controls

- Pile triggers, compact back/close controls, record removal actions, connect,
  disconnect (including the footer escape hatch), and handoff actions have at
  least 44 CSS pixel touch targets.
- Compact header layouts remain operable at narrow phone widths and under text
  scaling. A visually truncated title remains fully available to assistive
  technology through its semantic label or accessible name.
- No functionality is exposed only by hover, color, or an unlabeled icon.
- All interactive states have visible keyboard focus treatment.
- The new `Pile (n)` action includes its count in its accessible name and is
  not automatically focused or announced as an interruption after record add.

### Modal Pile Behavior

- The compact full-screen pile and desktop drawer behave as modal dialogs when
  open: background content is visually obscured and inert to interaction.
- Focus moves into the pile on open. Because the content includes a structured
  record list and several states, initial focus should land on the visible
  pile title or another static start element with `tabIndex={-1}`, rather than
  skipping into a later action.
- `Tab` and `Shift+Tab` remain inside the open pile workflow.
- A visible close control is always present; `Escape` closes the pile.
- Closing restores focus to the invoking pile trigger when it still exists, or
  to a logical nearby context control when removing the final record removes
  that trigger.
- A dialog must only expose `aria-modal="true"` when the implementation truly
  prevents interaction with content outside it.

### Announcements And Motion

- Progress, success, and error transitions use appropriately scoped live
  announcements; static record lists are not repeatedly re-announced.
- Count changes and handoff states remain understandable without relying on
  color alone.
- Full-screen/drawer transitions honor the existing reduced-motion context;
  no required orientation or state communication relies on movement.

## Responsive Design Rules

- Use the existing viewport tiers: `compact`, `comfy`, and `wide`. Do not add
  parallel breakpoint vocabulary.
- Compact headers minimize controls and replace context when entering a crate.
- Comfy and wide storefront views follow the desktop store-header model unless
  implementation validation shows a concrete tablet crowding issue.
- Do not add a fixed bottom tab bar, persistent section-navigation control, or
  header scroll-hide behavior in this work.
- The store floor remains continuous curated scroll. Its content design, crate
  composition, and selection mechanics remain unchanged.

## Component And Ownership Design

### `MilkcrateShell`

Remain a structural component only. It owns skip navigation, header region,
optional after-header notices, main content wrapper, and optional footer. It
must not inspect pile, shopper, viewport-page context, or crate selection.

### `MarketingLayout`

Own public header policy:

- Compact: Milkcrate brand only.
- Non-compact: preserve current `Demo`, `Apply`, and theme utility behavior
  during this scoped change.

No homepage hero or audience-positioning change is included.

### `AppLayout`

Continue to own storefront provider composition, pile open state, and desktop
store-level header. Its updated contract:

- Remove persistent `DiscogsAuthIcon`.
- Hide theme action on compact tiers and retain it on non-compact tiers.
- Render `Pile (n)` only when records exist.
- Extend the existing store footer only for an already connected shopper with
  quiet status and a `Disconnect` control; do not expose connection from the
  footer.
- Accept or consume compact storefront location composition supplied from the
  store page, rather than deducing crate state from paths.

### `StoreShow` And Crate Context

`StoreShow` already owns active floor-versus-crate state and back behavior. It
should provide the compact header context for `AppLayout` through a narrow
presentation API or context:

- Floor: store identity is rendered as the compact context.
- Crate: back action and active crate name/count become compact header content.

The implementation should not duplicate route inference or shift browsing
state ownership into the layout.

### `CrateView`

- Preserve tabs, riffle navigation, record stack, detail rendering, and
  `hideTabs` behavior.
- Remove duplicated compact identity/header presentation after that context is
  supplied to the sticky app header.
- Retain the in-content desktop crate header beneath the persistent desktop
  store header.
- Include responsive guard-parity tests so `hideTabs` remains respected on
  every affected branch.

### `PileSheet`

Remain the pile workflow surface, with responsive container differences:

- Compact: full-screen modal.
- Non-compact: right-side modal drawer.

Move Discogs connection initiation and task-facing connected status into this
component or a closely owned pile-specific child. Continue consuming current
pile and shopper contexts and existing backend props/endpoint. Reuse the same
disconnect operation for the footer escape hatch so account revocation is not
duplicated behavior.

### Rails And Service Layers

No Rails controller, model, service, route, or Discogs API change is required
by this design. Existing `store.handoff_available`, `shopper`, pile endpoint,
and Wantlist service behavior provide the data and operation required for the
new presentation.

If implementation uncovers a missing state, any backend adjustment must remain
separately justified and preserve the current seller-scoped, honest-handoff
contract.

## Acceptance Criteria

### Public Header

- At `compact`, home, apply, and invitation pages render a Milkcrate brand
  header without `Demo`, `Apply`, or theme actions.
- At non-compact tiers, those pages retain the current public utility header
  behavior for this scope.

### Store Header

- At `compact`, store-floor state with an empty pile renders store identity
  without theme, Discogs, or empty-pile controls.
- Adding the first record adds a prominent, keyboard-operable `Pile (1)`
  control without moving focus away from the current record task.
- At non-compact tiers, store headers render store identity and theme; a pile
  trigger renders only when populated; Discogs auth never renders there.
- When a shopper is already connected, the store footer provides a quiet,
  keyboard- and touch-operable status/disconnect control even with an empty
  pile; disconnected shoppers are not prompted to connect there.

### Crate Header

- At `compact`, entering a crate presents one sticky context header containing
  back navigation, active crate title/count, and populated pile action when
  relevant.
- Compact crate content does not duplicate that identity header beneath the
  sticky chrome.
- At non-compact tiers, the persistent store header remains visible and crate
  identity remains in the content header.
- Existing tab selection, record navigation, and `hideTabs` contracts remain
  functional on compact and non-compact branches.

### Pile Workflow

- A non-empty pile opens full-screen at `compact` and in a side drawer at
  non-compact tiers.
- The workflow displays selected records, total, remove and clear behavior,
  and relevant exact-listing links without changing pile persistence.
- Disconnected shoppers connect from the pile, not global header or footer.
- Connected shoppers can view their Discogs status and disconnect from the
  pile using touch and keyboard interaction.
- Connected shoppers can also disconnect through the footer when there is no
  active pile workflow.
- Existing Wantlist creating, success, failure, and seller-scoped destination
  behavior remains truthful and functional.
- Removing the last record keeps the currently open pile stable as an empty
  state and removes its persistent trigger after close.

### Accessibility

- Modal open moves focus into the pile; its focus cycle is contained; Escape
  and visible close controls dismiss it; close restores logical focus.
- Background browsing content is inert while the pile is declared modal.
- Relevant compact controls meet the 44 CSS pixel product target and at least
  WCAG 2.2 AA requirements.
- Connection, disconnect, and handoff actions never depend on hover-only
  interaction.
- Progress, result, and error feedback is announced appropriately.
- Reduced-motion users can complete the entire workflow without information
  depending on animation.

## Testing And Verification

### Automated Coverage

- Component tests for compact and non-compact `MarketingLayout` header
  variants.
- Store/page tests for floor-versus-crate mobile header context and populated
  versus empty pile behavior.
- `CrateView` tests for removal of duplicated compact header content and
  responsive guard parity around tabs and empty states.
- `PileSheet` tests for compact full-screen container and desktop drawer
  container, each across disconnected, connected, creating, success, error,
  populated, and emptied states.
- Store footer tests for connected-only account status/disconnect visibility,
  including an empty-pile state and absence when disconnected.
- Accessibility tests for dialog label, focus entry, focus containment, focus
  return/fallback, Escape close, inert background, keyboard-operable
  disconnect, live feedback, and visible close access.
- Existing tests around pile persistence, record actions, seller-scoped
  Wantlist request behavior, exact Discogs links, and responsive rendering must
  remain green.

### Visual And Device Checks

- Inspect compact floor, compact crate, and compact full-screen pile at narrow
  widths, with a long store name and long crate name.
- Verify safe-area behavior on a mobile-sized viewport and on an actual target
  device when available.
- Verify touch access to pile open, item remove, connect, disconnect, close,
  and handoff actions.
- Inspect desktop store, crate, and drawer compositions for retained context
  and non-crowded actions.
- Check dark and light desktop modes and the effective saved/system compact
  mode now that compact switching is not shown in header chrome.
- Check reduced-motion presentation for pile opening and handoff state
  transitions.

## Scope Boundaries

Included:

- Buyer-facing public header consistency for home, apply, and invitation.
- Store-floor and crate-view header behavior across responsive tiers.
- Pile trigger visibility and presentation.
- Compact full-screen pile and desktop pile content alignment.
- Relocation of Discogs connection and task-facing status/disconnect UI into
  the pile workflow, plus connected-only footer revocation access.
- Accessibility and mobile usability verification for changed behavior.

Excluded:

- Resolving homepage buyer-versus-seller positioning or rewriting its hero.
- Redesigning the owner dashboard header.
- Redesigning floor sections, crate cards, record riffle mechanics, or
  recommendation/curation logic.
- Changing Discogs Wantlist strategy, API behavior, seller-scoped destination,
  feature-gate decisions, or commercial permission requirements.
- Adding mobile bottom navigation, section jump navigation, or header
  scroll-hide behavior.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Mobile header state ownership duplicates crate state or causes stale titles | Pass narrow presentational context from `StoreShow`, which already owns active crate state |
| Removing global Discogs status reduces reassurance or strands account revocation when the pile is empty | Display clear connected status within the pile immediately before it affects the handoff and retain a quiet connected-only footer disconnect path |
| Full-screen pile is marked modal but background remains operable | Require inert/background isolation and focus-containment verification before completion |
| Last-item removal eliminates the focus return target | Define logical fallback focus behavior and test it |
| Responsive refactor drops `hideTabs` or empty-state guards | Apply established guard-parity tests on every affected viewport branch |
| Removing compact theme control surprises users | Preserve saved/system appearance behavior; keep desktop control in scope; revisit secondary settings only if usage evidence requires it |

## Documentation Basis

Local evidence:

- `STRATEGY.md` identifies buyers as primary and outbound Discogs handoff plus
  pile addition as core product signals.
- `docs/product.md` defines browsing-first, tactile, store-character product
  principles.
- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
  establishes named viewport tiers and warns about responsive guard drift.
- `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`
  establishes shared shell and brand responsibilities.
- `docs/plans/2026-05-24-004-feat-seller-scoped-discogs-wantlist-handoff-plan.md`
  establishes the truthful, seller-scoped pile handoff contract.

External and library guidance:

- W3C WAI-ARIA Authoring Practices, [Dialog (Modal)
  Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): modal
  dialogs require contained keyboard focus, Escape close, initial focus inside
  the dialog, return focus on close, visible close control, and actual
  background inoperability when `aria-modal="true"` is used.
- W3C WAI WCAG 2.2, [Understanding SC 2.5.8 Target Size
  (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum):
  Level AA requires at least 24 by 24 CSS pixel pointer targets or qualified
  spacing exceptions, and recommends larger targets for important controls.
- Context7 lookup for official React documentation (`/reactjs/react.dev`) on
  2026-05-25 confirmed React's supported pattern for synchronizing a native
  dialog with state using an Effect and a ref:

```tsx
useEffect(() => {
  if (!isOpen) return
  const dialog = ref.current
  dialog.showModal()
  return () => dialog.close()
}, [isOpen])
```

  This is implementation guidance rather than a required component choice:
  an implementation using the existing motion surface is acceptable only if
  it satisfies the same modal behavior requirements.
