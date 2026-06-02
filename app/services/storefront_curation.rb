class StorefrontCuration
  def self.cached_curation(...) = CacheManager.cached_curation(...)
  def self.write_curation_cache(...) = CacheManager.write_curation_cache(...)

  def initialize(store, filter_available: true)
    @store = store
    @filter_available = filter_available
  end

  def crates
    picks_list, picks_ids = picks_setup
    featured_crates = build_featured_crates(excluded_ids: picks_ids)
    featured_ids = featured_crates.flat_map(&:listings).map(&:id).to_set

    [
      CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: picks_list),
      *featured_crates,
      *build_genre_crates(excluded_ids: picks_ids | featured_ids)
    ]
  end

  def storefront_groups
    picks_crate = CuratedCrate.new(
      slug: "picks",
      name: "Milkcrate Picks",
      listings: picks_strategy.select(eligible_listings, excluded_ids: Set.new, count: 15)
    )
    seen_ids = picks_crate.listings.map(&:id).to_set

    featured_crates = build_featured_crates(excluded_ids: seen_ids)
    featured_crates.each { |crate| crate.listings.each { |listing| seen_ids.add(listing.id) } }

    {
      picks: picks_crate,
      featured: featured_crates,
      genres: build_genre_crates(excluded_ids: seen_ids)
    }
  end

  def surfaced_listings
    groups = storefront_groups
    ([ groups[:picks] ] + groups[:featured] + groups[:genres]).flat_map(&:listings).uniq(&:id)
  end

  private

  def picks_setup
    picks_list = picks_strategy.select(eligible_listings, excluded_ids: Set.new, count: 15)
    [ picks_list, picks_list.map(&:id).to_set ]
  end

  def build_featured_crates(excluded_ids:)
    seen = excluded_ids.dup
    crates = add_crate(seen, build_new_arrivals_crate(excluded_ids: seen))
    crates += add_crate(seen, build_thematic_crate(excluded_ids: seen))
    crates += add_crate(seen, build_hidden_gems_crate(excluded_ids: seen))
    crates
  end

  def add_crate(seen, crate)
    return [] unless crate
    crate.listings.each { |l| seen.add(l.id) }
    [ crate ]
  end

  def build_new_arrivals_crate(excluded_ids:)
    listings = new_arrivals_strategy.select(eligible_listings, excluded_ids:)
      .first(CuratedCrate::CRATE_SIZE)

    crate = CuratedCrate.new(slug: "new-arrivals", name: "New Arrivals", listings:)
    return unless crate.viable?

    crate
  end

  def build_thematic_crate(excluded_ids:)
    result = thematic_strategy.select(eligible_listings, excluded_ids:)
    return if result.nil?

    name, listings = result
    viable_crate(slug: "thematic", name:, listings:)
  end

  def viable_crate(slug:, name:, listings:, size: CuratedCrate::CRATE_SIZE)
    capped = listings.first(size)
    crate = CuratedCrate.new(slug:, name:, listings: capped)
    return unless crate.viable?

    crate
  end

  def build_genre_crates(excluded_ids:)
    seen_ids = excluded_ids.dup

    genre_counts.sort_by { |_, count| -count }.filter_map do |genre, _|
      genre_crate(genre:, seen_ids:)
    end
  end

  def genre_crate(genre:, seen_ids:)
    listings = genre_listings(genre, seen_ids)
    return if listings.empty?
    build_and_track(genre, listings, seen_ids)
  end

  def build_and_track(genre, listings, seen_ids)
    crate = CuratedCrate.new(slug: genre.parameterize, name: genre, listings:)
    return unless crate.viable?

    seen_ids.merge(listings.map(&:id))
    crate
  end
  def genre_listings(genre, seen_ids)
    strategy = CrateStrategies::Genre.new(genre:, genre_counts:, today: Date.today)
    strategy.select(eligible_listings, excluded_ids: seen_ids)
  end
  # Strategies
  def picks_strategy = @picks_strategy ||= CrateStrategies::Picks.new(genre_counts:, today: Date.today)

  def new_arrivals_strategy = @new_arrivals_strategy ||= CrateStrategies::NewArrivals.new(genre_counts:, today: Date.today)

  def thematic_strategy
    @thematic_strategy ||= CrateStrategies::Thematic.new(
      store_id: @store.id,
      genre_counts:,
      today: Date.today
    )
  end

  def hidden_gems_strategy = @hidden_gems_strategy ||= CrateStrategies::HiddenGems.new(genre_counts:, today: Date.today)

  def build_hidden_gems_crate(excluded_ids:)
    listings = hidden_gems_strategy.select(eligible_listings, excluded_ids:)
    return if listings.empty?

    viable_crate(slug: "hidden-gems", name: "Hidden Gems", listings:)
  end
  # Data sources
  def eligible_listings
    @eligible_listings ||= begin
      scope = @store.listings
      scope = scope.available if @filter_available
      scope.lp_only.to_a
    end
  end

  def genre_counts = @genre_counts ||= eligible_listings.map(&:primary_genre).compact.tally
end
