namespace :milkcrate do
  def default_store
    store = Store.find_by(discogs_username: Settings.discogs_username)
    raise "No store found for username '#{Settings.discogs_username}'. Run corpus:seed or create one." unless store
    store
  end

  desc "Full inventory sync from Discogs, then enrich and curate"
  task sync: :environment do
    store = default_store
    puts "Syncing #{store.name} (@#{store.discogs_username})..."
    count = StoreSyncService.new(store).full_sync
    puts "Synced #{count} listings."
    EnrichReleasesJob.perform_later(store.id)
    DailyCurationJob.perform_later(store.id)
    puts "Enrichment and curation queued (background)."
  end

  desc "Quick sync (1 page / ~100 records) — useful for dev"
  task "sync:quick": :environment do
    store = default_store
    puts "Quick-syncing #{store.name} (1 page)..."
    synced_before = Time.current
    count = StoreSyncService.new(store).full_sync(max_pages: 1)
    puts "Synced #{count} listings."
    synced_ids = store.listings.where("last_seen_at >= ?", synced_before).pluck(:id)
    puts "Enriching #{synced_ids.size} releases (synchronous)..."
    EnrichReleasesJob.perform_now(store.id, listing_ids: synced_ids)
    puts "Enrichment complete."
    DailyCurationJob.perform_now(store.id)
    puts "Curation complete."
  end

  desc "Run daily curation (stamp last_surfaced_at, compute picks rotation)"
  task curate: :environment do
    store = default_store
    puts "Running curation for #{store.name}..."
    DailyCurationJob.perform_now(store.id)
    puts "Done."
  end

  desc "Bootstrap a fresh install — full sync, then enrich + curate synchronously"
  task setup: :environment do
    store = default_store
    puts "Syncing #{store.name} (@#{store.discogs_username})..."
    count = StoreSyncService.new(store).full_sync
    puts "Synced #{count} listings."
    puts "Enriching all releases (synchronous — this will take a while)..."
    EnrichReleasesJob.perform_now(store.id)
    puts "Enrichment complete."
    DailyCurationJob.perform_now(store.id)
    puts "Setup complete."
  end

  desc "Reset surfacing data (last_surfaced_at, surface_count) — dev/testing only"
  task reset_surfacing: :environment do
    store = default_store
    count = store.listings.update_all(last_surfaced_at: nil, surface_count: 0)
    puts "Reset surfacing data for #{count} listings in #{store.name}."
  end

  desc "Print curation stats for the current store"
  task stats: :environment do
    store = default_store
    total      = store.listings.count
    available  = store.listings.available.count
    lp         = store.listings.available.lp_only.count
    surfaced   = store.listings.where.not(last_surfaced_at: nil).count
    never      = store.listings.where(last_surfaced_at: nil).count
    fresh      = store.listings.where("last_surfaced_at > ?", 3.days.ago).count
    genres     = store.listings.available.lp_only.pluck(:genres).flatten.tally.sort_by { |_, c| -c }

    puts "Store:     #{store.name} (@#{store.discogs_username})"
    puts "Listings:  #{total} total · #{available} available · #{lp} LP/album"
    puts "Surfacing: #{surfaced} surfaced · #{never} never surfaced · #{fresh} surfaced in last 3 days"
    puts "Genres (LP, available):"
    genres.first(15).each { |g, c| puts "  #{g.ljust(20)} #{c}" }
    puts "  … (#{genres.size} genres total)" if genres.size > 15
  end
end
