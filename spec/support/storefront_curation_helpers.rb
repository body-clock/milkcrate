module StorefrontCurationHelpers
  def lp_listing(store, overrides = {})
    create(:listing, store:, format: "LP", last_seen_at: Time.current, **overrides)
  end

  def lp_listings(store, count:, genres:, styles:, listed_at: Time.current)
    create_list(:listing, count, store:, format: "LP", last_seen_at: Time.current, genres:, styles:, listed_at:)
  end

  def curation_with_selector(store, picks:, rank_genre_map:)
    selector = instance_double(PicksSelector)
    allow(selector).to receive(:select_picks).with(count: 12).and_return(picks)
    allow(selector).to receive(:rank_genre) do |genre|
      rank_genre_map.fetch(genre, [])
    end
    allow(PicksSelector).to receive(:new).with(store).and_return(selector)
    described_class.new(store)
  end

  def section_crate(section)
    section.fetch(:crate)
  end

  def section_crates(section)
    section.fetch(:crates)
  end
end
