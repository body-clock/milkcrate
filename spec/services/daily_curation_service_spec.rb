require "rails_helper"

RSpec.describe DailyCurationService do
  include ActiveSupport::Testing::TimeHelpers

  let(:store) { create(:store) }

  before do
    allow(Rails.logger).to receive(:info)
    allow(Rails.logger).to receive(:warn)
  end

  def make_lp_listing(overrides = {})
    create(:listing, {
      store: store,
      format: "LP",
      genres: [ "Jazz" ],
      last_seen_at: Time.current
    }.merge(overrides))
  end

  def stub_curation(crates:, groups:)
    curation = instance_double(StorefrontCuration)
    allow(curation).to receive(:crates).and_return(crates)
    allow(curation).to receive(:storefront_groups).and_return(groups)
    allow(StorefrontCuration).to receive(:new).with(store).and_return(curation)
    curation
  end

  describe "#curate" do
    it "updates surfaced bookkeeping and writes a ready active snapshot" do
      pick = make_lp_listing(genres: [ "Jazz" ])
      genre_listing = make_lp_listing(genres: [ "Rock" ])
      uncurated = make_lp_listing(genres: [ "Soul" ])

      picks_crate = CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ pick ])
      genre_crate = CuratedCrate.new(slug: "jazz", name: "Jazz", listings: [ genre_listing ])
      stub_curation(
        crates: [ picks_crate, genre_crate ],
        groups: { picks: picks_crate, featured: [], genres: [ genre_crate ] }
      )

      travel_to(Time.zone.parse("2026-05-17 09:00:00")) do
        expect(Rails.logger).to receive(:info).with(
          include(
            "status=ready",
            "store_id=#{store.id}",
            "store=#{store.name}",
            "schema_version=#{StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION}",
            "crate_count=2",
            "record_count=2",
            "surfaced_count=2",
            "duration_ms=",
            "payload_bytes="
          )
        )

        snapshot = described_class.new.curate(store)
        presenter = CratePresenter.new(store)
        expected_crates = presenter.build_crates([ picks_crate, genre_crate ])
        expected_sections = presenter.build_storefront_sections({ picks: picks_crate, featured: [], genres: [ genre_crate ] })
        metrics = snapshot.metrics.with_indifferent_access

        aggregate_failures do
          expect(pick.reload.last_surfaced_at).to be_present
          expect(pick.surface_count).to eq(1)
          expect(genre_listing.reload.last_surfaced_at).to be_present
          expect(genre_listing.surface_count).to eq(1)
          expect(uncurated.reload.last_surfaced_at).to be_nil
          expect(uncurated.surface_count).to eq(0)
          expect(snapshot.status).to eq("ready")
          expect(snapshot.active).to be(true)
          expect(snapshot.props_schema_version).to eq(StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION)
          expect(store.active_storefront_snapshot).to eq(snapshot)
          expect(snapshot.crates).to eq(expected_crates.map(&:deep_stringify_keys))
          expect(snapshot.storefront_sections).to eq(expected_sections.map(&:deep_stringify_keys))
          expect(snapshot.surfaced_listing_ids).to eq([ pick.id, genre_listing.id ])
          expect(metrics).to include(
            crate_count: 2,
            record_count: 2,
            surfaced_count: 2,
            payload_bytes: JSON.generate({ crates: expected_crates, storefront_sections: expected_sections }).bytesize
          )
          expect(metrics[:duration_ms]).to be_a(Integer)
          expect(metrics[:duration_ms]).to be >= 0
        end
      end
    end

    it "deactivates the previous active snapshot for the same store" do
      previous = create(
        :storefront_snapshot,
        store: store,
        active: true,
        status: "ready",
        props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION,
        generated_at: 1.day.ago
      )

      pick = make_lp_listing(genres: [ "Jazz" ])
      genre_listing = make_lp_listing(genres: [ "Rock" ])
      picks_crate = CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ pick ])
      genre_crate = CuratedCrate.new(slug: "jazz", name: "Jazz", listings: [ genre_listing ])
      stub_curation(
        crates: [ picks_crate, genre_crate ],
        groups: { picks: picks_crate, featured: [], genres: [ genre_crate ] }
      )

      snapshot = described_class.new.curate(store)

      aggregate_failures do
        expect(previous.reload.active).to be(false)
        expect(snapshot.active).to be(true)
        expect(store.active_storefront_snapshot).to eq(snapshot)
      end
    end

    it "preserves the previous active snapshot when curation raises" do
      previous = create(
        :storefront_snapshot,
        store: store,
        active: true,
        status: "ready",
        props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION,
        generated_at: 1.day.ago
      )

      curation = instance_double(StorefrontCuration)
      allow(curation).to receive(:crates).and_raise(StandardError, "boom")
      allow(StorefrontCuration).to receive(:new).with(store).and_return(curation)

      travel_to(Time.zone.parse("2026-05-17 09:00:00")) do
        expect(Rails.logger).to receive(:warn).with(
          include(
            "status=failed",
            "store_id=#{store.id}",
            "store=#{store.name}",
            "schema_version=#{StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION}",
            "error=StandardError: boom",
            "duration_ms="
          )
        )

        failed = described_class.new.curate(store)

        aggregate_failures do
          expect(failed.status).to eq("failed")
          expect(failed.active).to be(false)
          expect(failed.crates).to eq([])
          expect(failed.storefront_sections).to eq([])
          expect(failed.failure_message).to include("StandardError: boom")
          expect(previous.reload.active).to be(true)
          expect(store.active_storefront_snapshot).to eq(previous)
        end
      end
    end

    it "keeps a failed attempt and a later ready retry for the same day" do
      failing_curation = instance_double(StorefrontCuration)
      allow(failing_curation).to receive(:crates).and_raise(StandardError, "boom")
      allow(StorefrontCuration).to receive(:new).with(store).and_return(failing_curation)

      travel_to(Time.zone.parse("2026-05-17 09:00:00")) do
        failed = described_class.new.curate(store)

        pick = make_lp_listing(genres: [ "Jazz" ])
        genre_listing = make_lp_listing(genres: [ "Rock" ])
        picks_crate = CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ pick ])
        genre_crate = CuratedCrate.new(slug: "jazz", name: "Jazz", listings: [ genre_listing ])
        success_curation = instance_double(StorefrontCuration)
        allow(success_curation).to receive(:crates).and_return([ picks_crate, genre_crate ])
        allow(success_curation).to receive(:storefront_groups).and_return(
          { picks: picks_crate, featured: [], genres: [ genre_crate ] }
        )
        allow(StorefrontCuration).to receive(:new).with(store).and_return(success_curation)

        ready = described_class.new.curate(store)

        aggregate_failures do
          expect(StorefrontSnapshot.where(store:, curation_date: Date.current).count).to eq(2)
          expect(failed.reload.status).to eq("failed")
          expect(failed.active).to be(false)
          expect(ready.status).to eq("ready")
          expect(ready.active).to be(true)
          expect(store.active_storefront_snapshot).to eq(ready)
        end
      end
    end

    it "increments a duplicated curated listing once per run" do
      listing = make_lp_listing(genres: [ "Jazz" ])

      picks_crate = CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ listing ])
      genre_crate = CuratedCrate.new(slug: "jazz", name: "Jazz", listings: [ listing ])
      stub_curation(
        crates: [ picks_crate, genre_crate ],
        groups: { picks: picks_crate, featured: [], genres: [ genre_crate ] }
      )

      expect {
        described_class.new.curate(store)
      }.to change { listing.reload.surface_count }.by(1)
    end

    it "does not affect another store's active snapshot" do
      other_store = create(:store)
      other_snapshot = create(
        :storefront_snapshot,
        store: other_store,
        active: true,
        status: "ready",
        props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION,
        generated_at: 1.day.ago
      )

      pick = make_lp_listing(genres: [ "Jazz" ])
      genre_listing = make_lp_listing(genres: [ "Rock" ])
      picks_crate = CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ pick ])
      genre_crate = CuratedCrate.new(slug: "jazz", name: "Jazz", listings: [ genre_listing ])
      stub_curation(
        crates: [ picks_crate, genre_crate ],
        groups: { picks: picks_crate, featured: [], genres: [ genre_crate ] }
      )

      described_class.new.curate(store)

      aggregate_failures do
        expect(other_snapshot.reload.active).to be(true)
        expect(other_store.active_storefront_snapshot).to eq(other_snapshot)
      end
    end
  end
end
