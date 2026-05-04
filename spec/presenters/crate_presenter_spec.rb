require "rails_helper"

RSpec.describe CratePresenter do
  FakeListing = Struct.new(
    :id, :discogs_listing_id, :artist, :title, :label, :year, :format,
    :genres, :styles, :condition, :price, :currency, :cover_image_url,
    :thumbnail_url, :notes, :discogs_url, :want_count, :have_count,
    keyword_init: true
  ) do
    def primary_genre = genres.first
  end

  # Chainable fake scope — any scope method returns self so available.lp_only etc. work
  FakeListingsScope = Struct.new(:records) do
    def available = self
    def lp_only   = self

    def where(*_args, **_kwargs)
      self
    end

    def not(**_kwargs)
      self
    end

    def pluck(attr)
      if attr.is_a?(String) && attr.include?("[")
        records.map { |r| r.genres.first }
      else
        records.map { |r| r.public_send(attr) }
      end
    end
  end

  def fake_listing(overrides = {})
    FakeListing.new(
      id: 1,
      discogs_listing_id: "abc123",
      artist: "Artist",
      title: "Title",
      label: "Label",
      year: 1975,
      format: "LP",
      genres: [ "Jazz" ],
      styles: [ "Bebop" ],
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
    store = build_stubbed(:store)
    allow(store).to receive(:listings).and_return(FakeListingsScope.new(listings))
    store
  end

  def fake_curation(picks: [], genre_crates: {})
    curation = double("StorefrontCuration")
    allow(curation).to receive(:picks).and_return(picks)
    allow(curation).to receive(:genre_crates).and_return(genre_crates)
    curation
  end

  describe "#store_props" do
    it "returns expected store fields" do
      store = fake_store
      props = described_class.new(store).store_props

      expect(props).to include(
        id: store.id,
        name: store.name,
        discogs_username: store.discogs_username,
        description: store.description,
        sync_status: store.sync_status
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
    let(:jazz) { fake_listing(id: 1, genres: [ "Jazz" ]) }
    let(:rock) { fake_listing(id: 2, genres: [ "Rock" ]) }

    it "places picks first with slug 'picks'" do
      store    = fake_store
      curation = fake_curation(picks: [ jazz ])
      crates   = described_class.new(store).build_crates(curation)

      expect(crates.first[:slug]).to eq("picks")
      expect(crates.first[:name]).to eq("Milkcrate Picks")
    end

    it "includes picks records in the first crate" do
      store    = fake_store
      curation = fake_curation(picks: [ jazz ])
      crates   = described_class.new(store).build_crates(curation)

      expect(crates.first[:count]).to eq(1)
      expect(crates.first[:records].first[:id]).to eq(1)
    end

    it "parameterizes multi-word genre names as slugs" do
      hip_hop  = fake_listing(id: 3, genres: [ "Hip Hop" ])
      store    = fake_store
      curation = fake_curation(genre_crates: { "Hip Hop" => [ hip_hop ] })
      crates   = described_class.new(store).build_crates(curation)

      expect(crates.map { |c| c[:slug] }).to include("hip-hop")
    end

    it "produces one crate per unique primary genre" do
      store    = fake_store
      curation = fake_curation(genre_crates: { "Jazz" => [ jazz ], "Rock" => [ rock ] })
      crates   = described_class.new(store).build_crates(curation)

      genre_slugs = crates.reject { |c| c[:slug] == "picks" }.map { |c| c[:slug] }
      expect(genre_slugs).to match_array(%w[jazz rock])
    end

    it "skips genre crates with no records" do
      store    = fake_store
      curation = fake_curation(genre_crates: {})
      crates   = described_class.new(store).build_crates(curation)

      genre_slugs = crates.reject { |c| c[:slug] == "picks" }.map { |c| c[:slug] }
      expect(genre_slugs).to be_empty
    end
  end
end
