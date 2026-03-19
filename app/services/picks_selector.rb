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

  private

  def score_all(listing_ids: nil)
    scope = @store.listings.where.not(genres: "{}")
    scope = scope.where(id: listing_ids) if listing_ids&.any?
    listings = scope.to_a

    genre_counts = @store.listings.pluck(:genres).flatten.tally

    listings.map { |listing| [ listing, score(listing, genre_counts) ] }
  end

  def score(listing, genre_counts)
    points = 0

    # Discovery styles — the stuff worth digging for
    matching_styles = listing.styles & DISCOVERY_STYLES
    points += matching_styles.size * 3

    # Genre diversity — crossover records are interesting
    points += (listing.genres.size - 1) * 2 if listing.genres.size > 1

    # Vintage
    points += 2 if listing.year && listing.year < VINTAGE_BEFORE

    # Good condition
    points += 1 if %w[Mint NM M VG+].include?(listing.condition&.strip)

    # Small section penalty reversed — records from tiny sections deserve a spotlight
    points += 3 if genre_counts.fetch(listing.primary_genre, 0) < 5

    points
  end
end
