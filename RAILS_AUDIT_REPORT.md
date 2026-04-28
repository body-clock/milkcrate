# Milkcrate Rails Audit Report (thoughtbot Best Practices)

**Generated:** 2026-04-28
**Audited:** `app/`, `spec/`, `config/`, `db/`, `lib/`

---

## Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Testing | 0 | 1 | 1 | 1 |
| Security | 0 | 0 | 1 | 0 |
| Models & Database | 0 | 0 | 1 | 0 |
| Controllers | 0 | 1 | 0 | 0 |
| Code Design | 0 | 1 | 1 | 0 |
| Views & Presenters | 0 | 0 | 0 | 0 |
| External Services | 0 | 0 | 1 | 0 |
| **Total** | **0** | **3** | **5** | **1** |

---

## 1. Testing

### High: Missing test coverage for services

- **`app/services/store_sync_service.rb`** — No spec exists. Core sync logic (Discogs API call, listing upsert) is untested.
- **`app/services/daily_selection_service.rb`** — No spec exists. Selection algorithm (weighted reservoir sampling, carry-over, genre scoring) is untested.
- **`app/services/discogs_client.rb`** — No spec exists. API client with retry/error handling is untested.
- **`app/services/corpus/discogs_snapshot_exporter.rb`** — Spec exists ✅ but only covers deterministic output. Missing: vinyl filtering, pagination limit, API error handling.
- **`app/controllers/stores_controller.rb`** — 112 lines, no controller spec. Inertia rendering not tested.
- **Spec count**: 5 spec files for ~10 app files. Ratio is below recommended 1:1.

### Medium: Testing antipatterns in picks_selector_spec

- `picks_selector_spec.rb` uses `FakeListing`/`FakeListingsScope` structs with full ActiveRecord method stubs rather than using FactoryBot or database-level testing. This makes the tests brittle to model changes.

### Low: No CI check

- CI configuration is minimal. The `bin/ci` helper exists but no GitHub Actions workflow enforces tests on push/PR.

---

## 2. Security

### Medium: Single weak brakeman warning

- `app/views/dig_sessions/show.html.erb:30` — `link_to` with `listing.discogs_url` flagged for potential XSS (Weak confidence). URLs come from Discogs API (trusted source), so this is a false positive. No action needed.

### Notes
- HTTP Basic Auth is now development-only (correctly skipped via `unless: -> { Rails.env.development? }`).
- No SQL injection vectors found.
- No mass assignment issues (strong params used in stores_controller).
- CSRF protection enabled.
- No session-stored objects detected.

---

## 3. Models & Database

### Architecture
- 6 models, all under 30 lines each — well within thoughtbot guidelines.
- Associations are clean: `belongs_to`/`has_many` with `dependent: :destroy` where appropriate.
- `DailySelection` uses PostgreSQL array column (`listing_ids`) with GIN index — correct pattern for this data type.

### Medium: `Listing` model missing scopes for genre browsing

Consider extracting repeated genre query logic from controller to model scope:

```ruby
# In stores_controller.rb (line 72):
scope = daily_ids.any? ? store.listings.where(id: daily_ids) : store.listings
```

Could become `store.listings.daily_or_all(daily_ids)`. Similarly, `daily_shuffle` could accept a date parameter instead of using `Date.current`.

### Notes
- No N+1 query risks detected (crusty Rails app is too small for complex joins).
- No callbacks with business logic.
- No STI usage.
- All `*_id` columns have indexes.

---

## 4. Controllers

### High: `StoresController` is 112 lines with 8 methods

The controller handles too many responsibilities:
- Featured store rotation logic
- Inertia props serialization (build_crates, store_props, listing_props)
- Store creation and sync job enqueueing

**Recommendation**: Extract `CratePresenter` PORO for props serialization. The `listing_props` method (20 lines) and `crate_props` method handle pure data transformation — they don't belong in a controller.

### Notes
- No non-RESTful actions (picks_preview removed in cleanup).
- No spaghetti SQL in controllers — query logic is clean.
- Strong parameters used correctly.
- `ApplicationController` is clean (34 lines, auth + session + inertia_share).

---

## 5. Code Design

### High: Service Objects pattern — should be POROs

5 classes in `app/services/` following the `*Service` / `*Selector` naming convention. thoughtbot recommends domain nouns over service objects.

- `PicksSelector` → could be `PickScorer` or integrated into `RecordPresenter`
- `DailySelectionService` → could be `DailySelection::Generator`
- `StoreSyncService` → could be `InventorySync`
- `DiscogsClient` — this is an API client, naming is fine

**Recommendation**: Keep DiscogsClient as-is. Consider renaming services to domain nouns and including `ActiveModel::Model` for validation if they start taking config.

### Medium: Snapshot exporter has duplicate vinyl filtering logic

Both `store_sync_service.rb` and `discogs_snapshot_exporter.rb` implement `vinyl?` and `format_name` with nearly identical logic. Extract to shared concern or module.

### Notes
- No God class — models and controllers are slim.
- No case statements on type codes.
- No mixin abuse.
- `DiscogsClient` has proper timeout/retry via Faraday middleware.
- No comments-as-smell issues (the picks_selector.rb comments are intentional documentation).

---

## 6. Views & Presenters

### Clean
- ERB views reduced to 10 files (down from ~15 after Hotwire cleanup).
- No logic in views — no model queries, no nested conditionals > 2 levels.
- Inertia React handles all page rendering; remaining ERB views are simple (`new.html.erb`, `dig_sessions/*.erb`).
- `RecordCardComponent` ViewComponent was removed (replaced by React).

---

## 7. External Services & Error Handling

### Medium: DiscogsClient has specific error handling but no circuit breaker

- `DiscogsClient` correctly uses `Faraday` with retry (max: 3, interval: 2s) and specific error classes (`RateLimitError`, `ApiError`).
- `StoreSyncService` catches pagination errors gracefully.
- Missing: timeout configuration on Faraday connection (should set `open_timeout` and `read_timeout`).
- Missing: circuit breaker pattern for repeated API failures (would prevent thrashing during Discogs downtime).

### Notes
- No bare rescue statements found.
- No silent failures — all saves use upsert which doesn't need `!`.
- No fire-and-forget HTTP calls without error handling.

---

## 8. Gem Hygiene

### Dependency audit (bundler-audit)

- **mcp (0.8.0)** — CVE-2026-33946 (High). Transitive dependency from `rubocop`. Not exploitable in production (dev-only). Update rubocop when patch available.

### Used gems that could be removed

- `importmap-rails` — still in Gemfile but no longer used after Hotwire cleanup
- `turbo-rails` — same
- `stimulus-rails` — same (theme_controller is only remaining use)

---

## 9. Database & Migrations

### Clean
- 7 migration files, all reversible.
- No model references in migrations.
- Indexes present on all foreign keys and unique columns.
- No `*.length` calls detected (`.count` used correctly).
- `solid_queue`, `solid_cache`, `solid_cable` tables created automatically — no audit needed.

---

## Recommendations (Priority)

1. **HIGH**: Add test coverage for `StoreSyncService`, `DailySelectionService`, and `DiscogsClient`
2. **HIGH**: Extract `CratePresenter` PORO from `StoresController`
3. **MEDIUM**: Rename service objects to domain nouns (e.g., `PickScorer` instead of `PicksSelector`)
4. **MEDIUM**: Extract shared `vinyl?` / `format_name` logic from exporter and sync service
5. **MEDIUM**: Add `open_timeout` / `read_timeout` to Faraday connection in `DiscogsClient`
6. **LOW**: Remove unused gems (`importmap-rails`, `turbo-rails`, `stimulus-rails`)
7. **LOW**: Add GitHub Actions CI workflow for automated testing
