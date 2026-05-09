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
  def curation_with_strategies(store, picks:, genre_scores: {}, featured: [])
    curation = described_class.new(store)

    picks_double = instance_double(CrateStrategies::Picks)
    allow(picks_double).to receive(:select).and_return(picks)
    allow(curation).to receive(:picks_strategy).and_return(picks_double)

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
