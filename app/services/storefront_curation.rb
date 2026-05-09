require "set"

class StorefrontCuration
  def initialize(store)
    @store = store
  end

  def crates
    picks_list = picks_strategy.select(eligible_listings, excluded_ids: Set.new, count: 12)
    picks_ids = picks_list.map(&:id).to_set

    featured_crates = build_featured_crates(excluded_ids: picks_ids)
    featured_ids = featured_crates.flat_map(&:listings).map(&:id).to_set
    all_excluded = picks_ids | featured_ids

    [
      CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: picks_list),
      *featured_crates,
      *build_genre_crates(excluded_ids: all_excluded)
    ]
  end

  def storefront_sections
    picks_crate = CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: picks_strategy.select(eligible_listings, excluded_ids: Set.new, count: 12))
    seen_ids = picks_crate.listings.map(&:id).to_set

    sections = [ { key: "picks_wall", crate: picks_crate } ]

    featured_crates = build_featured_crates(excluded_ids: seen_ids)
    if featured_crates.present?
      featured_crates.each { |crate| crate.listings.each { |listing| seen_ids.add(listing.id) } }
      sections << { key: "featured_crates", crates: featured_crates }
    end

    sections << { key: "genre_grid", crates: build_genre_crates(excluded_ids: seen_ids) }
    sections
  end

  def surfaced_listings
    storefront_sections.flat_map { |section|
      crates = []
      crates << section[:crate] if section[:crate]
      crates.concat(section[:crates]) if section[:crates]
      crates
    }.flat_map(&:listings).uniq(&:id)
  end

  private

  # -----------------------------------------------------------------------
  # Featured crates (New Arrivals + Thematic + Hidden Gems)
  # -----------------------------------------------------------------------

  def build_featured_crates(excluded_ids:)
    crates = []
    seen   = excluded_ids.dup

    new_arrivals = build_new_arrivals_crate(excluded_ids: seen)
    if new_arrivals
      crates << new_arrivals
      new_arrivals.listings.each { |l| seen.add(l.id) }
    end

    thematic = build_thematic_crate(excluded_ids: seen)
    if thematic
      crates << thematic
      thematic.listings.each { |l| seen.add(l.id) }
    end

    hidden_gems = build_hidden_gems_crate(excluded_ids: seen)
    crates << hidden_gems if hidden_gems

    crates
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
    capped = listings.first(CuratedCrate::CRATE_SIZE)
    crate = CuratedCrate.new(slug: "thematic", name:, listings: capped)
    return unless crate.viable?

    crate
  end

  # -----------------------------------------------------------------------
  # Genre crates
  # -----------------------------------------------------------------------

  def build_genre_crates(excluded_ids:)
    seen_ids = excluded_ids.dup
    scorer   = RecordScorer.new(genre_counts:, today: Date.today)

    # Score all eligible (non-excluded) listings once, sorted best-first.
    # Each genre then filters its slice from this shared scored pool.
    scored = eligible_listings
      .reject { |l| excluded_ids.include?(l.id) }
      .map    { |l| [ l, scorer.score(l) ] }
      .sort_by { |_, s| -s }

    genre_counts.sort_by { |_, count| -count }.filter_map do |genre, _|
      listings = scored
        .select { |l, _| l.primary_genre == genre && !seen_ids.include?(l.id) }
        .first(CuratedCrate::CRATE_SIZE)
        .map(&:first)

      crate = CuratedCrate.new(slug: genre.parameterize, name: genre, listings:)
      next unless crate.viable?

      listings.each { |listing| seen_ids.add(listing.id) }
      crate
    end
  end

  # -----------------------------------------------------------------------
  # Strategies (lazy)
  # -----------------------------------------------------------------------

  def picks_strategy
    @picks_strategy ||= CrateStrategies::Picks.new(genre_counts:, today: Date.today)
  end

  def new_arrivals_strategy
    @new_arrivals_strategy ||= CrateStrategies::NewArrivals.new(genre_counts:, today: Date.today)
  end

  def thematic_strategy
    @thematic_strategy ||= CrateStrategies::Thematic.new(
      store_id: @store.id,
      genre_counts:,
      today: Date.today
    )
  end

  def hidden_gems_strategy
    @hidden_gems_strategy ||= CrateStrategies::HiddenGems.new(genre_counts:)
  end

  def build_hidden_gems_crate(excluded_ids:)
    listings = hidden_gems_strategy.select(eligible_listings, excluded_ids:)
    return if listings.empty?

    capped = listings.first(CuratedCrate::CRATE_SIZE)
    crate = CuratedCrate.new(slug: "hidden-gems", name: "Hidden Gems", listings: capped)
    return unless crate.viable?

    crate
  end

  # -----------------------------------------------------------------------
  # Data sources
  # -----------------------------------------------------------------------

  def eligible_listings
    @eligible_listings ||= begin
      scope = @store.listings
      scope = scope.available unless Rails.env.development?
      scope.lp_only.to_a
    end
  end

  def genre_counts
    @genre_counts ||= eligible_listings.map(&:primary_genre).compact.tally
  end
end
