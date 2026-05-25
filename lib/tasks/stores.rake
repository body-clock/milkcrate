# Per-store operations — sync, enrich, curate, stats, and management.
#
# Every task here requires an explicit store username. No defaults.
# Each task is atomic — sync only syncs, enrich only enriches, etc.
#
# For dev environment bootstrap (Docker, DB, sample data), see tools.rake.

namespace :stores do
  # ── Helpers ──────────────────────────────────────────────────

  def find_store(username)
    raise "Usage: provide a store username, e.g. stores:sync[storename]" if username.blank?

    store = Store.find_by(discogs_username: username.downcase)
    raise "Store not found: '#{username}'. Onboard it first with `stores:add[username]`." unless store
    store
  end

  # ── Sync ─────────────────────────────────────────────────────

  desc "Full inventory sync from Discogs — stores:sync[username]"
  task :sync, [ :username ] => :environment do |_, args|
    require "ruby-progressbar"

    store = find_store(args[:username])

    max_pages = ENV["MAX_PAGES"]&.to_i
    page_hint = max_pages ? " (max #{max_pages} pages)" : ""

    puts "Syncing #{store.name} (@#{store.discogs_username})#{page_hint}..."

    progress = ProgressBar.create(
      title: "Pages",
      total: nil,
      format: "%t: %c/%C |%B| %e",
      throttle_rate: 0.5
    )

    service = StoreSyncService.new(store, progress:)
    synced_count = service.full_sync(max_pages:)
    progress.finish

    puts "Synced #{synced_count} listings."
  end

  # ── Enrich ───────────────────────────────────────────────────

  desc "Enrich releases: Discogs metadata + MusicBrainz images — stores:enrich[username]"
  task :enrich, [ :username ] => :environment do |_, args|
    require "ruby-progressbar"

    store = find_store(args[:username])
    puts "Enriching metadata and images for #{store.name}..."

    progress = ProgressBar.create(
      title: "Releases",
      total: nil,
      format: "%t: %c/%C |%B| %e",
      throttle_rate: 0.5
    )

    service = EnrichmentService.new(progress:)
    service.enrich_store(store)
    progress.finish

    puts "Enrichment complete."
  end

  # ── Curate ───────────────────────────────────────────────────

  desc "Run daily curation (stamp last_surfaced_at, compute picks rotation) — stores:curate[username]"
  task :curate, [ :username ] => :environment do |_, args|
    store = find_store(args[:username])
    puts "Running curation for #{store.name}..."
    DailyCurationJob.perform_now(store.id)
    puts "Done."
  end

  # ── Surfacng ─────────────────────────────────────────────────

  desc "Reset surfacing data (last_surfaced_at, surface_count) — stores:reset_surfacing[username]"
  task :reset_surfacing, [ :username ] => :environment do |_, args|
    store = find_store(args[:username])
    count = store.listings.update_all(last_surfaced_at: nil, surface_count: 0)
    puts "Reset surfacing data for #{count} listings in #{store.name}."
  end

  # ── Scoring ──────────────────────────────────────────────────

  desc "Score breakdown for a listing — stores:score[username,listing_id]"
  task :score, [ :username, :listing_id ] => :environment do |_, args|
    raise "Usage: stores:score[username,listing_id]" if args[:username].blank? || args[:listing_id].blank?

    store    = find_store(args[:username])
    listing  = store.listings.find(args[:listing_id])

    genre_counts = store.listings.available.lp_only.pluck(:genres).map(&:first).compact.tally
    scorer = RecordScorer.new(genre_counts:, today: Date.today)
    breakdown = scorer.score_breakdown(listing)
    score    = breakdown.values.sum

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

  # ── Stats ────────────────────────────────────────────────────

  desc "Print curation and enrichment stats for a store — stores:stats[username]"
  task :stats, [ :username ] => :environment do |_, args|
    store = find_store(args[:username])

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

  # ── Discogs Identity ─────────────────────────────────────

  desc "Refresh a store's stored Discogs profile ID — stores:discogs_identity[username]"
  task :discogs_identity, [ :username ] => :environment do |_, args|
    store = find_store(args[:username])

    puts "Refreshing Discogs identity for #{store.name} (@#{store.discogs_username})..."

    result = StoreDiscogsIdentityRefresh.call(store:)

    if result.success?
      puts "Updated discogs_user_id: #{store.reload.discogs_user_id}"
    else
      puts "Failed: #{result.error}"
      exit 1
    end
  end

  # ── Onboarding ───────────────────────────────────────────────

  desc "Onboard a new store: create Store, kick off full sync — stores:add[username]"
  task :add, [ :username ] => :environment do |_, args|
    username = args[:username]
    raise "Usage: stores:add[username]" if username.blank?

    result = StoreOnboarding.call(discogs_username: username)
    store = result.store

    puts "Store created: #{store.name} (@#{store.discogs_username})"
    puts "Sync queued. Store will be live at: /#{store.discogs_username}"
  end
end
