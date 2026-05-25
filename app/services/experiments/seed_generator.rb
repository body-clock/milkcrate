# Namespace for A/B experiment support utilities.
module Experiments
  # Generates deterministic random seeds for A/B experiments based on user and date.
  class SeedGenerator
    class Error < StandardError; end

    Result = Data.define(:seed_data, :total_records, :excluded_count)

    def self.call(store_id:, crate_name:)
      new(store_id:, crate_name:).call
    end

    def initialize(store_id:, crate_name:)
      @store_id = store_id
      @crate_name = crate_name
    end

    def call
      listings = fetch_listings
      raise Error, "No LP listings found for store #{store_id}" if listings.empty?

      excluded_ids = previously_labeled_ids
      scored = score_listings(listings)
      scored.reject! { |e| excluded_ids.include?(e[:listing].discogs_release_id) }
      excluded_count = excluded_ids.size

      top_n = scored.sort_by { |e| -e[:score] }.first(crate_size)
      seed_data = build_seed_data(top_n)

      Result.new(seed_data:, total_records: seed_data.size, excluded_count:)
    end

    private

    attr_reader :store_id, :crate_name

    def crate_size
      Settings.experiments.crate_size
    end

    # ── Memoized collaborators ──────────────────────────

    def store
      @store ||= Store.find(store_id)
    end

    def genre_counts
      @genre_counts ||= store.listings.lp_only.pluck(:genres).map(&:first).compact.tally
    end

    def scorer
      @scorer ||= begin
        strategies = RecordScorer.default_strategies(genre_counts:, today: Date.today)
        if Settings.experiments.disable_desirability
          strategies = strategies.except(:desirability)
        end
        if Settings.experiments.disable_freshness
          strategies = strategies.except(:freshness)
        end
        RecordScorer.new(strategies:, genre_counts:)
      end
    end

    # ── De-duplication ──────────────────────────────────

    def previously_labeled_ids
      experiments_dir = Rails.root.join("experiments")
      return [] unless Dir.exist?(experiments_dir)

      Dir.glob(experiments_dir.join("*/results.json")).flat_map do |path|
        JSON.parse(File.read(path)).map { |r| r["release_id"] || r["position"] }
      end.compact.uniq
    end

    # ── Pipeline steps ──────────────────────────────────

    def fetch_listings
      store.listings.lp_only
        .where("cover_image_url IS NOT NULL AND cover_image_url != '' AND cover_image_url NOT LIKE ?", "%/q:40/%")
        .to_a
    end

    def score_listings(listings)
      listings.map do |listing|
        { listing:, score: scorer.score(listing), breakdown: scorer.score_breakdown(listing) }
      end
    end

    def build_seed_data(top_n)
      top_n.each_with_index.map do |entry, position|
        listing = entry[:listing]
        score = entry[:score]
        breakdown = entry[:breakdown]

        {
          position:,
          crate: crate_name,
          discogs_release_id: listing.discogs_release_id,
          artist: listing.artist,
          title: listing.title,
          year: listing.year,
          genres: listing.genres,
          styles: listing.styles,
          condition: listing.condition,
          price: listing.price,
          format: listing.format,
          label: listing.label,
          want_count: listing.want_count,
          have_count: listing.have_count,
          cover_image_url: listing.cover_image_url,
          thumbnail_url: listing.thumbnail_url,
          algorithm_score: score,
          score_breakdown: breakdown,
          is_duplicate_of: nil
        }
      end
    end
  end
end
