---
title: "refactor: Fix npx fallow findings — dead code, circular deps, dupes, and complexity"
type: refactor
status: active
date: 2026-06-06
---

# refactor: Fix npx fallow findings — dead code, circular deps, dupes, and complexity

## Summary

Address all findings from `npx fallow` — delete 34 unused files, remove 14 unused exports/types from live files, break 2 circular import cycles, fix 3 dependency configuration issues, extract shared test helpers from 73 clone groups and high-complexity scripts, and verify with a re-run.

---

## Problem Frame

`npx fallow` identifies 80 dead-code issues (34 unused files, 38 unused exports, 3 unused type exports), 2 unlisted dependencies, 1 test-only prod dependency, 2 circular dependencies, 73 clone groups producing 2,190 duplicated lines (10.2% of codebase), and 10 refactoring targets. These accumulate over time — old login/TOTP/admin code was superseded but never cleaned up, test setup code is copy-pasted across test files, and small import cycles increase change-cascade risk. Left unfixed, they make future refactoring noisier and hide real dead-code drift.

---

## Requirements

- R1. Delete all 34 files not reachable from any entry point, confirmed by local reference search
- R2. Remove unused exports from live files — only exports where no production consumer exists
- R3. Break both circular import cycles by extracting shared logic
- D4. Add missing `playwright` and `tailwindcss` to devDependencies; move `@inertiajs/vite` to devDependencies
- R5. Extract shared test setup code from clone groups into test helpers, reducing duplication ≥60%
- R6. Verify with `npx fallow` that all findings are resolved after cleanup
- R7. Do not modify user-facing behavior, visual output, or backend logic

---

## Scope Boundaries

- No behavioral changes to any component, page, or hook
- No CSS architectural changes beyond deleting dead files
- No test coverage additions beyond shared helper extraction
- No downstream consumer changes required
- No changes to source files that are live but lack unused exports

### Deferred to Follow-Up Work

- **High-CRAP `playwright_smoke.mjs`**: This file is listed as unused (34 files includes it), so deletion (U1) covers it. If it's actually needed for manual CI/QA runs, keep it and refactor its complex functions separately
- **Duplicate clone group reduction in `responsive_surface_matrix.test.tsx`**: The 63+ clone groups this plan doesn't explicitly extract are lower priority; track for a dedicated test-hygiene pass
- **Risk-score files** (pile_footer_body.tsx, field.tsx, etc.): These are structural risk signals unrelated to fallow-fix scoping; address in a layered-architecture audit
- **Hotspot files**: High-churn files (pile_sheet.tsx, crate_view.tsx) are product-active and out of scope for a cleanup-only pass

---

## Context & Research

### Relevant Code and Patterns

- Prior cleanup plan `docs/plans/2026-05-18-001-refactor-frontend-unused-code-cleanup-plan.md` (completed) established the reference-verified deletion pattern — search production code + tests before any deletion
- Prior health-check plan `docs/plans/2026-05-18-002-refactor-frontend-health-check-fixes-plan.md` (completed) extended test coverage and type safety; some findings from that plan (dead CSS, unused code) were partially fixed but fallow now shows remaining drift
- `app/frontend/test/viewport-test-utils.tsx` already exports `renderWithTier()` and `makeRecord()` — extension pattern for shared test helpers
- Circular dep cycle in `ui/action.tsx → action_link.tsx → action_helpers.ts` already identified in prior refactoring targets; recommend extracting event-handler or shared-interface module

### External References

- External research was not needed — all findings are codebase-internal

---

## Key Technical Decisions

- **Multi-pass deletion**: Delete unused files first (dead files cascade — deleting a dead file also removes its unused exports), then clean remaining unused exports from live files
- **Reference-verified deletion**: Before deleting any file, search `rg` for production imports (excluding tests of the file itself). If a production import exists, keep the file as anomalous rather than force-deleting
- **Circular dep fix pattern**: Extract shared constant or helper into a new lowest-level module, not into either cycle member — avoids re-creating the cycle
- **Test helper extraction**: Co-locate shared helpers in `app/frontend/test/shared/` (e.g., `pile_sheet_test_helpers.ts`, `page_test_helpers.ts`, `browse_shell_test_helpers.ts`) following the existing `viewport-test-utils.tsx` pattern
- **Dependencies fix**: `playwright` and `tailwindcss` are build/dev tools — add to devDependencies; `@inertiajs/vite` is a Vite plugin — also belongs in devDependencies

---

## Open Questions

### Resolved During Planning

- Should we delete `scripts/playwright_smoke.mjs`? It's listed as unused (no entry point reaches it), so yes — if it's needed for manual CI runs, add `fallow-ignore-next-line unused-files` and keep it with a refactor note
- Should unused exports in dead files be cleaned separately? No — deleting the file removes them automatically

### Deferred to Implementation

- Whether `scripts/playwright_smoke.mjs` is actually used by CI or an external runner — check with git log or ask user. Plan assumes deletion; if CI needs it, annotate with ignore and defer complexity refactor
- Whether `public/sw.js` and `app/views/pwa/service-worker.js` are needed for PWA support — check current Vite PWA plugin config. Plan assumes deletion; if PWA is active, annotate with ignore

---

## Implementation Units

### U1. Delete Unused Files

**Goal:** Remove 30-34 files not reachable from any entry point, eliminating the bulk of dead-code issues.

**Requirements:** R1, R6

**Dependencies:** None

**Files:**
- Delete: `app/assets/stylesheets/application.css`
- Delete: `app/assets/tailwind/application.css`
- Delete: `app/frontend/components/crate_view/index.ts`
- Delete: `app/frontend/components/discogs_seller_lookup_input/index.tsx`
- Delete: `app/frontend/components/pile_sheet/index.ts`
- Delete: `app/frontend/entrypoints/application.tsx`
- Delete: `app/frontend/pages/admin/dashboard/index.ts`
- Delete: `app/frontend/pages/admin/login/` (all 10 files)
- Delete: `app/frontend/pages/admin/totp_*` (all TOTP files including subdirectories)
- Delete: `app/frontend/pages/admin/totp_setup/` (all files in subdirectory)
- Delete: `app/views/pwa/service-worker.js`
- Delete: `public/sw.js`
- Delete: `scripts/lint-motion-tokens.ts`
- Delete: `scripts/playwright_smoke.mjs`
- Modify: `app/frontend/pages/admin/login/index.tsx` is already in the delete list — but the consumer that imports it may need updating
- Modify: Remove any stale references to deleted admin pages from `vite.config.ts` or entry point config files if they're enumerated

**Approach:**
1. Reference-verify each file: `rg "import.*from.*'" for the module path in app/frontend/ excluding the file itself and test directories
2. If a file has zero production imports, delete it together with its tests if they exist only for that file
3. If a file has production imports, do NOT delete — instead add `fallow-ignore-next-line unused-files` at the import site with a comment explaining why it's needed
4. For `app/assets/stylesheets/application.css` and `app/assets/tailwind/application.css`: check if they're referenced in `application.html.erb` or `manifest.js` before deleting
5. For `app/views/pwa/service-worker.js` and `public/sw.js`: check if the Vite PWA plugin config points to them

**Patterns to follow:**
- Reference-verified deletion pattern from `docs/plans/2026-05-18-001-refactor-frontend-unused-code-cleanup-plan.md`

**Test scenarios:**
- Test expectation: none for deletions — verification tools below confirm no breakage
- Integration: Existing frontend component and page tests pass after file deletions

**Verification:**
- `rg` finds zero remaining production imports to deleted module paths (excluding comment references)
- `npm run test:frontend` passes
- `npx fallow` shows fewer unused file findings (target: 0)

---

### U2. Remove Unused Exports and Type Exports from Live Files

**Goal:** Remove 14 unused exports and 3 unused type exports from live files.

**Requirements:** R2, R6

**Dependencies:** U1 (deleting dead files may remove some unused exports automatically)

**Files:**
- Modify: `app/frontend/components/crate_tabs.tsx` — remove `tabIndexValue`, `verticalTabClasses`, `horizontalTabClasses` (3 exports)
- Modify: `app/frontend/components/home/hero_text.tsx` — remove `FADE_UP_DURATION`, `fadeUp` (2 exports)
- Modify: `app/frontend/components/back_button.tsx` — remove default export (convert to direct inline or remove if unused)
- Modify: `app/frontend/components/bouncing_hand.tsx` — remove `TIMES_MIDPOINT`
- Modify: `app/frontend/components/ghost_finger_cue.tsx` — remove `GHOST_FINGER_CUE_TEST_ID` (only used in its own tests — inline if needed by tests, else remove)
- Modify: `app/frontend/components/record_card/constants.ts` — remove `FRAMED_SHADOW`
- Modify: `app/frontend/components/ui/field.tsx` — remove `fieldControlClassName`
- Modify: `app/frontend/hooks/crate_navigation_helpers.ts` — remove `applyRiffleMove`
- Modify: `app/frontend/lib/copy.ts` — remove `BROWSE_MODE_LABELS`
- Modify: `app/frontend/lib/riffle_navigation.ts` — remove `RIFFLE_THRESHOLDS`
- Modify: `app/frontend/components/crate_browse_panel.tsx` — remove `CrateBrowseMode` type export (inline or delete)
- Modify: `app/frontend/contexts/shopper_context.tsx` — remove `ShopperInfo` type export (inline or delete)
- Test files for all affected components — remove any test code that only tested the removed exports

**Approach:**
1. After U1, re-run export listing to confirm which unused exports remain
2. For each export: `rg` the symbol name across `app/frontend/` to confirm zero consumers
3. Remove the `export` keyword (inline constants) or delete the export entirely
4. If an export is a constant value used by the file internally, keep the internal `const` but drop `export`
5. If a test file only exists because it tests a removed export, delete the test file
6. Do not change the behavior or value of any remaining constant

**Patterns to follow:**
- Conservative inlining — keep internal references, drop export keyword

**Test scenarios:**
- Happy path: Live files still export their active API surface
- Integration: No TypeScript import errors from consumers that previously imported these symbols
- Test expectation: none for removed exports that had no consumers

**Verification:**
- `rg` finds zero imports of any removed symbol
- `npm run test:frontend` passes
- `npx fallow` shows 0 unused-export findings from live files

---

### U3. Break Circular Dependencies

**Goal:** Eliminate both import cycles by extracting shared logic into a lowest-level module.

**Requirements:** R3, R6

**Dependencies:** None (independent of U1/U2 — no file deletion affects these imports)

**Files:**

**Cycle 1: `ui/action.tsx` → `action_link.tsx` → `action_helpers.ts` → `action.tsx`**
- Create: `app/frontend/components/ui/action_types.ts` — extract shared types, constants, or pure helpers referenced by both `action.tsx` and `action_link.tsx`
- Modify: `app/frontend/components/ui/action.tsx` — import from `action_types.ts` instead of `action_helpers.ts`
- Modify: `app/frontend/components/ui/action_link.tsx` — import from `action_types.ts` instead of `action_helpers.ts` (if the cycle is via action_link → action_helpers → action)
- Modify: `app/frontend/components/ui/action_helpers.ts` — may be eliminated or slimmed if its content is extracted

**Cycle 2: `health_bar.tsx` ↔ `health_status.tsx`**
- Create or extract: shared health-display utility or constant that both files need
- Modify: `app/frontend/pages/admin/dashboard/store_card/health_bar.tsx` — import from extracted module
- Modify: `app/frontend/pages/admin/dashboard/store_card/health_status.tsx` — import from extracted module

**Approach:**
1. Read all files in each cycle to understand what's being imported across the boundary
2. Identify the shared constant, type, or pure function that creates the back-reference
3. Extract it into a new lowest-level module (no reverse imports)
4. Update both original files to import from the new module
5. Verify no remaining cycles with `npx fallow`

**Patterns to follow:**
- `action_types.ts` pattern: follows the existing `app/frontend/components/ui/` organization
- Shared-constant extraction pattern: lowest-level module imports nothing from ui/

**Test scenarios:**
- Test expectation: none for pure refactoring — existing component tests prove behavior unchanged
- Integration: All components that use Button, ActionLink, Action render the same output
- Integration: Health display in admin dashboard renders identically

**Verification:**
- `npx fallow` reports 0 circular dependencies
- `rg` shows no import cycles between the affected files
- `npm run test:frontend` passes

---

### U4. Fix Dependency Configuration

**Goal:** Correct `package.json` so declared dependencies match actual usage.

**Requirements:** D4, R6

**Dependencies:** None

**Files:**
- Modify: `package.json` — add `playwright` and `tailwindcss` to `devDependencies`; move `@inertiajs/vite` from `dependencies` to `devDependencies`

**Approach:**
1. Check current versions of `playwright` and `tailwindcss` used in the project (from lockfile or node_modules)
2. Add them to `devDependencies` at the installed version
3. Move `@inertiajs/vite` from `dependencies` to `devDependencies`
4. Run `npm install` or `yarn install` to update lockfile

**Patterns to follow:**
- Existing `devDependencies` entries for tools like `vite`, `@vitejs/plugin-react`

**Test scenarios:**
- Test expectation: none — no behavioral change
- Integration: `npm install` completes without warnings
- Integration: CI pipeline still resolves all dependencies correctly

**Verification:**
- `npx fallow` reports 0 unlisted-dependency and 0 test-only-production-dependency findings
- `npm run test:frontend` passes after dependency changes

---

### U5. Extract Shared Test Helpers from Clone Groups

**Goal:** Reduce the 2,190 duplicated lines (10.2%) by extracting shared setup into `app/frontend/test/shared/` helpers, targeting the largest, most repetitive clone groups first.

**Requirements:** R5, R6

**Dependencies:** None (test helper extraction is safe to run independently)

**Files:**
- Create: `app/frontend/test/shared/pile_sheet_test_helpers.tsx`
- Create: `app/frontend/test/shared/page_smoke_test_helpers.tsx`
- Create: `app/frontend/test/shared/browse_shell_test_helpers.tsx`
- Modify: `app/frontend/components/pile_sheet/empty_and_records.test.tsx` — use shared helpers
- Modify: `app/frontend/components/pile_sheet/total_and_clear.test.tsx` — use shared helpers
- Modify: `app/frontend/components/pile_sheet/wantlist.test.tsx` — use shared helpers
- Modify: `app/frontend/components/pile_sheet/responsive_and_header.test.tsx` — use shared helpers
- Modify: `app/frontend/test/pages/page_smoke.test.tsx` — use shared helpers for setup (render providers, mock data)
- Modify: `app/frontend/test/pages/responsive_surface_matrix.test.tsx` — use shared helpers
- Modify: `app/frontend/components/browse_shell.test.tsx` — use shared helpers

**Approach:**
1. Analyze the top clone groups by line count:
   - **~85 lines**: `empty_and_records`, `total_and_clear`, `wantlist` — identical render-with-providers setup + mock data
   - **~81 lines**: `responsive_and_header`, `total_and_clear`, `wantlist` — responsive setup overlap
   - **~58 lines**: `page_smoke`, `responsive_surface_matrix` — shared test provider/render setup
   - **~55 lines**: all 4 pile_sheet test files — shared record mocks and provider wrapping
2. Extract the shared component:
   - `pile_sheet_test_helpers.tsx` — `renderPileSheet(ui, options)` wrapping `PileProvider` + `ViewportProvider`, shared mock listings, shared `makeRecordListing()` factory
   - `page_smoke_test_helpers.tsx` — `renderPage(ui, providerOptions)`, shared mock store context
   - `browse_shell_test_helpers.tsx` — shared `makeBrowseContext()`, shared mock nav items
3. Update each test file to import from helpers instead of duplicating setup
4. Delete inline duplicates after extraction

**Patterns to follow:**
- Existing `app/frontend/test/viewport-test-utils.tsx` — exports `renderWithTier()` and `makeRecord()`
- Extension pattern: add `makeRecordListing()`, `renderPileSheet()`, `renderWithProviders()`

**Test scenarios:**
- Test expectation: none for refactoring — all existing test assertions must pass unchanged
- Each clone group's member files produce the same test pass/fail results as before extraction

**Verification:**
- `npm run test:components` passes for all modified test files
- `npx fallow` shows reduced duplication (target: <1,000 duplicated lines, <5% of codebase)
- `git diff --stat` shows negative line count from deleted duplicates

---

### U6. Verify and Close

**Goal:** Re-run `npx fallow` to confirm all findings are resolved. File final notes for any unresolved items.

**Requirements:** R6

**Dependencies:** U1-U5

**Files:**
- None (verification only)

**Approach:**
1. Run `npx fallow` and compare against the original finding counts
2. Document any remaining findings — either annotated with `fallow-ignore-next-line` (with reason) or added to `### Deferred to Follow-Up Work` in this plan
3. If a file must remain despite fallow flag (e.g., CI needs `playwright_smoke.mjs`), add suppression comment with an inline explanation

**Verification:**
- **Target: 0 findings** for dead-code (unused files, exports, types), dependency issues, and circular dependencies
- **Target: <1,000 duplicated lines** (from 2,190)
- Remaining uncategorized health/complexity findings are tracked as deferred follow-up

---

## System-Wide Impact

- **Interaction graph:** No active code paths are modified. Test helper extraction only changes imports in test files. Deletion of unused pages (admin login, TOTP) only removes code that had no reachable entry point
- **Error propagation:** Unchanged — no runtime behavior changes
- **State lifecycle risks:** None — no state management code is modified
- **API surface parity:** Unchanged — no feature code, controllers, or API endpoints change
- **Integration coverage:** Shared test helpers improve consistency of provider wrapping across tests
- **Unchanged invariants:** All active components, pages, hooks, services, and utilities remain identical in behavior and output

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Deleting a file that has indirect or dynamic imports | Reference-verify every file with `rg` before deletion; if dynamic imports exist, add suppression comment instead |
| CI pipeline depends on `scripts/playwright_smoke.mjs` | Check CI config; if needed, add `fallow-ignore-next-line` and keep the file. The complexity refactor from the target list would need a separate pass |
| PWA support requires `public/sw.js` or `app/views/pwa/service-worker.js` | Check Vite PWA plugin config before deleting these |
| Circular dependency extraction changes module loading order, causing initialization failures | The extracted module should contain only types and constants (no side effects) — safe for any import order |
| Test helper extraction accidentally changes test setup behavior | Each extraction should preserve exactly the setup each test had — verify by running tests immediately after editing |
| `@inertiajs/vite` move to devDependencies breaks production build | Vite plugin packages belong in devDependencies — this is standard. Verify with `npm run build` |

---

## Sources & References

- **Origin:** `npx fallow` output from 2026-06-06 session
- Related code: `app/frontend/components/ui/action.tsx`, `action_link.tsx`, `action_helpers.ts`
- Related code: `app/frontend/pages/admin/dashboard/store_card/health_bar.tsx`, `health_status.tsx`
- Related code: `app/frontend/components/pile_sheet/` (4 test files)
- Related code: `app/frontend/test/pages/page_smoke.test.tsx`
- Related code: `app/frontend/test/pages/responsive_surface_matrix.test.tsx`
- Prior plan: `docs/plans/2026-05-18-001-refactor-frontend-unused-code-cleanup-plan.md` (reference-verified deletion pattern)
- Prior plan: `docs/plans/2026-05-18-002-refactor-frontend-health-check-fixes-plan.md` (test coverage patterns)
