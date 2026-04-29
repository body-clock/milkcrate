# Front Riffle Crate Design

## Context

Milkcrate already has a working crate prototype in the Inertia React frontend. The current crate view presents one active record at a time, supports vertical drag navigation, arrow keys, progress, and tap-to-flip details through `RecordCard`.

The featured page receives its store, session, crate, and listing props from `CratePresenter`. That presenter is the server-side contract boundary for the crate experience.

The next refinement should make browsing feel like looking through a physical crate of records and riffling through sleeves, while preserving the prototype's simple interaction model.

## Goals

- Make the crate view feel tactile, spatial, and physical.
- Keep one active record as the user's focus.
- Show nearby records as visible sleeve depth instead of rendering a lone card.
- Preserve tap-to-flip behavior for record details and pile actions.
- Keep keyboard and button navigation available as secondary controls.
- Preserve the existing `CratePresenter` props contract unless a concrete interaction need requires changing it.

## Non-Goals

- No new search, sorting, filtering, or recommendation features.
- No modal inspection mode in this iteration.
- No server payload changes.
- No full 3D scene or canvas rendering.
- No relocation of crate-building logic from `CratePresenter` into React.

## User Experience

The crate view becomes a front-riffle surface. The active record sits forward and slightly lifted from a shallow crate/bin. Several neighboring records peek behind it with small offsets, rotations, sleeve edges, shadows, and cover hints.

Dragging the active sleeve down or right advances through the crate. Dragging up or left goes back. During drag, the active sleeve follows the pointer slightly, tilts, scales subtly, and casts a stronger shadow. Neighboring sleeves compress or relax enough to make the drag feel physical without shifting the whole layout.

Releasing beyond a threshold completes the riffle and changes the active record. Releasing early snaps the sleeve back. At the first and last records, drag resistance communicates the boundary and the sleeve returns to place.

Tap or click flips the active record in place, matching the current prototype. The flipped back shows title, artist, metadata, price, pile action, and Discogs link. Pile and link interactions must not trigger flip.

The progress indicator should feel like crate position rather than a generic progress bar. It can remain compact, but should be labeled or styled as position in the bin.

## Component Design

`CratePresenter` remains responsible for shaping the Inertia props used by the featured page:

- store metadata
- current dig session metadata
- crate list
- listing records
- `in_pile` state

The front-riffle system should treat this presenter output as its input contract. If later iterations need extra server-derived browsing metadata, such as crate ordering, featured badges, or precomputed record groupings, those additions should be made in `CratePresenter` and mirrored in `app/frontend/types/inertia.ts`.

`CrateView` remains the owner of browsing state:

- active crate
- active record index
- navigation direction
- drag progress
- keyboard navigation
- crate switching

`CrateView` derives a visible record window around the active index. This helper returns previous, current, and next records with stable positional metadata so rendering stays predictable near the start and end of the crate.

`RecordCard` keeps the core flip behavior and pile actions. It may accept narrow optional props needed by the crate layer, such as a reset token for clearing flipped state when the active record changes. The crate should not duplicate record detail markup.

If `CrateView` becomes too dense, introduce a presentational component for inactive sleeve depth. That component should render non-interactive cover hints and sleeve backs only; the active `RecordCard` remains the single interactive record.

## Interaction Rules

- Drag may use both axes, but the dominant offset determines direction.
- Down or right means forward.
- Up or left means backward.
- Small pointer movement should not suppress tap-to-flip.
- Navigation clamps at the first and last record.
- Crate switching resets the active index to zero.
- Changing active record resets the card to cover-front state.
- Reduced-motion users receive simpler transforms with no springy or exaggerated motion.

## Data Flow

No backend or Inertia prop changes are required for this iteration. `CratePresenter#build_crates` already produces the crate array and each crate's `records`. The existing `Crate.records` array has the cover, thumbnail, title, artist, metadata, price, and pile state needed for the visual stack and active details.

The only data transformation is client-side derivation of visible record positions from the active index.

## Error And Empty States

The existing empty crate state remains. It should continue to show the crate tabs and view toggle, followed by a concise empty message.

Records without cover images should still render a stable placeholder sleeve so the crate depth does not visually collapse.

## Testing

Automated tests should focus on deterministic helpers and interaction boundaries where practical:

- visible-window behavior near the start, middle, and end of a crate
- index clamping at first and last record
- crate switching reset behavior
- tap-to-flip still works
- pile and Discogs actions do not trigger flip

Manual verification should cover:

- mobile and desktop layouts
- no overlapping text or controls
- drag feel and snap-back behavior
- first and last record resistance
- reduced-motion behavior
- keyboard navigation

## Open Decisions Resolved

- The experience should prioritize physical browsing over fast collecting.
- The core mechanic should be Front Riffle.
- Tap-to-flip should remain the detail interaction.
- Sleeve inspection mode is out of scope for this iteration.
