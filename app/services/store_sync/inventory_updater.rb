module StoreSync
  class InventoryUpdater
    UPDATE_FIELDS = %i[
      discogs_release_id artist title label year
      condition price currency
      thumbnail_url notes listed_at last_seen_at
    ].freeze

    def initialize(store)
      @store = store
    end

    def call(listings)
      return [] if listings.empty?
      records = index_records(listings)
      persist_listings(records)
    end

    def persist_listings(records)
      existing = index_existing(records)
      changed_ids = detect_changes(records, existing)
      upsert_records(records)
      enrichment_ids(changed_ids)
    end

    def remove_stale(listings)
      current_ids = listings.map { |r| r[:discogs_listing_id] }
      current_ids.empty? ? @store.listings.delete_all : @store.listings.where.not(discogs_listing_id: current_ids).delete_all
    end

    private

    def index_records(listings)
      listings.index_by { |r| r[:discogs_listing_id] }
    end

    def index_existing(records)
      @store.listings
        .where(discogs_listing_id: records.keys)
        .index_by(&:discogs_listing_id)
    end

    def detect_changes(records, existing)
      records.filter_map do |id, record|
        existing_record = existing[id]
        id if existing_record.nil? || materially_changed?(existing_record, record)
      end
    end

    def upsert_records(records)
      @store.listings.upsert_all(
        records.values,
        unique_by: :discogs_listing_id,
        update_only: UPDATE_FIELDS
      )
    end

    def enrichment_ids(changed_ids)
      @store.listings
        .where(discogs_listing_id: changed_ids)
        .pluck(:id)
    end

    def materially_changed?(existing, incoming)
      pairs = changed_pairs(existing, incoming)
      pairs.any? { |a, b| a != b }
    end

    def changed_pairs(existing, incoming)
      [
        [ existing.discogs_release_id.to_s, incoming[:discogs_release_id].to_s ],
        [ normalized_price(existing.price), normalized_price(incoming[:price]) ],
        [ existing.condition, incoming[:condition] ],
        [ existing.notes, incoming[:notes] ]
      ]
    end

    def normalized_price(value)
      value.present? ? BigDecimal(value.to_s) : nil
    end
  end
end
