---
title: "feat: Explore page redesign with featured stores and richer cards"
type: feat
status: active
date: 2026-06-12
origin: docs/brainstorms/2026-06-12-explore-page-redesign-requirements.md
---

# Explore Page Redesign

## Summary

Redesign the explore page from a plain directory into a discovery experience. Add a "Featured" section with 3 random stores per day, enrich store cards with location/avatar/genre tags/description, and filter out stores that haven't completed sync and enrichment.

---

## Problem Frame

The current explore page lists all stores as simple text cards (name, username, listing count). It feels like a contact list, not a place to discover record stores. There's no visual hierarchy, no incentive to click, and stores that haven't been synced or enriched show up with incomplete data ("Waiting on first enrichment"). The page doesn't answer "why should I click on this one?"

---

## Requirements

**Filtering**

- R1. Only show stores that have completed at least one sync and one enrichment cycle
- R2. Hide stores where `last_synced_at` or `last_enriched_at` is NULL

**Featured section**

- R3. Show a "Featured" section at the top of the page
- R4. Feature 3 stores per day, selected randomly
- R5. Featured stores rotate daily (different set each day)
- R6. Featured stores are drawn from the same pool of ready stores (filtered by R1/R2)

**Store cards**

- R7. Each store card displays: store name, @username, and listing count (existing)
- R8. Each store card displays location if available from Discogs profile
- R9. Each store card displays profile picture/avatar if available from Discogs API
- R10. Each store card displays genre tags parsed from the store's Discogs profile description
- R11. Each store card displays a short description from the store's Discogs profile
- R12. Cards with missing data show whatever is available (no exclusion for incomplete profiles)

**Layout**

- R13. Featured section appears above the main grid
- R14. Main grid retains current responsive behavior (2 columns mobile, 3 desktop)

---

## Scope Boundaries

- Inventory-derived genre tags (analyzing listing genres during enrichment) are deferred to a later iteration
- Store owners cannot control whether they appear in the featured section
- No manual curation interface for featured stores (rotation is random)
- No search or filter functionality beyond the featured section and genre tags

### Deferred to Follow-Up Work

- Inventory-derived genre tags from enrichment analysis
- Search/filter by genre, location, or listing count
- Manual curation interface for featured stores

---

## Context & Research

### Relevant Code and Patterns

- `app/controllers/explore_controller.rb` - Current explore page controller
- `app/frontend/components/explore_directory/store_card.tsx` - Current store card component
- `app/frontend/components/explore_directory/directory_body.tsx` - Current grid layout
- `app/services/discogs_seller_lookup.rb` - Fetches Discogs profile data including avatar_url
- `app/services/store_discogs_identity_refresh.rb` - Refreshes store's Discogs identity
- `db/schema.rb` - Store model has `description`, `location`, `last_enriched_at`, `last_synced_at`

### Institutional Learnings

- Discogs API rate limits apply (60 requests/minute unauthenticated)
- Store onboarding already fetches profile data but doesn't persist avatar_url
- Enrichment already runs nightly and sets `last_enriched_at`

### External References

- Discogs API: `/users/{username}` returns `avatar_url`, `location`, `profile`, `name`

---

## Key Technical Decisions

- **Add avatar_url and genre_tags columns to Store model**: Store these values locally to avoid repeated API calls on page load
- **Create a background job to fetch profile data**: Run during enrichment or as a separate job to populate avatar_url, location, description, and genre_tags
- **Parse genre tags from profile description using keyword matching**: Simple approach - look for common genre keywords (punk, jazz, soul, etc.) in the profile text
- **Use date-based seed for random featured stores**: Ensures the same 3 stores appear all day, then rotate tomorrow
- **Keep featured section in controller, not frontend**: Server-side selection ensures consistency and avoids client-side randomness

---

## Open Questions

### Resolved During Planning

- Where to store avatar_url: Add column to Store model (verified schema doesn't have it)
- How to handle rate limits: Batch profile fetches with delays, run as background job
- How to parse genre tags: Keyword matching against common genres

### Deferred to Implementation

- Exact genre keyword list to use for parsing
- Whether to add a rake task to backfill existing stores or wait for natural enrichment cycle

---

## Implementation Units

### U1. Add avatar_url and genre_tags columns to Store

**Goal:** Add database columns to store avatar URL and parsed genre tags

**Requirements:** R8, R9, R10

**Dependencies:** None

**Files:**
- Create: `db/migrate/XXXXXX_add_avatar_url_and_genre_tags_to_stores.rb`
- Modify: `db/schema.rb` (auto-updated by migration)
- Modify: `app/models/store.rb` (add to accessible attributes if needed)

**Approach:**
- Create migration to add `avatar_url` (string) and `genre_tags` (text, array or JSON) columns
- Add indexes if needed for querying

**Test scenarios:**
- Happy path: Migration runs successfully on fresh database
- Edge case: Migration runs on existing database with data
- Integration: Store model can read/write new columns

**Verification:**
- `rails db:migrate` completes without errors
- Store record can be saved with avatar_url and genre_tags

---

### U2. Create job to fetch and store Discogs profile data

**Goal:** Background job that fetches avatar_url, location, description, and genre_tags from Discogs API and stores them on the Store model

**Requirements:** R8, R9, R10, R11

**Dependencies:** U1

**Files:**
- Create: `app/jobs/store_profile_sync_job.rb`
- Create: `app/services/store_profile_parser.rb`
- Create: `spec/jobs/store_profile_sync_job_spec.rb`
- Create: `spec/services/store_profile_parser_spec.rb`

**Approach:**
- `StoreProfileSyncJob` takes a store_id, fetches Discogs profile via `DiscogsClient#seller_profile`, and updates store with avatar_url, location, description
- `StoreProfileParser` extracts genre tags from profile description using keyword matching
- Run this job for all stores (backfill) and integrate into enrichment or sync flow for new stores
- Include rate limit handling (delay between requests)

**Patterns to follow:**
- `app/jobs/enrichment_job.rb` - Job structure with error handling
- `app/services/store_discogs_identity_refresh.rb` - Discogs API integration pattern

**Test scenarios:**
- Happy path: Job fetches profile and updates store with avatar_url, location, description, genre_tags
- Edge case: Store has no Discogs profile description - genre_tags empty, other fields populated
- Edge case: Discogs API returns rate limit - job retries with delay
- Error path: Discogs API fails - job logs error and marks as failed
- Integration: Job correctly parses genre tags from various profile descriptions

**Verification:**
- Job runs successfully and populates store fields
- Genre tags are extracted correctly from test profile descriptions

---

### U3. Update ExploreController to filter and add featured stores

**Goal:** Filter out unready stores and add featured section with 3 random stores per day

**Requirements:** R1, R2, R3, R4, R5, R6

**Dependencies:** U1

**Files:**
- Modify: `app/controllers/explore_controller.rb`
- Modify: `spec/requests/explore_spec.rb`

**Approach:**
- Add scope to Store model: `ready` - where `last_synced_at IS NOT NULL AND last_enriched_at IS NOT NULL`
- Filter `stores_data` to only return ready stores
- Add `featured_stores` method that selects 3 random stores using date-based seed
- Pass both `stores` and `featured_stores` to frontend

**Patterns to follow:**
- Existing `stores_data` method structure

**Test scenarios:**
- Happy path: Page shows only stores with last_synced_at and last_enriched_at set
- Happy path: Featured section shows 3 stores
- Edge case: Fewer than 3 ready stores - show all available
- Edge case: No ready stores - show empty state
- Integration: Featured stores change daily (verify with different dates)

**Verification:**
- Unready stores don't appear on explore page
- Featured section shows 3 random stores
- Same stores appear all day, rotate tomorrow

---

### U4. Update frontend ExploreStoreData type and components

**Goal:** Update TypeScript types and components to display richer store cards with avatar, location, genre tags, and description

**Requirements:** R7, R8, R9, R10, R11, R12, R13, R14

**Dependencies:** U1, U3

**Files:**
- Modify: `app/frontend/pages/explore.tsx`
- Modify: `app/frontend/components/explore_directory/store_card.tsx`
- Modify: `app/frontend/components/explore_directory/directory_body.tsx`
- Create: `app/frontend/components/explore_directory/featured_section.tsx`

**Approach:**
- Update `ExploreStoreData` interface to include new fields: `avatar_url`, `location`, `genre_tags`, `description`
- Create `FeaturedSection` component for the top section with 3 featured stores
- Update `StoreCard` to display avatar, location, genre tags, and description
- Keep card layout clean - avatar on left or top, text content on right or below
- Maintain responsive grid (2 columns mobile, 3 desktop)

**Patterns to follow:**
- Existing card structure and Tailwind classes
- MarketingLayout component for page structure

**Test scenarios:**
- Happy path: Featured section displays 3 stores with avatar and info
- Happy path: Store cards show all available data
- Edge case: Store has no avatar - show placeholder or hide
- Edge case: Store has no location - don't show location field
- Edge case: Store has no genre tags - don't show tags
- Edge case: Store has no description - don't show description
- Integration: Featured section appears above main grid

**Verification:**
- Page renders correctly with all new data fields
- Cards look good with partial data (some fields missing)
- Responsive layout works on mobile and desktop

---

### U5. Add rake task to backfill existing stores

**Goal:** Rake task to run StoreProfileSyncJob for all existing stores to populate avatar_url, location, description, genre_tags

**Requirements:** R8, R9, R10, R11

**Dependencies:** U2

**Files:**
- Create: `lib/tasks/store_profile.rake`
- Create: `spec/tasks/store_profile_spec.rb`

**Approach:**
- Create rake task `store_profile:sync_all` that enqueues StoreProfileSyncJob for each store
- Include rate limiting (delay between jobs)
- Log progress and handle errors gracefully

**Test scenarios:**
- Happy path: Task enqueues jobs for all stores
- Edge case: Task handles stores with existing profile data
- Edge case: Task handles Discogs API errors gracefully

**Verification:**
- Task runs without errors
- Jobs are enqueued for all stores

---

## System-Wide Impact

- **Interaction graph:** ExploreController now queries additional fields; frontend components receive more data
- **Error propagation:** Profile sync job failures logged but don't block explore page
- **State lifecycle risks:** Avatar URLs from Discogs may change over time - consider periodic refresh
- **API surface parity:** Explore page props now include new fields - ensure backward compatibility

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Discogs API rate limits during backfill | Add delays between requests, run as background jobs |
| Profile descriptions may not contain useful genre keywords | Accept empty genre_tags, can improve parsing later |
| Avatar URLs from Discogs may expire or change | Store locally, can add periodic refresh later |

---

## Documentation / Operational Notes

- Run `rake store_profile:sync_all` after deploying to backfill existing stores
- Monitor job queue during backfill to avoid overwhelming Discogs API
- Consider adding a rake task to refresh profile data periodically

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-06-12-explore-page-redesign-requirements.md](docs/brainstorms/2026-06-12-explore-page-redesign-requirements.md)
- Related code: `app/controllers/explore_controller.rb`, `app/frontend/components/explore_directory/store_card.tsx`
