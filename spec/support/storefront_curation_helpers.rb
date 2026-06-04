module StorefrontCurationHelpers
  def lp_listing(store, overrides = {})
    create(:listing, store:, format: "LP", last_seen_at: Time.current, **overrides)
  end

  def lp_listings(store, count:, genres:, styles:, listed_at: Time.current)
    create_list(:listing, count, store:, format: "LP", last_seen_at: Time.current, genres:, styles:, listed_at:)
  end

  # Stubs strategies and scorer so tests control what each crate section contains.
  # genre_scores: { listing_id => score } — controls RecordScorer output for genre crates.
  # featured: array of CuratedCrate — stubs build_featured_crates return value.
  def curation_with_strategies(store, wall:, genre_scores: {}, featured: [])
    curation = described_class.new(store)

    wall_crate = CuratedCrate.new(slug: "wall", name: "The Wall", listings: wall)
    wall_double = instance_double(Wall,
      crate: wall_crate,
      excluded_ids: wall.map(&:id).to_set
    )
    allow(Wall).to receive(:new).and_return(wall_double)

    allow(curation).to receive(:build_featured_crates).and_return(featured)

    if genre_scores.any?
      scorer = instance_double(RecordScorer)
      allow(scorer).to receive(:score) { |listing| genre_scores.fetch(listing.id, 0) }
      allow(RecordScorer).to receive(:new).and_return(scorer)
    end

    curation
  end

  def section_crate(section)
    section.fetch(:crate)
  end

  def section_crates(section)
    section.fetch(:crates)
  end
end
