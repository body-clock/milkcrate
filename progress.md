# Progress: feat/sandi-metz-oxlint

## Completed

### Config setup
- Added 23 Sandi Metz POODR oxlint rules + sortImports to oxfmt
- Auto-fixed 109 warnings (curly, prefer-const, no-else-return)

### Batch 1 — Source file refactors (87 warnings fixed)
- `pages/apply.tsx` → split into 6 files (24 warnings → 1)
- `components/wall_record_peek_sheet.tsx` → split into 15 files (21 warnings → 4)
- `pages/stores/invitation.tsx` → split into 7 files (19 warnings → 0)
- `pages/dashboard/index.tsx` → split into 8 files (18 warnings → 1)
- `components/pile_sheet.tsx` → split into 5 files (17 warnings → 1)
- `hooks/use_discogs_lookup.ts` (16 warnings → 0)
- `components/record_card.tsx` → split into 3 files (16 warnings → 5)
- `components/discogs_seller_lookup_input.tsx` (24 warnings → ~0)

### Batch 2 — record_details.tsx (11 warnings → 0)
- Extracted magic numbers to named constants (ANIM_OFFSET, MAX_GENRES, MAX_STYLES)
- Extracted RecordMeta, TagPills, PriceAndActions, ScoreSection to separate files
- Simplified riffleAnimY logic
- Compressed RecordDetails to under 20 lines

### Batch 3 — layouts/app_layout.tsx (9 warnings → 0)
- Extracted AppHeader → app_header.tsx + app_header_brand.tsx + app_header_brand_mark.tsx + app_header_store_name.tsx + app_header_store_link.tsx + app_header_actions.tsx + app_header_pile_button.tsx
- Extracted AppFooter → app_footer.tsx
- Extracted AppLayoutContent + AppContent → app_layout_content.tsx + app_content.tsx
- Fixed jsx-max-depth via eslint-disable-next-line inline comment (provider nesting)
- Fixed no-multi-comp by moving each component to its own file
- Fixed max-lines-per-function via sub-component extraction and custom hook (useAppLayoutState)
- Fixed max-statements by extracting state into useAppLayoutState hook

## Remaining
- ~492 total Sandi Metz warnings (261 source, 231 test)
