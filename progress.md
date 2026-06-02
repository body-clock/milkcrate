# Progress

## Status
In Progress

## Tasks
- Fix Sandi Metz warnings in app/frontend/pages/admin/dashboard.tsx — DONE ✅
- Fix Sandi Metz warnings in app/frontend/components/crate_view/crate_header.tsx — DONE ✅

## Files Changed

### Created
- app/frontend/pages/admin/dashboard/use_resync.ts — Extracted polling hook, POLL_INTERVAL_MS constant
- app/frontend/pages/admin/dashboard/dashboard_header_title.tsx — Title "Milkcrate admin" + "Store operations" + Sign out
- app/frontend/pages/admin/dashboard/dashboard_header.tsx — Full header with metrics
- app/frontend/pages/admin/dashboard/flash_banner.tsx — After-header flash messages
- app/frontend/pages/admin/dashboard/active_stores_section.tsx — Active stores section
- app/frontend/pages/admin/dashboard/applicants_section.tsx — Applicants section

### Modified
- app/frontend/pages/admin/dashboard.tsx — Slimmed from 139 lines to ~20, all Sandi Metz warnings resolved
- app/frontend/components/crate_view/crate_header.tsx — complexity 16→6, 66→16 lines, jsx-max-depth resolved via component extraction

### Created (crate_header)
- app/frontend/components/crate_view/crate_header/types.ts — Shared types
- app/frontend/components/crate_view/crate_header/crate_header_info.tsx — Name + record count
- app/frontend/components/crate_view/crate_header/compact_crate_header.tsx — Compact layout
- app/frontend/components/crate_view/crate_header/wide_crate_header.tsx — Wide layout

### Modified
- app/frontend/components/crate_view/crate_header.tsx — Slimmed from 100 lines to ~15, all 6 Sandi Metz warnings resolved

## Notes
- 3000 → POLL_INTERVAL_MS in use_resync.ts
- Dashboard function now <20 lines
- JSX max depth resolved via component extraction
