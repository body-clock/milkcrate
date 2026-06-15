# Aggregates curated records across all ready stores for the explore page wall.
# Reuses RecordScorer and WallPolicy diversity logic from the per-store curation.
class CrossStoreWallCuration
  DEFAULT_LIMIT = 24
  CACHE_TTL = 24.hours
  CACHE_KEY = "explore/wall/v1/%<date>s/%<store_count>s/%<limit>s"

  def self.call(limit: DEFAULT_LIMIT)
    new(limit).call
  end

  def initialize(limit = DEFAULT_LIMIT)
    @limit = limit
  end

  def call
    Rails.cache.fetch(cache_key, expires_in: CACHE_TTL) do
      build_wall_records
    end
  end

  private

  def build_wall_records
    listings = fetch_eligible_listings
    return [] if listings.empty?

    curation_axis = determine_curation_axis(listings)
    scored = score_listings(listings, curation_axis)
    diverse = apply_diversity_cap(scored, curation_axis)

    diverse.map { |listing, _score| serialize_record(listing) }
  end

  def fetch_eligible_listings
    Listing
      .joins(:store)
      .merge(Store.ready)
      .where.not(cover_image_url: nil)
      .where.not(last_surfaced_at: nil)
      .where("listed_at > ?", 1.year.ago)
      .lp_only
      .to_a
  end

  def score_listings(listings, curation_axis)
    genre_counts = curation_axis.tally_from(listings)
    scorer = build_scorer(genre_counts)

    listings.map { |listing| [ listing, scorer.score(listing) ] }
  end

  def determine_curation_axis(listings)
    deep_genre_count = listings.map(&:primary_genre).compact.tally
      .count { |_, count| count >= (listings.size * 0.05) }

    deep_genre_count >= 3 ? GenresAxis.new : StylesAxis.new
  end

  def build_scorer(genre_counts)
    defaults = RecordScorer.default_strategies(genre_counts:, today: Date.today)
    RecordScorer.new(
      strategies: defaults.merge(wall_price: ScoreStrategies::WallPriceStrategy.new),
      genre_counts:,
      today: Date.today
    )
  end

  def apply_diversity_cap(scored, curation_axis)
    policy = WallPolicy.new
    genre_cap = policy.genre_cap(@limit)
    genre_seen = Hash.new(0)
    shuffle_seed = Date.today.to_s.sum

    sorted = scored.sort_by { |listing, score| policy.sort_key(listing, score, shuffle_seed) }
    diverse = filter_by_diversity(sorted, curation_axis, genre_cap, genre_seen)
    diverse.uniq { |listing, _| listing.id }.first(@limit)
  end

  def filter_by_diversity(sorted, curation_axis, genre_cap, genre_seen)
    sorted.filter_map do |listing, score|
      genre = curation_axis.key_for(listing)
      next if genre_seen[genre] >= genre_cap

      genre_seen[genre] += 1
      [ listing, score ]
    end
  end

  def serialize_record(listing)
    {
      id: listing.id,
      title: listing.title,
      artist: listing.artist,
      cover_image_url: listing.cover_image_url,
      store_slug: listing.store.discogs_username,
      store_name: listing.store.name
    }
  end

  def cache_key
    store_count = Store.ready.count
    CACHE_KEY % { date: Date.current.iso8601, store_count:, limit: @limit }
  end
end
