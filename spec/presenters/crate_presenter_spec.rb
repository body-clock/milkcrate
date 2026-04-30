require "spec_helper"
require "bigdecimal"
require "active_support/core_ext/string/inflections"
require_relative "../../app/presenters/crate_presenter"
require_relative "../../app/services/picks_selector"

RSpec.describe CratePresenter do
  FakeListing = Struct.new(
    :id, :discogs_listing_id, :artist, :title, :label, :year, :format,
    :genres, :styles, :condition, :price, :currency, :cover_image_url,
    :thumbnail_url, :notes, :discogs_url,
    keyword_init: true
  ) do
    def primary_genre = genres.first
  end

  # Mirrors the fake scope pattern from picks_selector_spec
  FakeWhereChain = Struct.new(:records) do
    def not(**_kwargs)
      FakeRelation.new(records)
    end
  end

  FakeRelation = Struct.new(:records) do
    def where(*args, **kwargs)
      return FakeWhereChain.new(records) if args.empty? && kwargs.empty?
      FakeRelation.new(records)
    end

    def pluck(attr)
      records.map { |r| r.public_send(attr) }
    end
  end

  FakeListingsScope = Struct.new(:records) do
    def where(*args, **kwargs)
      return FakeWhereChain.new(records) if args.empty? && kwargs.empty?
      FakeRelation.new(records)
    end

    def pluck(attr)
      records.map { |r| r.public_send(attr) }
    end
  end

  FakeStore = Struct.new(:id, :name, :discogs_username, :total_listings, :sync_status, :listings, keyword_init: true)

  def fake_listing(overrides = {})
    FakeListing.new(
      id: 1,
      discogs_listing_id: "abc123",
      artist: "Artist",
      title: "Title",
      label: "Label",
      year: 1975,
      format: "Vinyl",
      genres: ["Jazz"],
      styles: ["Bebop"],
      condition: "VG+",
      price: "12.50",
      currency: "USD",
      cover_image_url: "https://example.com/cover.jpg",
      thumbnail_url: "https://example.com/thumb.jpg",
      notes: "Nice copy",
      discogs_url: "https://www.discogs.com/sell/item/abc123",
      **overrides
    )
  end

  def fake_store(listings: [])
    FakeStore.new(
      id: 1,
      name: "Test Store",
      discogs_username: "teststore",
      total_listings: listings.size,
      sync_status: "synced",
      listings: FakeListingsScope.new(listings)
    )
  end

  describe "#store_props" do
    it "returns expected store fields" do
      props = described_class.new(fake_store).store_props("A great store")

      expect(props).to include(
        id: 1,
        name: "Test Store",
        discogs_username: "teststore",
        description: "A great store",
        total_listings: 0,
        sync_status: "synced"
      )
    end
  end

  describe "#listing_props" do
    subject(:props) { described_class.new(fake_store).send(:listing_props, fake_listing) }

    it "returns all expected fields" do
      expect(props.keys).to match_array(%i[
        id discogs_listing_id artist title label year format
        genres styles condition price currency cover_image_url
        thumbnail_url notes discogs_url
      ])
    end

    it "coerces price to string" do
      listing = fake_listing(price: BigDecimal("14.99"))
      props = described_class.new(fake_store).send(:listing_props, listing)

      expect(props[:price]).to be_a(String)
    end

    it "preserves nil cover_image_url" do
      listing = fake_listing(cover_image_url: nil)
      props = described_class.new(fake_store).send(:listing_props, listing)

      expect(props[:cover_image_url]).to be_nil
    end
  end

  describe "#build_crates" do
    let(:jazz) { fake_listing(id: 1, genres: ["Jazz"]) }
    let(:rock) { fake_listing(id: 2, genres: ["Rock"]) }
    let(:picks) { [jazz] }

    before do
      selector = instance_double(PicksSelector)
      allow(selector).to receive(:rank).and_return([])
      allow(PicksSelector).to receive(:new).and_return(selector)
    end

    it "places picks first with slug 'picks'" do
      store = fake_store(listings: [jazz])
      crates = described_class.new(store).build_crates(picks, [])

      expect(crates.first[:slug]).to eq("picks")
      expect(crates.first[:name]).to eq("Milkcrate Picks")
    end

    it "includes picks records in the first crate" do
      store = fake_store(listings: [jazz])
      crates = described_class.new(store).build_crates(picks, [])

      expect(crates.first[:count]).to eq(1)
      expect(crates.first[:records].first[:id]).to eq(1)
    end

    it "parameterizes multi-word genre names as slugs" do
      hip_hop = fake_listing(id: 3, genres: ["Hip Hop"])
      store = fake_store(listings: [hip_hop])
      crates = described_class.new(store).build_crates([], [])

      expect(crates.map { |c| c[:slug] }).to include("hip-hop")
    end

    it "produces one crate per unique primary genre" do
      store = fake_store(listings: [jazz, rock])
      crates = described_class.new(store).build_crates([], [])

      genre_slugs = crates.reject { |c| c[:slug] == "picks" }.map { |c| c[:slug] }
      expect(genre_slugs).to match_array(%w[jazz rock])
    end
  end
end
