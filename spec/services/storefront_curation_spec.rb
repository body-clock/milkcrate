require "rails_helper"

RSpec.describe StorefrontCuration do
  def lp_listing(store, overrides = {})
    create(:listing, store:, format: "LP", last_seen_at: Time.current, **overrides)
  end

  describe "#crates" do
    it "returns an array of curated crates" do
      store = create(:store)
      lp_listing(store, genres: [ "Jazz" ])

      curation = described_class.new(store)
      expect(curation.crates).to all(be_a(StorefrontCuration::CuratedCrate))
    end

    it "returns picks crate with at most 12 records" do
      store = create(:store)
      15.times { |i| lp_listing(store, genres: [ "Genre#{i}" ]) }

      curation = described_class.new(store)
      picks_crate = curation.crates.find { |crate| crate.slug == "picks" }
      expect(picks_crate.listings.size).to be <= 12
    end

    it "returns only available LP listings in picks crate" do
      store = create(:store)
      lp_listing(store, genres: [ "Jazz" ])
      create(:listing, store:, format: "LP", last_seen_at: 10.days.ago, genres: [ "Rock" ])

      curation = described_class.new(store)
      picks_crate = curation.crates.find { |crate| crate.slug == "picks" }
      expect(picks_crate.listings.size).to eq(1)
    end

    it "adds genre crates after picks" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])
      allow_any_instance_of(PicksSelector).to receive(:select_picks).and_return([])
      allow_any_instance_of(PicksSelector).to receive(:rank_genre).and_return([ listing ])

      curation = described_class.new(store)
      crates = curation.crates
      expect(crates.first.slug).to eq("picks")
      expect(crates.map(&:name)).to include("Jazz")
    end

    it "excludes records that appear in picks" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])
      allow_any_instance_of(PicksSelector).to receive(:select_picks).and_return([ listing ])

      curation = described_class.new(store)
      jazz_crate = curation.crates.find { |crate| crate.name == "Jazz" }
      expect(jazz_crate&.listings || []).not_to include(listing)
    end

    it "skips genres with no records remaining after picks exclusion" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])
      allow_any_instance_of(PicksSelector).to receive(:select_picks).and_return([ listing ])
      allow_any_instance_of(PicksSelector).to receive(:rank_genre).and_return([ listing ])

      curation = described_class.new(store)
      expect(curation.crates.map(&:name)).not_to include("Jazz")
    end

    it "includes genres that have records not in picks" do
      store = create(:store)
      jazz1 = lp_listing(store, genres: [ "Jazz" ])
      jazz2 = lp_listing(store, genres: [ "Jazz" ])
      allow_any_instance_of(PicksSelector).to receive(:select_picks).and_return([ jazz1 ])
      allow_any_instance_of(PicksSelector).to receive(:rank_genre).and_return([ jazz1, jazz2 ])

      curation = described_class.new(store)
      jazz_crate = curation.crates.find { |crate| crate.name == "Jazz" }
      expect(jazz_crate).to be_present
      expect(jazz_crate.listings).to eq([ jazz2 ])
    end
  end

  describe "#surfaced_listings" do
    it "returns unique listings from all curated crates" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])

      allow_any_instance_of(PicksSelector).to receive(:select_picks).and_return([ listing ])
      allow_any_instance_of(PicksSelector).to receive(:rank_genre).and_return([ listing ])

      curation = described_class.new(store)
      expect(curation.surfaced_listings).to eq([ listing ])
    end
  end
end
