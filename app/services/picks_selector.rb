class PicksSelector
  POOL_SIZE = 100

  DISCOVERY_STYLES = %w[
    Afrobeat Afro-Cuban Afro-Jazz Afropop Highlife Mbalax Benga Soukous
    Cumbia Salsa Bossa\ Nova Tropicália Samba Tango Bolero Mambo
    Dub Reggae Rocksteady Ska Lovers\ Rock Dancehall
    Funk Soul Gospel Deep\ Funk Boogie
    Experimental Avant-garde Noise Free\ Jazz Free\ Improvisation
    Spoken\ Word Comedy Soundtrack
    Krautrock Psych Folk\ Rock Acid\ Folk
    Minimal Electronic Ambient Industrial
    Exotica Space-Age Easy\ Listening Lounge
  ].freeze

  VINTAGE_BEFORE = 1980
  CROWDED_SECTION_THRESHOLD = 15
  RARE_STYLE_THRESHOLD = 3
  RARE_STYLE_BOOST = 2

  GOOD_CONDITIONS = %w[Mint NM M VG+].freeze
  CONDITION_ALIASES = {
    "near mint" => "NM",
    "m-" => "M",
    "mint-" => "M"
  }.freeze

  WANT_HAVE_RATIO_HIGH = 2.0
  WANT_HAVE_RATIO_LOW  = 0.5
  WANT_HAVE_MIN_HAVE   = 10  # ignore ratio on thinly-traded releases

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
      .select { |listing, _| listing.genres.include?(genre) }
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
      sc = store_style_counts
      listings.map { |l| [ l, score(l, gc, sc) ] }
    end
  end

  def score(listing, genre_counts, style_counts)
    discovery_points(listing) +
      diversity_points(listing) +
      vintage_points(listing) +
      condition_points(listing) +
      section_points(listing, genre_counts, style_counts) +
      desirability_points(listing) +
      metadata_penalty(listing) +
      freshness_score(listing) +
      daily_noise(listing)
  end

  def discovery_points(listing)
    (listing.styles & DISCOVERY_STYLES).size * 3.0
  end

  def diversity_points(listing)
    listing.genres.size > 1 ? (listing.genres.size - 1) * 2.0 : 0.0
  end

  def vintage_points(listing)
    listing.year && listing.year < VINTAGE_BEFORE ? 2.0 : 0.0
  end

  def condition_points(listing)
    good = GOOD_CONDITIONS.include?(listing.condition&.strip) ||
           CONDITION_ALIASES.include?(listing.condition&.strip&.downcase)
    good ? 1.0 : 0.0
  end

  def section_points(listing, genre_counts, style_counts)
    points = 0.0
    matching_styles = listing.styles & DISCOVERY_STYLES
    genre_count = genre_counts.fetch(listing.primary_genre, 0)

    points += 3 if genre_count < 5
    points += 3 if matching_styles.any? && genre_count >= CROWDED_SECTION_THRESHOLD

    rare_styles = listing.styles.select { |s| style_counts.fetch(s, 0) < RARE_STYLE_THRESHOLD }
    points += rare_styles.size * RARE_STYLE_BOOST

    points
  end

  def desirability_points(listing)
    have  = listing.have_count.to_i
    want  = listing.want_count.to_i
    total = want + have
    points = 0.0

    points += Math.log10(total).clamp(0, 3) if total > 0

    if have >= WANT_HAVE_MIN_HAVE
      ratio = want.to_f / have
      if ratio >= WANT_HAVE_RATIO_HIGH
        points += 3
      elsif ratio <= WANT_HAVE_RATIO_LOW
        points -= 1
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
    @store_genre_counts ||= @store.listings.available.lp_only.pluck(:genres).flatten.tally
  end

  def store_style_counts
    @store_style_counts ||= @store.listings.available.lp_only.pluck(:styles).flatten.tally
  end
end
