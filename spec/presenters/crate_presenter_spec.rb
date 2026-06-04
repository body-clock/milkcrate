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

  def fake_curated_crate(slug:, name:, listings:)
    CuratedCrate.new(slug:, name:, listings:)
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
        sync_status: store.sync_status,
        enrichment_status: store.enrichment_status
      )
    end
  end

  describe "#listing_props" do
    def listing_props(store, listing)
      crate = described_class.new(store).build_crates([
        fake_curated_crate(slug: "test", name: "Test", listings: [ listing ])
      ])
      crate.first[:records].first
    end

    it "returns all expected fields" do
      props = listing_props(fake_store, fake_listing)

      expect(props.keys).to match_array(%i[
        id discogs_listing_id artist title label year format
        genres styles condition price currency cover_image_url
        thumbnail_url notes discogs_url display_price score_breakdown
      ])
    end

    it "coerces price to string" do
      props = listing_props(fake_store, fake_listing(price: BigDecimal("14.99")))

      expect(props[:price]).to be_a(String)
    end

    it "formats display_price" do
      props = listing_props(fake_store, fake_listing(price: BigDecimal("12.50")))

      expect(props[:display_price]).to eq("$12.50")
    end

    it "handles nil price in display_price" do
      props = listing_props(fake_store, fake_listing(price: nil))

      expect(props[:display_price]).to eq("—")
    end

    it "constructs discogs_url from discogs_listing_id" do
      props = listing_props(fake_store, fake_listing(discogs_listing_id: "abc123"))

      expect(props[:discogs_url]).to eq("https://www.discogs.com/sell/item/abc123")
    end

    it "preserves nil cover_image_url" do
      props = listing_props(fake_store, fake_listing(cover_image_url: nil))

      expect(props[:cover_image_url]).to be_nil
    end
  end

  describe "#build_crates" do
    let(:jazz) { fake_listing(id: 1, genres: [ "Jazz" ]) }
    let(:rock) { fake_listing(id: 2, genres: [ "Rock" ]) }

    it "places wall first with slug 'wall'" do
      store    = fake_store
      curated_crates = [ fake_curated_crate(slug: "wall", name: "The Wall", listings: [ jazz ]) ]
      crates   = described_class.new(store).build_crates(curated_crates)

      expect(crates.first[:slug]).to eq("wall")
      expect(crates.first[:name]).to eq("The Wall")
    end

    it "includes wall records in the first crate" do
      store    = fake_store
      curated_crates = [ fake_curated_crate(slug: "wall", name: "The Wall", listings: [ jazz ]) ]
      crates   = described_class.new(store).build_crates(curated_crates)

      expect(crates.first[:count]).to eq(1)
      expect(crates.first[:records].first[:id]).to eq(1)
    end

    it "uses crate slugs from curated crate input" do
      hip_hop  = fake_listing(id: 3, genres: [ "Hip Hop" ])
      store    = fake_store
      curated_crates = [ fake_curated_crate(slug: "hip-hop", name: "Hip Hop", listings: [ hip_hop ]) ]
      crates   = described_class.new(store).build_crates(curated_crates)

      expect(crates.map { |c| c[:slug] }).to include("hip-hop")
    end

    it "produces one crate per unique primary genre" do
      store    = fake_store
      curated_crates = [
        fake_curated_crate(slug: "wall", name: "The Wall", listings: []),
        fake_curated_crate(slug: "jazz", name: "Jazz", listings: [ jazz ]),
        fake_curated_crate(slug: "rock", name: "Rock", listings: [ rock ])
      ]
      crates   = described_class.new(store).build_crates(curated_crates)

      genre_slugs = crates.reject { |c| c[:slug] == "wall" }.map { |c| c[:slug] }
      expect(genre_slugs).to match_array(%w[jazz rock])
    end

    it "skips genre crates with no records" do
      store    = fake_store
      curated_crates = [ fake_curated_crate(slug: "wall", name: "The Wall", listings: []) ]
      crates   = described_class.new(store).build_crates(curated_crates)

      genre_slugs = crates.reject { |c| c[:slug] == "wall" }.map { |c| c[:slug] }
      expect(genre_slugs).to be_empty
    end
  end

  describe "#build_storefront_sections" do
    let(:wall) { fake_curated_crate(slug: "wall", name: "The Wall", listings: [ fake_listing(id: 1) ]) }
    let(:featured) { fake_curated_crate(slug: "new-arrivals", name: "New Arrivals", listings: [ fake_listing(id: 2) ]) }
    let(:genre) { fake_curated_crate(slug: "jazz", name: "Jazz", listings: [ fake_listing(id: 3) ]) }

    it "assigns storefront section keys in display order" do
      sections = described_class.new(fake_store).build_storefront_sections(
        wall:,
        featured: [ featured ],
        genres: [ genre ]
      )

      expect(sections.map { |section| section[:key] }).to eq(%w[wall featured_crates genre_grid])
      expect(sections.first.dig(:crate, :slug)).to eq("wall")
      expect(sections.second[:crates].map { |crate| crate[:slug] }).to eq([ "new-arrivals" ])
      expect(sections.third[:crates].map { |crate| crate[:slug] }).to eq([ "jazz" ])
    end

    it "omits the featured section when no featured crates are present" do
      sections = described_class.new(fake_store).build_storefront_sections(
        wall:,
        featured: [],
        genres: [ genre ]
      )

      expect(sections.map { |section| section[:key] }).to eq(%w[wall genre_grid])
    end
  end
end
