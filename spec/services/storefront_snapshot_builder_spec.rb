require "rails_helper"

RSpec.describe StorefrontSnapshotBuilder do
  include ActiveSupport::Testing::TimeHelpers

  let(:store) { create(:store) }
  let(:picks_listing) { create(:listing, store:, discogs_listing_id: "pick-1") }
  let(:featured_listing) { create(:listing, store:, discogs_listing_id: "featured-1") }
  let(:picks_crate) { CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ picks_listing ]) }
  let(:genre_crate) { CuratedCrate.new(slug: "jazz", name: "Jazz", listings: [ picks_listing, featured_listing ]) }
  let(:groups) { { picks: picks_crate, featured: [], genres: [ genre_crate ] } }

  describe ".call" do
    it "returns presenter-shaped crates, storefront sections, surfaced ids, and metrics" do
      curation = instance_double(StorefrontCuration)
      expect(curation).to receive(:crates).once.and_return([ picks_crate, genre_crate ])
      expect(curation).to receive(:storefront_groups).once.and_return(groups)

      travel_to(Time.zone.parse("2026-05-17 09:00:00")) do
        result = described_class.call(store:, curation:, props_schema_version: 7)
        presenter = CratePresenter.new(store)
        expected_crates = presenter.build_crates([ picks_crate, genre_crate ])
        expected_sections = presenter.build_storefront_sections(groups)

        aggregate_failures do
          expect(result.crates).to eq(expected_crates)
          expect(result.storefront_sections).to eq(expected_sections)
          expect(result.surfaced_listing_ids).to eq([ picks_listing.id, featured_listing.id ])
          expect(result.props_schema_version).to eq(7)
          expect(result.generated_at).to eq(Time.current)
          expect(result.metrics).to include(
            crate_count: 2,
            record_count: 3,
            surfaced_count: 2,
            payload_bytes: JSON.generate({ crates: expected_crates, storefront_sections: expected_sections }).bytesize
          )
        end
      end
    end

    it "preserves the empty storefront shape when curation returns no crates" do
      curation = instance_double(StorefrontCuration)
      empty_picks = CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [])
      empty_groups = { picks: empty_picks, featured: [], genres: [] }

      expect(curation).to receive(:crates).once.and_return([])
      expect(curation).to receive(:storefront_groups).once.and_return(empty_groups)

      result = described_class.call(store:, curation:, props_schema_version: 7)

      expect(result.crates).to eq([])
      expect(result.storefront_sections.map { |section| section[:key] }).to eq(%w[picks_wall genre_grid])
    end
  end
end
