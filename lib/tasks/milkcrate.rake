# DEPRECATED: These tasks are preserved for transition but will be removed.
#
# Use the replacement tasks below instead — they accept an explicit store
# username and do exactly what their name says (no hidden chaining).
#
# Dev lifecycle:  tools:start, tools:load, tools:stop, tools:clean
# Per-store ops:  stores:sync[user], stores:enrich[user], stores:curate[user],
#                 stores:stats[user], stores:score[user,id],
#                 stores:reset_surfacing[user], stores:add[user]

namespace :milkcrate do
  def demo_store
    store = Store.find_by(discogs_username: Settings.demo_store.discogs_username)
    raise "No store found for username '#{Settings.demo_store.discogs_username}'. Create one via the Rails console." unless store
    store
  end

  desc "[DEPRECATED] Use stores:sync[username] instead"
  task sync: :environment do
    puts "WARNING: `milkcrate:sync` is deprecated. Use `stores:sync[username]` instead."
    store = demo_store
    service = StoreSyncService.new(store)
    puts "Syncing #{store.name} (@#{store.discogs_username})..."
    synced_count = service.full_sync
    puts "Synced #{synced_count} listings."
  end

  desc "[DEPRECATED] Use stores:enrich[username] instead"
  task enrich: :environment do
    puts "WARNING: `milkcrate:enrich` is deprecated. Use `stores:enrich[username]` instead."
    store = demo_store
    puts "Enriching metadata and images for #{store.name}..."
    EnrichmentJob.perform_now(store.id)
    puts "Enrichment complete."
  end

  desc "[DEPRECATED] Use stores:curate[username] instead"
  task curate: :environment do
    puts "WARNING: `milkcrate:curate` is deprecated. Use `stores:curate[username]` instead."
    store = demo_store
    puts "Running curation for #{store.name}..."
    DailyCurationJob.perform_now(store.id)
    puts "Done."
  end

  desc "[DEPRECATED] Use stores:reset_surfacing[username] instead"
  task reset_surfacing: :environment do
    puts "WARNING: `milkcrate:reset_surfacing` is deprecated. Use `stores:reset_surfacing[username]` instead."
    store = demo_store
    count = store.listings.update_all(last_surfaced_at: nil, surface_count: 0)
    puts "Reset surfacing data for #{count} listings in #{store.name}."
  end

  desc "[DEPRECATED] Use stores:stats[username] instead"
  task stats: :environment do
    puts "WARNING: `milkcrate:stats` is deprecated. Use `stores:stats[username]` instead."
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

  desc "[DEPRECATED] Use stores:add[username] instead"
  task :add_store, [ :discogs_username ] => :environment do |_, args|
    puts "WARNING: `milkcrate:add_store` is deprecated. Use `stores:add[username]` instead."
    username = args[:discogs_username]
    raise "Usage: rake milkcrate:add_store[discogs_username]" if username.blank?

    result = StoreOnboarding.call(discogs_username: username)
    store = result.store

    puts "Store created: #{store.name} (@#{store.discogs_username})"
    puts "Sync queued. Store will be live at: /#{store.discogs_username}"
  end

  desc "[DEPRECATED] Use stores:score[username,listing_id] instead"
  task :score, [ :id ] => :environment do |_, args|
    puts "WARNING: `milkcrate:score[ID]` is deprecated. Use `stores:score[username,listing_id]` instead."
    raise "Usage: rake milkcrate:score[LISTING_ID]" unless args[:id]

    store    = demo_store
    listing  = store.listings.find(args[:id])
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
end
