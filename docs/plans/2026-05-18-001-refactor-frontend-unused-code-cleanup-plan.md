---
title: "refactor: Clean up unused frontend code"
type: refactor
status: completed
date: 2026-05-18
---

# refactor: Clean Up Unused Frontend Code

## Summary

Remove verified-unused frontend code and stale compatibility paths without changing user-facing storefront behavior. This plan focuses on dead files, stale exports, unused props/types, the legacy `mc-dig-session` pile migration, and tooling guardrails so future unused code is easier to catch.

---

## Problem Frame

The frontend has accumulated artifacts from earlier animation, responsive, and brand-system migrations. Some artifacts are now only referenced by tests or documentation, some exported tokens have no production consumers, and one localStorage migration keeps supporting an old key that the user explicitly wants to retire. Leaving these in place makes later refactor analysis noisier because it is harder to distinguish active product surface from historical scaffolding.

---

## Requirements

- R1. Remove only code that is locally reference-verified as unused or intentionally retired.
- R2. Retire the legacy `mc-dig-session` pile migration and its migration-specific test coverage.
- R3. Prune motion token exports that are unused by production frontend code, while preserving tokens that still have active consumers.
- R4. Remove stale frontend prop/type fields that are not consumed by pages or sent by the current controller path.
- R5. Delete test-only component files only when the app has no production import path for them.
- R6. Add or update static checks so unused imports, unused locals, and unused parameters fail earlier.
- R7. Keep broader component consolidation, store-browsing redesign, and refactor analysis out of scope.

---

## Scope Boundaries

- No visual redesign, interaction redesign, copy rewrite, or component-consolidation refactor.
- No changes to storefront navigation, crate browsing, pile behavior under the current `mc-pile` key, or admin behavior.
- No deletion based only on intuition; every deletion should be backed by local reference search.
- No external dependency additions.

### Deferred to Follow-Up Work

- Analyze whether `CrateCard`, `CrateShelf`, `FeaturedCratesRow`, `GenreGrid`, and `StorefrontPreview` should be consolidated around one crate-preview primitive.
- Fix or redesign `CrateShelf` hover behavior; the current plan may delete unused preview components, but it does not reshape active crate-card interaction.
- Larger `CrateView` extraction work such as separating record details, preload behavior, headers, and card-stack rendering.
- Brand/emoji polish that is not unused-code cleanup.

---

## Context & Research

### Relevant Code and Patterns

- `app/frontend/hooks/use_pile.ts` currently reads `mc-pile` first and then migrates `mc-dig-session` into `mc-pile`; `app/frontend/hooks/use_pile.test.ts` has one migration-specific example.
- `app/frontend/lib/motion_tokens.ts` exports core springs and many convenience/preset tokens. `rg` shows several exports are only referenced by `app/frontend/lib/motion_tokens.test.ts`, not by production frontend code.
- `app/frontend/components/tactile_card.tsx` and `app/frontend/components/storefront_preview.tsx` have tests but no production imports. Their names appear in documentation and comments, not active app code.
- `app/frontend/types/inertia.ts` includes fields such as `StoreShowProps.active_crate_slug` and `InvitationProps.discogs_username` that are stale against the current page/controller usage.
- `app/frontend/components/featured_crates_row.tsx` and `app/frontend/components/genre_grid.tsx` destructure `isWide` without using it.
- `npx tsc --noEmit` currently stops at the TypeScript 6 `baseUrl` deprecation warning unless `ignoreDeprecations` is configured, preventing the compiler from being used as an unused-code gate.

### Institutional Learnings

- `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md` documents why animation tokens were introduced and warns against scattered inline motion values. Token pruning should not remove still-active centralized springs or reintroduce inline values.
- `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md` documents `StorefrontPreview` as a preview primitive, but current production code no longer imports it. Deleting it is acceptable only as unused-code cleanup; deciding what should replace it belongs in follow-up refactor analysis.
- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md` warns that responsive refactors can lose guard parity. This plan avoids behavior-reshaping responsive refactors and limits viewport cleanup to unused destructures or deleted unused files.

### External References

- External research was not used. The work is internal cleanup with direct local references and tests.

---

## Key Technical Decisions

- Use reference-verified deletion: before removing any file/export/prop, search production code and tests separately, then update or delete tests that only preserve the dead artifact.
- Treat the legacy pile migration as intentionally retired, not accidentally dead: remove the compatibility branch and the migration test, while preserving current `mc-pile` persistence behavior.
- Keep core motion tokens that still have active consumers, even if they look generic; only remove exports that are test-only or documentation-only.
- Prefer compiler/lint configuration over ad hoc cleanup discipline for future unused locals/imports.

---

## Open Questions

### Resolved During Planning

- Should this pass include broader component refactor analysis? No. The user explicitly redirected to a narrow unused-code cleanup pass first, with refactor analysis afterward.
- Should `mc-dig-session` remain for compatibility? No. The user explicitly said to include it in this cleanup.

### Deferred to Implementation

- Exact final token export list should be confirmed by a final `rg` pass immediately before editing, because active imports may shift if implementation happens after this plan is written.
- Whether deleting `StorefrontPreview` and `TactileCard` requires removing only their tests or also updating nearby comments depends on the final reference scan.

---

## Implementation Units

### U1. Retire Legacy Pile Storage Migration

**Goal:** Remove `mc-dig-session` compatibility from pile loading while preserving current `mc-pile` persistence behavior.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `app/frontend/hooks/use_pile.ts`
- Modify: `app/frontend/hooks/use_pile.test.ts`

**Approach:**
- Remove the legacy storage key constant and the branch that reads, writes, and removes `mc-dig-session`.
- Keep the existing current-key load path, empty fallback, JSON parse failure fallback, and write-on-change behavior.
- Delete the migration-specific test and keep the tests that prove empty state, add/remove/clear, duplicate prevention, `inPile`, persistence, and restore from `mc-pile`.

**Execution note:** Treat this as a behavior change only for browsers still carrying the retired legacy key; characterize current `mc-pile` behavior before editing.

**Patterns to follow:**
- Existing `usePile` hook tests in `app/frontend/hooks/use_pile.test.ts`.

**Test scenarios:**
- Happy path: when `mc-pile` contains a saved listing, mounting `usePile` restores that listing.
- Happy path: adding a listing writes the current pile to `mc-pile`.
- Edge case: when only `mc-dig-session` exists, mounting `usePile` starts with an empty pile and does not migrate it.
- Edge case: invalid JSON in storage still falls back to an empty pile without throwing.

**Verification:**
- No `mc-dig-session` or `LEGACY_STORAGE_KEY` references remain in `app/frontend`.
- `usePile` tests cover current storage behavior without legacy migration coverage.

---

### U2. Delete Test-Only Frontend Components

**Goal:** Remove component files that have no production import path and are only kept alive by tests.

**Requirements:** R1, R5

**Dependencies:** None

**Files:**
- Delete: `app/frontend/components/tactile_card.tsx`
- Delete: `app/frontend/components/tactile_card.test.tsx`
- Delete: `app/frontend/components/storefront_preview.tsx`
- Delete: `app/frontend/components/storefront_preview.test.tsx`
- Modify: `app/frontend/test/pages/responsive_surface_matrix.test.tsx`, if its provider comments still mention deleted components
- Modify: `app/frontend/components/storefront_shell.test.tsx`, if its comments still mention deleted components

**Approach:**
- Run a production-reference search for each component, excluding its own file and tests.
- If production imports remain, stop and defer that component to follow-up analysis instead of deleting it.
- If only tests and documentation/comments remain, delete the component and its direct tests together.
- Update nearby test comments that mention deleted components when those comments become misleading; do not rewrite historical `docs/solutions/` records in this unit.

**Execution note:** This unit is deletion-first but reference-gated. Do not delete a component if the final local search finds a production consumer.

**Patterns to follow:**
- Existing test organization keeps component tests adjacent to the component file; deleted test-only components should have adjacent tests removed with them.

**Test scenarios:**
- Test expectation: none for deleted test-only components; the verification is absence of production references plus the broader frontend test suite still passing.
- Integration: existing page and component smoke tests should still render storefront, home, apply, admin, and store pages without importing the deleted files.

**Verification:**
- `rg` finds no `TactileCard` or `StorefrontPreview` references in production frontend files.
- Frontend component/page tests do not fail due to missing deleted components.

---

### U3. Prune Unused Motion Token Exports

**Goal:** Remove motion token exports that have no production consumers while keeping active animation tokens intact.

**Requirements:** R1, R3

**Dependencies:** U2, if deleting components changes token references.

**Files:**
- Modify: `app/frontend/lib/motion_tokens.ts`
- Modify: `app/frontend/lib/motion_tokens.test.ts`

**Approach:**
- Re-run reference search after U2 to determine which token exports are still production-used.
- Remove exports that are test-only, such as unused duration aliases, unused reduced-motion scalar constants, unused transition aliases, and the unused preset factory if no production caller exists.
- Keep active springs, scale/lift/tilt constants, crate transition, and `reducedMotionTransition` if still imported by active components/hooks.
- Update token tests to assert only the public token surface that remains.

**Patterns to follow:**
- `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md` for preserving centralized animation values instead of returning to inline spring definitions.
- Current active imports in `use_tactile_hover.ts`, `crate_card.tsx`, `crate_shelf.tsx`, `crate_view.tsx`, `pile_sheet.tsx`, `record_card.tsx`, `apply.tsx`, and `stores/invitation.tsx`.

**Test scenarios:**
- Happy path: active spring constants retain their documented values.
- Happy path: active scale/lift/tilt constants remain available to current callers.
- Happy path: active transition objects used by crate navigation and reduced-motion paths remain available.
- Edge case: deleted token exports are also removed from token tests so tests no longer preserve dead API surface.

**Verification:**
- No production frontend imports refer to removed token exports.
- `motion_tokens.test.ts` describes the remaining public token API, not historical exports.

---

### U4. Remove Stale Frontend Props, Types, and Unused Locals

**Goal:** Clean up stale TypeScript fields and unused destructures surfaced by the audit.

**Requirements:** R1, R4

**Dependencies:** None

**Files:**
- Modify: `app/frontend/types/inertia.ts`
- Modify: `app/controllers/stores_controller.rb`
- Modify: `app/frontend/components/featured_crates_row.tsx`
- Modify: `app/frontend/components/genre_grid.tsx`
- Modify: `app/frontend/test/pages/page_smoke.test.tsx`
- Modify: `app/frontend/test/pages/responsive_surface_matrix.test.tsx`

**Approach:**
- Remove `active_crate_slug` from the store-show prop type and stop sending it from the controller if the page still does not consume it.
- Remove `discogs_username` from `InvitationProps` if the controller still does not send it and the page still does not read it.
- Remove unused `isWide` destructures from featured and genre grid components.
- Update test fixtures that include stale props only to satisfy old type shapes.

**Patterns to follow:**
- Current Inertia page props in `app/controllers/stores_controller.rb` and `app/controllers/pages_controller.rb`.
- Existing page smoke tests and responsive matrix tests that build prop fixtures.

**Test scenarios:**
- Happy path: store page test fixtures render with the reduced store-show prop shape.
- Happy path: invitation page test fixtures render with only the props the controller sends.
- Edge case: featured and genre grids still compute the same compact/comfy/wide column counts after removing the unused `isWide` local.
- Integration: TypeScript checking catches no missing prop errors after fixture updates.

**Verification:**
- No `active_crate_slug` references remain outside historical docs/tests that intentionally mention old behavior.
- No `InvitationProps.discogs_username` field remains.
- No `isWide` destructure remains where the value is unused.

---

### U5. Turn TypeScript Into an Unused-Code Guardrail

**Goal:** Make the frontend compiler useful for catching future unused-code drift.

**Requirements:** R1, R6

**Dependencies:** U1, U2, U3, U4

**Files:**
- Modify: `tsconfig.json`
- Modify: `package.json`, if a clearer typecheck script is needed

**Approach:**
- Add the minimal TypeScript 6 deprecation configuration needed so `npx tsc --noEmit` can run past the current `baseUrl` warning.
- Enable unused-code checks such as unused locals and unused parameters after the cleanup units remove known offenders; if one of these flags exposes unrelated non-frontend drift, defer that unrelated cleanup rather than widening this plan.
- If the project lacks a typecheck script, add a script that runs the compiler without emitting output.

**Patterns to follow:**
- Existing `package.json` frontend scripts for naming and scope.
- Current Vite alias configuration in `vite.config.ts` and TypeScript path mapping in `tsconfig.json`.

**Test scenarios:**
- Happy path: the typecheck command completes without the TypeScript 6 `baseUrl` deprecation failure.
- Happy path: unused imports, locals, and parameters are reported by the compiler after guardrails are enabled.
- Integration: frontend test commands still use the same module resolution after the TypeScript configuration update.

**Verification:**
- TypeScript can run as a static check for the frontend.
- Future unused locals/imports fail the configured typecheck instead of relying only on manual review.

---

## System-Wide Impact

- **Interaction graph:** The active app should continue to route through the same Inertia pages, layouts, providers, hooks, and active storefront components. Deleted files must have no production import path.
- **State lifecycle risks:** Retiring `mc-dig-session` means old browser sessions with only that key lose their saved pile. This is intentional per user direction; current `mc-pile` sessions must remain intact.
- **API surface parity:** Store-show and invitation props should align with what controllers actually send and pages actually consume.
- **Integration coverage:** Existing page smoke, responsive matrix, hook, component, and token tests should prove that active surfaces still render and current behavior remains intact.
- **Unchanged invariants:** Current pile persistence under `mc-pile`, crate navigation, storefront rendering, admin dashboard rendering, and current motion behavior should not change.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Deleting a component that is referenced through a dynamic or indirect import | Require a final production-reference search immediately before deletion and rely on TypeScript/component tests after deletion |
| Removing motion exports that are documentation-only today but intended for near-term refactor work | Keep the cleanup scoped to active code; future refactor analysis can reintroduce needed tokens with active consumers |
| `mc-dig-session` users lose old piles | This compatibility break is explicitly in scope; preserve only `mc-pile` behavior and document the trade-off in tests/PR notes |
| Enabling unused-code compiler checks exposes more issues than this pass intends to clean | Enable after cleanup units and defer non-frontend or non-unused-code findings rather than expanding scope |

---

## Documentation / Operational Notes

- No user-facing documentation is required.
- PR notes should explicitly call out the intentional removal of `mc-dig-session` compatibility.
- If deleted components are still described as active architecture in `docs/solutions/`, do not rewrite solution history during this cleanup. Capture the drift in the later refactor analysis instead.

---

## Sources & References

- Frontend audit request and findings from this session.
- Related code: `app/frontend/hooks/use_pile.ts`
- Related code: `app/frontend/lib/motion_tokens.ts`
- Related code: `app/frontend/components/tactile_card.tsx`
- Related code: `app/frontend/components/storefront_preview.tsx`
- Related code: `app/frontend/types/inertia.ts`
- Related learning: `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`
- Related learning: `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`
- Related learning: `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
