# feat/sandi-metz-oxlint — Progress

## Current status
Branch: feat/sandi-metz-oxlint (from development)
Config added: 23 oxlint rules + sortImports in oxfmt

## Fix progress (579 → 433 → ongoing)

### Batch 0 — Auto-fix
- 109 warnings fixed via `oxlint --fix` (curly, prefer-const, no-else-return, etc.)

### Batch 1 — Source file refactors ✓
- pages/apply.tsx → split into 6 files (24→1 warnings)
- wall_record_peek_sheet.tsx (21→4)
- pages/stores/invitation.tsx → split into 7 files (19→0)
- pages/dashboard/index.tsx → split into 8 files (18→1)
- components/pile_sheet.tsx → split into 5 sub-components (17→1)
- hooks/use_discogs_lookup.ts (16→0)
- components/record_card.tsx → split into 3 files (16→5)
- components/discogs_seller_lookup_input.tsx (24→0)

### Batch 2 — Source file refactors ✓
- pages/home.tsx → extracted components (14→0)
- hooks/use_admin_discogs_lookup.ts (16→0)
- hooks/use_pointer_proximity.ts (10→0)
- components/browse_shell.tsx → split into 12 files (14→0)
- admin/discogs_onboarding_panel.tsx → split into 7 files (11→0)
- components/record_details.tsx → extracted sub-components (11→0)
- layouts/app_layout.tsx → split into 10 files (10→0)

### Batch 3 — In progress
- hooks/use_preload.ts ✅ fixed (3→0)

### Remaining (433 total: 202 source + 231 test)
- Top source files still needing fixes
- All test files (231 warnings) — deferred
