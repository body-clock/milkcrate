class PicksSelector
  POOL_SIZE = 100

  # Styles that suggest a record worth digging for —
  # world music, experimental, genre-bending, and the idiosyncratic corners
  # that make a record store feel alive.
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

  # Vintage cutoff — anything from these eras gets a bump
  VINTAGE_BEFORE = 1980
  CROWDED_SECTION_THRESHOLD = 15
  RARE_STYLE_THRESHOLD = 3
  RARE_STYLE_BOOST = 2

  # Condition variants that count as "good"
  GOOD_CONDITIONS = %w[Mint NM M VG+].freeze
  CONDITION_ALIASES = {
    "near mint" => "NM",
    "m-" => "M",
    "mint-" => "M"
  }.freeze

  def initialize(store)
    @store = store
  end

  def select(count: 20, seed: nil, listing_ids: nil)
    candidates = score_all(listing_ids: listing_ids)

    # Prefer scored records but pad with unscored ones if the pool is thin
    scored    = candidates.select { |_, s| s > 0 }.max_by(POOL_SIZE) { |_, s| s }.map(&:first)
    remainder = candidates.reject { |_, s| s > 0 }.map(&:first)
    pool      = (scored + remainder).first(POOL_SIZE)

    shuffle_seed = seed || Date.current.to_s.sum
    pool.sort_by { |listing| Digest::MD5.hexdigest("#{listing.id}#{shuffle_seed}") }.first(count)
  end

  def rank(listing_ids: nil)
    score_all(listing_ids: listing_ids)
      .sort_by { |_, s| -s }
      .map(&:first)
  end

  private

  def score_all(listing_ids: nil)
    scope = @store.listings.where.not(genres: "{}")
    scope = scope.where(id: listing_ids) if listing_ids&.any?
    listings = scope.to_a

    listings.map { |listing| [ listing, score(listing, store_genre_counts, store_style_counts) ] }
  end

  def score(listing, genre_counts, style_counts)
    points = 0

    # Discovery styles — the stuff worth digging for
    matching_styles = listing.styles & DISCOVERY_STYLES
    points += matching_styles.size * 3

    # Genre diversity — crossover records are interesting
    points += (listing.genres.size - 1) * 2 if listing.genres.size > 1

    # Vintage
    points += 2 if listing.year && listing.year < VINTAGE_BEFORE

    # Good condition (normalized: NM, Near Mint, M-, etc.)
    good = GOOD_CONDITIONS.include?(listing.condition&.strip) ||
           CONDITION_ALIASES.include?(listing.condition&.strip&.downcase)
    points += 1 if good

    # Small section penalty reversed — records from tiny sections deserve a spotlight
    points += 3 if genre_counts.fetch(listing.primary_genre, 0) < 5

    # Buried bin bonus — discovery records hidden in crowded sections are
    # exactly the kind of finds that reward patient digging in a real shop.
    if matching_styles.any? && genre_counts.fetch(listing.primary_genre, 0) >= CROWDED_SECTION_THRESHOLD
      points += 3
    end

    # Rare styles are closer to the record-store "wait, what's this?" feeling
    rare_styles = listing.styles.select { |style| style_counts.fetch(style, 0) < RARE_STYLE_THRESHOLD }
    points += rare_styles.size * RARE_STYLE_BOOST

    # Weak metadata penalty — records with no style, single genre, and no year
    # are low-information and probably not worth digging for
    if listing.styles.empty? && listing.genres.size <= 1 && listing.year.nil?
      points -= 1
    end

    points
  end

  def store_genre_counts
    @store_genre_counts ||= @store.listings.pluck(:genres).flatten.tally
  end

  def store_style_counts
    @store_style_counts ||= @store.listings.pluck(:styles).flatten.tally
  end
end
