module Experiments
  class SeedGenerator
    class Error < StandardError; end

    Result = Data.define(:seed_data, :band_counts, :total_records, :duplicate_count)

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

      scored = score_listings(listings)
      binned = bin_by_band(scored)
      sampled = sample_from_bins(binned)
      seed_data = build_seed_data(all_listings: listings, sampled:, scored:)

      Result.new(
        seed_data:,
        band_counts: sampled.transform_values(&:size),
        total_records: seed_data.size,
        duplicate_count: seed_data.count { |e| e[:is_duplicate_of] }
      )
    end

    private

    attr_reader :store_id, :crate_name

    # ── Memoized collaborators ──────────────────────────

    def store
      @store ||= Store.find(store_id)
    end

    def genre_counts
      @genre_counts ||= Listings::AvailableQuery.new(relation: store.listings)
        .call.lp_only.pluck(:genres).map(&:first).compact.tally
    end

    def scorer
      @scorer ||= RecordScorer.new(genre_counts:, today: Date.today)
    end

    # ── Pipeline steps ──────────────────────────────────

    def fetch_listings
      # The `available` scope starts from Listing.all rather than chaining
      # the current relation, so `store.listings.available` returns all stores'
      # listings. Pass the store-scoped relation directly to AvailableQuery.
      Listings::AvailableQuery.new(relation: store.listings).call.lp_only.to_a
    end

    def score_listings(listings)
      listings.map do |listing|
        { listing:, score: scorer.score(listing) }
      end
    end

    def bin_by_band(scored)
      bands = Settings.experiments.bands
      scored.each_with_object(Hash.new { |h, k| h[k] = [] }) do |entry, bins|
        bins[band_for(entry[:score], bands)] << entry
      end
    end

    def band_for(score, bands)
      if score >= bands.hot_threshold
        :hot
      elsif score >= bands.warm_threshold
        :warm
      elsif score >= bands.cold_threshold
        :cold
      else
        :lukewarm
      end
    end

    def sample_from_bins(binned)
      samples_per = Settings.experiments.samples_per_band
      max_genre_pct = 0.4  # no single genre > 40% of any band's sample

      %i[hot warm cold lukewarm].each_with_object({}) do |band, sampled|
        pool = binned[band]
        if pool.empty?
          Rails.logger.warn("[SeedGenerator] Band #{band} has no listings — skipping")
          sampled[band] = []
          next
        end

        sampled[band] = balanced_sample(pool, samples_per, max_genre_pct)
      end
    end

    def balanced_sample(pool, count, max_genre_pct)
      if pool.size <= count
        Rails.logger.warn("[SeedGenerator] Band pool (#{pool.size}) <= requested (#{count}) — using all available")
        return pool.shuffle
      end

      sorted = pool.sort_by { |e| e[:listing].primary_genre.to_s }
      genres = sorted.group_by { |e| e[:listing].primary_genre.to_s }

      limit = (count * max_genre_pct).ceil
      sampled = []
      genre_indices = Hash.new(0)

      count.times do
        available = genres.keys.select { |g|
          genre_indices[g] < [ genres[g].size, limit ].min && genres[g].any?
        }
        if available.empty?
          available = genres.keys.select { |g| genres[g].any? }
        end

        genre = available.sample
        entry = genres[genre].shift
        genre_indices[genre] += 1
        sampled << entry
      end

      sampled.shuffle
    end

    def build_seed_data(all_listings:, sampled:, scored:)
      # Build a lookup from listing → {listing, score} for fast score access
      scored_by_listing = scored.each_with_object({}) { |e, h| h[e[:listing]] = e }
      flat_entries = sampled.values.flatten

      dup_count = Settings.experiments.duplicate_count

      # Gather duplicate candidates: listings whose discogs_release_id
      # matches one already in the sampled set but is a different listing.
      duplicates = if dup_count > 0
                     release_ids = flat_entries.map { |e| e[:listing].discogs_release_id }.compact
                     candidates = all_listings.select { |l|
                       l.discogs_release_id.present? &&
                         release_ids.include?(l.discogs_release_id) &&
                         !flat_entries.any? { |e| e[:listing] == l }
                     }
                     if candidates.size < dup_count
                       Rails.logger.warn("[SeedGenerator] Found only #{candidates.size} duplicates (wanted #{dup_count})")
                     end
                     candidates.first(dup_count)
      else
                     []
      end

      # Add scored entries for duplicates
      dup_entries = duplicates.map { |l| scored_by_listing[l] || { listing: l, score: scorer.score(l) } }

      # Build the ordered list: sampled items first, then duplicates.
      ordered = flat_entries + dup_entries
      flat_entries_set = flat_entries.to_set { |e| e[:listing] }

      ordered.each_with_index.map do |entry, position|
        listing = entry[:listing]
        score = entry[:score]
        seed_entry = build_seed_entry(listing:, position:, score:)

        if flat_entries_set.include?(listing)
          seed_entry[:is_duplicate_of] = nil
        else
          original = flat_entries.find { |e| e[:listing].discogs_release_id == listing.discogs_release_id }
          seed_entry[:is_duplicate_of] = original ? flat_entries.index(original) : nil
        end
        seed_entry
      end
    end

    def build_seed_entry(listing:, position:, score:)
      {
        position:,
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
        band: band_for(score, Settings.experiments.bands),
        algorithm_score: score,
        is_duplicate_of: nil
      }
    end
  end
end
