require "json"
require "time"

module Corpus
  class DiscogsSnapshotImporter
    DEFAULT_SNAPSHOT_PATH = Rails.root.join("db/corpus/discogs_store_snapshot.json")

    def initialize(snapshot_path: DEFAULT_SNAPSHOT_PATH)
      @snapshot_path = Pathname(snapshot_path)
    end

    def import
      payload = JSON.parse(File.read(snapshot_path.to_s))
      store_data = payload.fetch("store")
      listing_rows = payload.fetch("listings")

      store = upsert_store!(store_data)
      imported = upsert_listings!(store, listing_rows)

      store.update!(total_listings: store.listings.count)

      {
        store_id: store.id,
        imported_listings: imported,
        total_listings: store.total_listings
      }
    end

    alias call import

    private

    attr_reader :snapshot_path

    def upsert_store!(store_data)
      store = Store.find_or_initialize_by(discogs_username: store_data.fetch("discogs_username"))
      store.name = store_data.fetch("name")
      store.description = store_data["description"]
      store.sync_status = "idle"
      store.last_synced_at = Time.current
      store.save!
      store
    end

    def upsert_listings!(store, listing_rows)
      listing_rows.each do |row|
        store.listings.upsert(
          {
            discogs_listing_id: row.fetch("discogs_listing_id"),
            discogs_release_id: row["discogs_release_id"],
            artist: row["artist"],
            title: row["title"],
            label: row["label"],
            year: row["year"],
            format: row["format"],
            genres: normalize_array(row["genres"]),
            styles: normalize_array(row["styles"]),
            condition: row["condition"],
            price: row["price"],
            currency: row["currency"] || "USD",
            thumbnail_url: row["thumbnail_url"],
            cover_image_url: row["cover_image_url"],
            notes: row["notes"],
            listed_at: parse_time(row["listed_at"]),
            last_seen_at: Time.current,
            store_id: store.id
          },
          unique_by: :discogs_listing_id,
          update_only: %i[
            discogs_release_id artist title label year format genres styles
            condition price currency thumbnail_url cover_image_url notes listed_at
            last_seen_at store_id
          ]
        )
      end

      listing_rows.size
    end

    def normalize_array(values)
      Array(values).compact
    end

    def parse_time(value)
      return nil if value.blank?

      Time.iso8601(value)
    rescue ArgumentError
      nil
    end
  end
end
