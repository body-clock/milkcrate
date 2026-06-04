require "rails_helper"

RSpec.describe DailyCurationService do
  let(:store) { create(:store) }

  def make_lp_listing(overrides = {})
    create(:listing, {
      store: store,
      format: "LP",
      genres: [ "Jazz" ],
      last_seen_at: Time.current
    }.merge(overrides))
  end

  describe "#curate" do
    let(:wall_listings) { [ make_lp_listing(genres: [ "Jazz" ]) ] }
    let(:genre_listings) { [ make_lp_listing(genres: [ "Rock" ]) ] }
    let(:all_surfaced) { wall_listings + genre_listings }

    let(:curation) do
      instance_spy(StorefrontCuration,
        crates: [
          CuratedCrate.new(slug: "wall", name: "The Wall", listings: wall_listings),
          CuratedCrate.new(slug: "rock", name: "Rock", listings: genre_listings)
        ],
        surfaced_listings: all_surfaced,
        storefront_groups: {
          wall: CuratedCrate.new(slug: "wall", name: "The Wall", listings: wall_listings),
          featured: [],
          genres: [ CuratedCrate.new(slug: "rock", name: "Rock", listings: genre_listings) ]
        }
      )
    end

    before do
      allow(StorefrontCuration).to receive(:new).with(store).and_return(curation)
      allow(CratePresenter).to receive(:new).and_wrap_original do |original, *args|
        instance_spy(CratePresenter,
          build_storefront_sections: [ { key: "wall", crate: { slug: "wall", records: [] } } ],
          build_crates: [ { slug: "wall", records: [] } ]
        )
      end
      allow(StorefrontCuration::CacheManager).to receive(:write_curation_cache).and_return(true)
    end

    it "updates surfaced bookkeeping for listings from storefront curation" do
      uncurated = make_lp_listing(genres: [ "Soul" ])

      described_class.new.curate(store)

      aggregate_failures do
        expect(wall_listings.first.reload.last_surfaced_at).to be_present
        expect(wall_listings.first.surface_count).to eq(1)
        expect(genre_listings.first.reload.last_surfaced_at).to be_present
        expect(genre_listings.first.surface_count).to eq(1)
        expect(uncurated.reload.last_surfaced_at).to be_nil
        expect(uncurated.surface_count).to eq(0)
      end
    end

    it "increments surface_count by 1 for duplicated listings" do
      single_listing = make_lp_listing(genres: [ "Jazz" ])
      single_curation = instance_spy(StorefrontCuration,
        crates: [ CuratedCrate.new(slug: "wall", name: "The Wall", listings: [ single_listing ]) ],
        surfaced_listings: [ single_listing ],
        storefront_groups: { wall: CuratedCrate.new(slug: "wall", name: "The Wall", listings: [ single_listing ]), featured: [], genres: [] }
      )
      allow(StorefrontCuration).to receive(:new).with(store).and_return(single_curation)

      expect {
        described_class.new.curate(store)
      }.to change { single_listing.reload.surface_count }.by(1)
    end

    it "pre-warms the cache after surfacing listings" do
      described_class.new.curate(store)

      expect(StorefrontCuration::CacheManager).to have_received(:write_curation_cache) do |store_arg, payload|
        expect(store_arg).to eq(store)
        expect(payload).to be_a(Hash)
        expect(payload.keys).to match_array(%i[sections crates])
      end
    end

    it "uses CratePresenter to build the cache payload" do
      described_class.new.curate(store)

      expect(CratePresenter).to have_received(:new).with(store)
    end
  end
end
