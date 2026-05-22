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
    let(:picks_listings) { [ make_lp_listing(genres: [ "Jazz" ]) ] }
    let(:genre_listings) { [ make_lp_listing(genres: [ "Rock" ]) ] }

    let(:picks_crate) { CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: picks_listings) }
    let(:genre_crate) { CuratedCrate.new(slug: "rock", name: "Rock", listings: genre_listings) }

    let(:storefront_groups_hash) do
      {
        picks: picks_crate,
        featured: [],
        genres: [ genre_crate ]
      }
    end

    let(:crates_array) { [ picks_crate, genre_crate ] }

    let(:surfaced) { picks_listings + genre_listings }

    let(:curation) do
      instance_double(
        StorefrontCuration,
        crates: crates_array,
        surfaced_listings: surfaced,
        storefront_groups: storefront_groups_hash
      )
    end

    before do
      allow(StorefrontCuration).to receive(:new).with(store).and_return(curation)

      # Mock CratePresenter and cache write so existing tests don't fail on these
      presenter = instance_double(CratePresenter,
        build_storefront_sections: [ { key: "picks_wall", crate: { slug: "picks", records: [] } } ],
        build_crates: [ { slug: "picks", records: [] } ]
      )
      allow(CratePresenter).to receive(:new).with(store).and_return(presenter)
      allow(StorefrontCuration).to receive(:write_curation_cache).and_return(true)
    end

    it "updates surfaced bookkeeping for listings from storefront curation" do
      uncurated = make_lp_listing(genres: [ "Soul" ])

      described_class.new.curate(store)

      aggregate_failures do
        expect(picks_listings.first.reload.last_surfaced_at).to be_present
        expect(picks_listings.first.surface_count).to eq(1)
        expect(genre_listings.first.reload.last_surfaced_at).to be_present
        expect(genre_listings.first.surface_count).to eq(1)
        expect(uncurated.reload.last_surfaced_at).to be_nil
        expect(uncurated.surface_count).to eq(0)
      end
    end

    it "increments a duplicated curated listing once per run" do
      single_listing = make_lp_listing(genres: [ "Jazz" ])
      single_crate = CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ single_listing ])
      single_curation = instance_double(
        StorefrontCuration,
        crates: [ single_crate ],
        surfaced_listings: [ single_listing ],
        storefront_groups: { picks: single_crate, featured: [], genres: [] }
      )
      allow(StorefrontCuration).to receive(:new).with(store).and_return(single_curation)

      expect {
        described_class.new.curate(store)
      }.to change { single_listing.reload.surface_count }.by(1)
    end

    it "pre-warms the cache after surfacing listings with serialized presenter output" do
      expect(StorefrontCuration).to receive(:write_curation_cache) do |store_arg, payload|
        expect(store_arg).to eq(store)
        expect(payload).to be_a(Hash)
        expect(payload.keys).to match_array(%i[sections crates])
        expect(payload[:sections]).to all(include(:key))
        expect(payload[:crates]).to all(include(:slug))
      end

      described_class.new.curate(store)
    end

    it "calls CratePresenter to build the cache payload" do
      expect(CratePresenter).to receive(:new).with(store).and_call_original

      described_class.new.curate(store)
    end
  end
end
