namespace :milkcrate do
  def demo_store
    store = Store.find_by(discogs_username: Settings.demo_store.discogs_username)
    raise "No store found for username '#{Settings.demo_store.discogs_username}'. Create one via the Rails console." unless store
    store
  end

  desc "Full inventory sync from Discogs (two passes), then enrich and curate"
  task sync: :environment do
    store = demo_store
    service = StoreSyncService.new(store)
    puts "Syncing #{store.name} (@#{store.discogs_username}) — two passes..."
    result = service.sync
    puts "Synced #{store.listings.count} listings (coverage: #{result.catalog_coverage})."
    EnrichmentJob.perform_later(store.id, listing_ids: result.listing_ids_for_enrichment) if result.listing_ids_for_enrichment.any?
    DailyCurationJob.perform_later(store.id)
    puts "Enrichment and curation queued (background)."
  end

  desc "Quick sync (1 page each pass / ~200 records) — useful for dev"
  task "sync:quick": :environment do
    store = demo_store
    service = StoreSyncService.new(store)
    puts "Quick-syncing #{store.name} (1 page per pass)..."
    result = service.sync(max_pages: 1)
    puts "Synced #{store.listings.count} listings (coverage: #{result.catalog_coverage})."
    if result.listing_ids_for_enrichment.any?
      puts "Enriching #{result.listing_ids_for_enrichment.size} releases (synchronous)..."
      EnrichmentJob.perform_now(store.id, listing_ids: result.listing_ids_for_enrichment)
      puts "Enrichment complete."
    else
      puts "No releases required enrichment."
    end
    DailyCurationJob.perform_now(store.id)
    puts "Curation complete."
  end

  desc "Enrich releases: Discogs metadata + MusicBrainz images for imageless releases"
  task enrich: :environment do
    store = demo_store
    puts "Enriching metadata and images for #{store.name}..."
    EnrichmentJob.perform_now(store.id)
    puts "Enrichment complete."
  end

  desc "Run daily curation (stamp last_surfaced_at, compute picks rotation)"
  task curate: :environment do
    store = demo_store
    puts "Running curation for #{store.name}..."
    DailyCurationJob.perform_now(store.id)
    puts "Done."
  end

  desc "Bootstrap a fresh install — two-pass sync, enrich, curate (all synchronous)"
  task setup: :environment do
    store = demo_store
    service = StoreSyncService.new(store)
    puts "Syncing #{store.name} (@#{store.discogs_username}) — two passes..."
    result = service.sync
    puts "Synced #{store.listings.count} listings (coverage: #{result.catalog_coverage})."
    if result.listing_ids_for_enrichment.any?
      puts "Enriching #{result.listing_ids_for_enrichment.size} releases (synchronous)..."
      EnrichmentJob.perform_now(store.id, listing_ids: result.listing_ids_for_enrichment)
      puts "Enrichment complete."
    else
      puts "No releases required enrichment."
    end
    DailyCurationJob.perform_now(store.id)
    puts "Setup complete."
  end

  desc "Reset surfacing data (last_surfaced_at, surface_count) — dev/testing only"
  task reset_surfacing: :environment do
    store = demo_store
    count = store.listings.update_all(last_surfaced_at: nil, surface_count: 0)
    puts "Reset surfacing data for #{count} listings in #{store.name}."
  end

  desc "Score breakdown for a listing — rake milkcrate:score[LISTING_ID]"
  task :score, [ :id ] => :environment do |_, args|
    raise "Usage: rake milkcrate:score[LISTING_ID]" unless args[:id]

    store    = demo_store
    listing  = store.listings.find(args[:id])
    genre_counts = store.listings.available.lp_only.pluck(:genres).map(&:first).compact.tally
    scorer = RecordScorer.new(genre_counts:, today: Date.today)
    breakdown = scorer.score_breakdown(listing)
    score    = breakdown.values.sum

    today    = Date.today
    have     = listing.have_count.to_i
    want     = listing.want_count.to_i
    total    = want + have

    puts "#{listing.artist} – #{listing.title} (#{listing.year})"
    puts "  ID:        #{listing.id}"
    puts "  Primary:   #{listing.primary_genre}"
    puts "  Genres:    #{listing.genres.join(", ")}"
    puts "  Styles:    #{listing.styles.join(", ")}"
    puts "  Condition: #{listing.condition}"
    puts "  Format:    #{listing.format}"
    puts "  want=#{want}  have=#{have}  ratio=#{have > 0 ? (want.to_f / have).round(2) : "n/a"}"
    puts "  last_surfaced: #{listing.last_surfaced_at&.to_date || "never"}"
    puts
    puts "  TOTAL SCORE: #{score.round(3)}"
    puts "  ─────────────────────────────"
    puts "  vintage:     #{breakdown[:vintage]}"
    puts "  condition:   #{breakdown[:condition]}#{breakdown[:condition] == 0 ? " (condition=#{listing.condition.inspect} not matched)" : ""}"
    puts "  desirability: #{breakdown[:desirability].round(3)}"
    whr      = WantHaveRatio.new(want, have)
    log_line = "    log10(#{total}).clamp(0,#{WantHaveRatio::LOG_CAP}): #{
      total > 0 ? Math.log10(total).clamp(0, WantHaveRatio::LOG_CAP).round(3) : 0
    }"
    bonus_line = if whr.high?
      "    ratio bonus/penalty: +#{ScoreStrategies::DesirabilityStrategy::HIGH_BONUS}"
    elsif whr.low?
      "    ratio bonus/penalty: #{ScoreStrategies::DesirabilityStrategy::LOW_PENALTY}"
    elsif have < WantHaveRatio::MIN_HAVE
      "    ratio bonus/penalty: n/a (have < #{WantHaveRatio::MIN_HAVE})"
    else
      "    ratio bonus/penalty: none"
    end
    puts log_line
    puts bonus_line
    puts "  metadata:    #{breakdown[:metadata]}"
    puts "  freshness:   #{breakdown[:freshness]}"
    puts "  noise:       #{breakdown[:noise].round(3)}"
  end

  desc "Onboard a new store: create Store, kick off full sync — rake milkcrate:add_store[discogs_username]"
  task :add_store, [ :discogs_username ] => :environment do |_, args|
    username = args[:discogs_username]
    raise "Usage: rake milkcrate:add_store[discogs_username]" if username.blank?

    result = StoreOnboarding.call(discogs_username: username)
    store = result.store

    puts "Store created: #{store.name} (@#{store.discogs_username})"
    puts "Sync queued. Store will be live at: /#{store.discogs_username}"
  end

  desc "Normalize existing discogs_username values to lowercase"
  task normalize_usernames: :environment do
    updated = Store.where("discogs_username != LOWER(discogs_username)")
                   .update_all("discogs_username = LOWER(discogs_username)")

    if updated == 0
      puts "All #{Store.count} store(s) already have lowercase discogs_username."
    else
      puts "Normalized #{updated} store(s) discogs_username to lowercase."
    end
  end

  desc "Print curation and enrichment stats for the current store"
  task stats: :environment do
    store = demo_store
    total      = store.listings.count
    available  = store.listings.available.count
    lp         = store.listings.available.lp_only.count
    surfaced   = store.listings.where.not(last_surfaced_at: nil).count
    never      = store.listings.where(last_surfaced_at: nil).count
    fresh      = store.listings.where("last_surfaced_at > ?", 3.days.ago).count
    genres     = store.listings.available.lp_only.pluck(:genres).flatten.tally.sort_by { |_, c| -c }

    enriched        = Release.where.not(enriched_at: nil).count
    discogs_missing = Release.where(discogs_image_missing: true).count
    mb_searched     = Release.where.not(musicbrainz_id: nil).count
    mb_found        = Release.where("musicbrainz_id != ''").count
    full_images     = store.listings.where("cover_image_url != thumbnail_url AND cover_image_url IS NOT NULL").count

    puts "Store:     #{store.name} (@#{store.discogs_username})"
    puts "Listings:  #{total} total · #{available} available · #{lp} LP/album"
    puts "Surfacing: #{surfaced} surfaced · #{never} never surfaced · #{fresh} surfaced in last 3 days"
    puts "Images:    #{full_images}/#{total} full-res · #{discogs_missing} no Discogs image · #{mb_searched} MB searched · #{mb_found} MB matched"
    puts "Enriched:  #{enriched}/#{Release.count} releases enriched"
    puts "Genres (LP, available):"
    genres.first(15).each { |g, c| puts "  #{g.ljust(20)} #{c}" }
    puts "  … (#{genres.size} genres total)" if genres.size > 15
  end
end
