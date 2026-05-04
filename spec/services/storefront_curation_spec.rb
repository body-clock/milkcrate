require "rails_helper"

RSpec.describe StorefrontCuration do
  def lp_listing(store, overrides = {})
    create(:listing, store:, format: "LP", last_seen_at: Time.current, **overrides)
  end

  describe "#picks" do
    it "returns an array of listings" do
      store = create(:store)
      lp_listing(store, genres: [ "Jazz" ])

      curation = described_class.new(store)
      expect(curation.picks).to be_an(Array)
    end

    it "returns at most 12 records" do
      store = create(:store)
      15.times { |i| lp_listing(store, genres: [ "Genre#{i}" ]) }

      curation = described_class.new(store)
      expect(curation.picks.size).to be <= 12
    end

    it "returns only available LP listings" do
      store = create(:store)
      lp_listing(store, genres: [ "Jazz" ])
      create(:listing, store:, format: "LP", last_seen_at: 10.days.ago, genres: [ "Rock" ])

      curation = described_class.new(store)
      expect(curation.picks.size).to eq(1)
    end
  end

  describe "#genre_crates" do
    it "returns a hash keyed by genre name" do
      store = create(:store)
      lp_listing(store, genres: [ "Jazz" ])

      curation = described_class.new(store)
      expect(curation.genre_crates).to be_a(Hash)
    end

    it "excludes records that appear in picks" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])
      allow_any_instance_of(PicksSelector).to receive(:select_picks).and_return([ listing ])

      curation = described_class.new(store)
      expect(curation.genre_crates.fetch("Jazz", [])).not_to include(listing)
    end

    it "skips genres with no records remaining after picks exclusion" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])
      allow_any_instance_of(PicksSelector).to receive(:select_picks).and_return([ listing ])
      allow_any_instance_of(PicksSelector).to receive(:rank_genre).and_return([ listing ])

      curation = described_class.new(store)
      expect(curation.genre_crates).not_to have_key("Jazz")
    end

    it "includes genres that have records not in picks" do
      store = create(:store)
      jazz1 = lp_listing(store, genres: [ "Jazz" ])
      jazz2 = lp_listing(store, genres: [ "Jazz" ])
      allow_any_instance_of(PicksSelector).to receive(:select_picks).and_return([ jazz1 ])
      allow_any_instance_of(PicksSelector).to receive(:rank_genre).and_return([ jazz1, jazz2 ])

      curation = described_class.new(store)
      expect(curation.genre_crates).to have_key("Jazz")
      expect(curation.genre_crates["Jazz"]).to eq([ jazz2 ])
    end
  end
end
