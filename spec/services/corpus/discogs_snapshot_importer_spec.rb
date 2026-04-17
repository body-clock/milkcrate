require "rails_helper"
require "json"
require "tmpdir"

RSpec.describe Corpus::DiscogsSnapshotImporter do
  let(:snapshot_path) { Rails.root.join("db/corpus/discogs_store_snapshot.json") }
  let(:fixture_path) { Rails.root.join("spec/fixtures/files/discogs_store_snapshot.json") }
  let(:importer) { described_class.new(snapshot_path:) }

  before do
    FileUtils.mkdir_p(snapshot_path.dirname)
    File.write(snapshot_path, File.read(fixture_path))
  end

  describe "#import" do
    it "creates the store and listings from the snapshot" do
      expect { importer.import }
        .to change(Store, :count).by(1)
        .and change(Listing, :count).by(5)

      store = Store.find_by!(discogs_username: "philadelphiamusic")
      expect(store.name).to eq("Philadelphia Music")
      expect(store.sync_status).to eq("idle")
      expect(store.total_listings).to eq(5)
      expect(store.last_synced_at).to be_present

      listing = Listing.find_by!(discogs_listing_id: "2350448891")
      expect(listing.store).to eq(store)
      expect(listing.artist).to eq("Basic Channel")
      expect(listing.title).to eq("Phylyps Trak")
      expect(listing.discogs_release_id).to eq("171624")
      expect(listing.genres).to eq(["Electronic"])
      expect(listing.styles).to eq(["Dub Techno", "Minimal"])
      expect(listing.price).to eq(BigDecimal("34.00"))
    end

    it "is idempotent when run repeatedly" do
      importer.import

      expect { importer.import }
        .to change(Store, :count).by(0)
        .and change(Listing, :count).by(0)

      expect(Listing.group(:discogs_listing_id).count.values).to all(eq(1))
    end

    it "handles missing optional listing fields" do
      optional_fields_snapshot = {
        snapshot_version: 1,
        captured_at: "2026-04-17T16:30:00Z",
        source: {
          discogs_username: "optionalfields",
          max_pages: 1,
          per_page: 100
        },
        store: {
          name: "Optional Fields",
          discogs_username: "optionalfields",
          description: "Sample store"
        },
        listings: [
          {
            discogs_listing_id: "9990001112",
            discogs_release_id: "12345",
            artist: "Unknown Artist",
            title: "Untitled",
            label: "Private Press",
            format: "Vinyl, LP",
            genres: ["Electronic"],
            condition: "VG",
            price: "9.99",
            currency: "USD",
            listed_at: "2026-04-17T16:00:00Z"
          }
        ]
      }

      Dir.mktmpdir do |dir|
        path = File.join(dir, "snapshot.json")
        File.write(path, JSON.pretty_generate(optional_fields_snapshot))

        described_class.new(snapshot_path: path).import
      end

      listing = Listing.find_by!(discogs_listing_id: "9990001112")
      expect(listing.year).to be_nil
      expect(listing.styles).to eq([])
      expect(listing.notes).to be_nil
    end
  end
end
