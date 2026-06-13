# Explore Page Redesign - Task List

## U1. Add avatar_url and genre_tags columns to Store
- [x] Create migration for avatar_url (string) and genre_tags (text/array) columns
- [x] Run migration
- [x] Verify Store model can read/write new columns
- [x] Commit

## U2. Create job to fetch and store Discogs profile data
- [x] Create StoreProfileParser service to extract genre tags from profile description
- [x] Create StoreProfileSyncJob to fetch and update store profile data
- [x] Write specs for StoreProfileParser
- [x] Write specs for StoreProfileSyncJob
- [x] Commit

## U3. Update ExploreController to filter and add featured stores
- [x] Add `ready` scope to Store model (last_synced_at AND last_enriched_at not null)
- [x] Update stores_data to filter to ready stores only
- [x] Add featured_stores method with date-based random selection
- [x] Update controller to pass featured_stores to frontend
- [x] Write/update specs for ExploreController
- [x] Commit

## U4. Update frontend ExploreStoreData type and components
- [x] Update ExploreStoreData interface with new fields
- [x] Create FeaturedSection component
- [x] Update StoreCard to display avatar, location, genre tags, description
- [x] Update DirectoryBody to include FeaturedSection
- [x] Update explore.tsx to pass featured_stores
- [x] Test responsive layout
- [x] Commit

## U5. Add rake task to backfill existing stores
- [x] Create lib/tasks/store_profile.rake with sync_all task
- [x] Write spec for rake task
- [x] Test rake task
- [x] Commit

## Final
- [x] Run full test suite
- [x] Run linting
- [x] Review all changes
- [x] Ship
