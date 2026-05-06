module StoreSync
  class ListingReconciler
    Result = Data.define(:listing_ids_for_enrichment)

    def initialize(store:, fetched_listings:, normalizer: ListingNormalizer.new)
      @store = store
      @fetched_listings = fetched_listings
      @normalizer = normalizer
    end

    def call
      records_by_listing_id = @fetched_listings.each_with_object({}) do |raw_listing, memo|
        record = @normalizer.call(raw_listing, store_id: @store.id)
        memo[record[:discogs_listing_id]] = record if record
      end

      records = records_by_listing_id.values
      return Result.new(listing_ids_for_enrichment: []) if records.empty?

      existing_by_listing_id = @store
        .listings
        .where(discogs_listing_id: records_by_listing_id.keys)
        .index_by(&:discogs_listing_id)

      changed_listing_ids = records.filter_map do |record|
        existing = existing_by_listing_id[record[:discogs_listing_id]]
        record[:discogs_listing_id] if existing.nil? || materially_changed?(existing, record)
      end

      @store.listings.upsert_all(
        records,
        unique_by: :discogs_listing_id,
        update_only: %i[
          discogs_release_id
          artist
          title
          label
          year
          format
          genres
          styles
          condition
          price
          currency
          thumbnail_url
          notes
          listed_at
          last_seen_at
        ]
      )

      Result.new(
        listing_ids_for_enrichment: @store.listings.where(discogs_listing_id: changed_listing_ids).pluck(:id)
      )
    rescue StandardError => e
      Rails.logger.error("[StoreSync::ListingReconciler] upsert_all failed: #{e.message}")
      raise
    end

    private

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
