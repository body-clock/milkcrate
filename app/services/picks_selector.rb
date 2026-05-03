class PicksSelector
  POOL_SIZE = 100
  VINTAGE_BEFORE = 1980
  SMALL_GENRE_THRESHOLD = 5
  SMALL_GENRE_BOOST = 3

  GOOD_CONDITIONS = %w[Mint NM M VG+].freeze
  CONDITION_ALIASES = {
    "near mint" => "NM",
    "m-" => "M",
    "mint-" => "M"
  }.freeze

  WANT_HAVE_RATIO_HIGH = 2.0
  WANT_HAVE_RATIO_LOW  = 0.5
  WANT_HAVE_MIN_HAVE   = 10  # ignore ratio on thinly-traded releases
  WANT_HAVE_HIGH_BONUS = 5.0
  WANT_HAVE_LOW_PENALTY = -2.0
  DESIRABILITY_LOG_CAP = 4.0

  # Freshness: days since last surfaced → penalty points
  STALENESS_CURVE = [
    [ 3,  -5 ],
    [ 7,  -3 ],
    [ 14, -1 ]
  ].freeze

  # Daily noise magnitude (±). Seeded so it's stable within a day.
  NOISE_MAGNITUDE = 1.5

  def initialize(store, today: Date.today)
    @store = store
    @today = today
  end

  # Returns listings for picks crate: top records across the full inventory,
  # genre-diverse, freshness-adjusted.
  def select_picks(count: 12, seed: nil)
    scored = score_all
    shuffle_seed = seed || @today.to_s.sum

    # Genre-diverse: cap per-genre representation
    genre_cap = [ count / 3, 2 ].max
    genre_seen = Hash.new(0)

    scored
      .sort_by { |listing, s| [ -s, Digest::MD5.hexdigest("#{listing.id}#{shuffle_seed}") ] }
      .filter_map { |listing, _|
        genre = listing.primary_genre
        next if genre_seen[genre] >= genre_cap
        genre_seen[genre] += 1
        listing
      }
      .uniq(&:id)
      .first(count)
  end

  # Returns all scored listings for a genre, sorted best-first.
  # Used by genre bins — operates on full inventory, not a daily pick subset.
  def rank_genre(genre)
    score_all
      .select { |listing, _| listing.primary_genre == genre }
      .sort_by { |_, s| -s }
      .map(&:first)
  end

  # Legacy: used by tests + crate_presenter for picks crate building
  def rank(listing_ids: nil)
    score_all(listing_ids: listing_ids)
      .sort_by { |_, s| -s }
      .map(&:first)
  end

  private

  def score_all(listing_ids: nil)
    return scored_inventory.select { |l, _| listing_ids.include?(l.id) } if listing_ids&.any?
    scored_inventory
  end

  def scored_inventory
    @scored_inventory ||= begin
      listings = @store.listings.available.lp_only.to_a
      gc = store_genre_counts
      listings.map { |l| [ l, score(l, gc) ] }
    end
  end

  def score(listing, genre_counts)
    vintage_points(listing) +
      condition_points(listing) +
      section_points(listing, genre_counts, nil) +
      desirability_points(listing) +
      metadata_penalty(listing) +
      freshness_score(listing) +
      daily_noise(listing)
  end

  def vintage_points(listing)
    listing.year && listing.year < VINTAGE_BEFORE ? 2.0 : 0.0
  end

  def condition_points(listing)
    good = GOOD_CONDITIONS.include?(listing.condition&.strip) ||
           CONDITION_ALIASES.include?(listing.condition&.strip&.downcase)
    good ? 1.0 : 0.0
  end

  def section_points(listing, genre_counts, _style_counts)
    genre_count = genre_counts.fetch(listing.primary_genre.to_s, 0)
    genre_count < SMALL_GENRE_THRESHOLD ? SMALL_GENRE_BOOST : 0.0
  end

  def desirability_points(listing)
    have  = listing.have_count.to_i
    want  = listing.want_count.to_i
    total = want + have
    points = 0.0

    points += Math.log10(total).clamp(0, DESIRABILITY_LOG_CAP) if total > 0

    if have >= WANT_HAVE_MIN_HAVE
      ratio = want.to_f / have
      if ratio >= WANT_HAVE_RATIO_HIGH
        points += WANT_HAVE_HIGH_BONUS
      elsif ratio <= WANT_HAVE_RATIO_LOW
        points += WANT_HAVE_LOW_PENALTY
      end
    end

    points
  end

  def metadata_penalty(listing)
    listing.styles.empty? && listing.genres.size <= 1 && listing.year.nil? ? -1.0 : 0.0
  end

  def freshness_score(listing)
    return 3.0 if listing.last_surfaced_at.nil?

    days_ago = (@today - listing.last_surfaced_at.to_date).to_i

    STALENESS_CURVE.each do |threshold, penalty|
      return penalty.to_f if days_ago <= threshold
    end

    1.0 # seen >14 days ago — mild freshness bonus for rotation
  end

  def daily_noise(listing)
    seed_str = "#{listing.id}-#{@today}"
    # MD5 → 0..1 float → shift to -NOISE_MAGNITUDE..+NOISE_MAGNITUDE
    noise_unit = Digest::MD5.hexdigest(seed_str).to_i(16).to_f / (2**128)
    (noise_unit * 2 - 1) * NOISE_MAGNITUDE
  end

  def store_genre_counts
    @store_genre_counts ||= @store.listings.available.lp_only.pluck(:genres).map(&:first).compact.tally
  end
end
