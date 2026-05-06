require "set"

class StorefrontCuration
  FEATURED_CRATE_SIZE = 4
  FEATURED_MIN_RECORDS = 4
  GENRE_CRATE_SIZE = 50

  def initialize(store)
    @store = store
    @arrivals_policy = NewArrivalsPolicy.new
  end

  # Compatibility surface for current UI.
  def crates
    picks_list = selector.select_picks(count: 12)
    picks_ids = picks_list.map(&:id).to_set

    [
      CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: picks_list),
      *build_genre_crates(excluded_ids: picks_ids)
    ]
  end

  def storefront_sections
    picks_crate = CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: selector.select_picks(count: 12))
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

  def build_featured_crates(excluded_ids:)
    new_arrivals_listings = new_arrivals_listings(excluded_ids: excluded_ids)
    featured_seen_ids = excluded_ids | new_arrivals_listings.map(&:id).to_set

    new_arrivals = CuratedCrate.new(
      slug: "new-arrivals",
      name: "New Arrivals",
      listings: new_arrivals_listings
    )
    thematic = thematic_crate(excluded_ids: featured_seen_ids)

    return [] if [ new_arrivals, thematic ].any? { |crate| crate.listings.size < FEATURED_MIN_RECORDS }

    [ new_arrivals, thematic ]
  end

  def build_genre_crates(excluded_ids:)
    seen_ids = excluded_ids.dup

    genre_counts.filter_map do |genre, _|
      listings = selector.rank_genre(genre)
        .reject { |listing| seen_ids.include?(listing.id) }
        .first(GENRE_CRATE_SIZE)
      next if listings.empty?

      listings.each { |listing| seen_ids.add(listing.id) }
      CuratedCrate.new(slug: genre.parameterize, name: genre, listings: listings)
    end
  end

  def new_arrivals_listings(excluded_ids:)
    pool = eligible_listings.reject { |listing| excluded_ids.include?(listing.id) }
    @arrivals_policy.select(pool, sort_key: ->(listing) { sort_timestamp_for(listing) })
  end

  def thematic_crate(excluded_ids:)
    selection = StorefrontThemeRotation.new(@store, listings: eligible_listings).select(excluded_ids:)
    selection&.crate || CuratedCrate.new(slug: "thematic", name: "Daily Rotation", listings: [])
  end

  def sort_timestamp_for(listing)
    listing.listed_at&.to_i || listing.last_seen_at&.to_i || 0
  end

  def selector
    @selector ||= PicksSelector.new(@store)
  end

  def eligible_listings
    @eligible_listings ||= @store.listings.available.lp_only.to_a
  end

  def genre_counts
    @genre_counts ||= eligible_listings.map(&:primary_genre).compact.tally.sort_by { |_, count| -count }
  end
end
