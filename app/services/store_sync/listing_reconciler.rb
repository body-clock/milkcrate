# Namespace for store sync components (fetch, normalize, reconcile, status).
module StoreSync
  # Reconciles incoming listing data with existing records to detect changes.
  class ListingReconciler
    Result = Data.define(:listing_ids_for_enrichment)
    UPDATE_FIELDS = %i[
      discogs_release_id artist title label year
      format genres styles condition price currency
      thumbnail_url notes listed_at last_seen_at
    ].freeze

    def initialize(store:, fetched_listings:, normalizer: ListingNormalizer.new)
      @store = store
      @fetched_listings = fetched_listings
      @normalizer = normalizer
    end

    def call
      records = normalized_records
      return empty_result if records.empty?

      perform_sync(records)
    rescue StandardError => e
      Rails.logger.error("[StoreSync::ListingReconciler] upsert_all failed: #{e.message}")
      raise
    end

    private

    def empty_result
      Result.new(listing_ids_for_enrichment: [])
    end

    def perform_sync(records)
      existing_index = existing_records_index(records)
      enrichment = records_to_enrich(records, existing_index)

      upsert_all_records(records)

      ids = enrichment_ids(enrichment)
      Result.new(listing_ids_for_enrichment: ids)
    end

    def normalized_records
      @fetched_listings.filter_map do |raw_listing|
        @normalizer.call(raw_listing, store_id: @store.id)
      end.index_by { |r| r[:discogs_listing_id] }
    end

    def existing_records_index(records)
      @store.listings
        .where(discogs_listing_id: records.keys)
        .index_by(&:discogs_listing_id)
    end

    def records_to_enrich(records, existing_index)
      records.filter_map do |discogs_id, record|
        existing = existing_index[discogs_id]
        discogs_id if existing.nil? || materially_changed?(existing, record)
      end
    end

    def upsert_all_records(records)
      @store.listings.upsert_all(
        records.values,
        unique_by: :discogs_listing_id,
        update_only: UPDATE_FIELDS
      )
    end

    def enrichment_ids(changed_discogs_ids)
      @store.listings
        .where(discogs_listing_id: changed_discogs_ids)
        .pluck(:id)
    end

    def materially_changed?(existing, incoming)
      [
        existing.discogs_release_id.to_s,
        normalized_price(existing.price),
        existing.condition,
        existing.format,
        existing.notes
      ] != [
        incoming[:discogs_release_id].to_s,
        normalized_price(incoming[:price]),
        incoming[:condition],
        incoming[:format],
        incoming[:notes]
      ]
    end

    def normalized_price(value)
      value.present? ? BigDecimal(value.to_s) : nil
    end
  end
end
