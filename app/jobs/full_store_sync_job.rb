class FullStoreSyncJob < ApplicationJob
  UPDATE_FIELDS = %i[
    discogs_release_id artist title label year
    condition price currency
    thumbnail_url notes listed_at last_seen_at
  ].freeze

  limits_concurrency to: 1, key: ->(*) { "discogs_api" }
  queue_as :default

  def perform(store_id, max_pages: nil)
    store = Store.find(store_id)
    store.update!(sync_status: "syncing")
    sync_started_at = Time.current

    result = store.sync_strategy.call(store, max_pages: max_pages)
    listing_ids_for_enrichment = import_listings(store, result.listings)

    if result.complete?
      remove_stale_listings(store, result.listings)
    end

    sync_manager(store).mark_succeeded!(
      last_synced_at: sync_started_at,
      total_listings: store.listings.count
    )

    Rails.logger.info("[FullStoreSyncJob] synced #{store.listings.count} listings for #{store.discogs_username}")

    if listing_ids_for_enrichment.any?
      EnrichmentJob.perform_later(store.id, listing_ids: listing_ids_for_enrichment)
    end
    DailyCurationJob.perform_later(store.id)
  rescue StandardError => error
    Rails.logger.error(
      "[FullStoreSyncJob] store=#{store&.discogs_username || store_id} job_id=#{job_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
    sync_manager(store).mark_failed!(error) if store
    raise
  end

  private

  def import_listings(store, listings)
    return [] if listings.empty?

    records = listings.index_by { |r| r[:discogs_listing_id] }
    existing = store.listings
      .where(discogs_listing_id: records.keys)
      .index_by(&:discogs_listing_id)

    changed_ids = records.filter_map do |id, record|
      existing_record = existing[id]
      id if existing_record.nil? || materially_changed?(existing_record, record)
    end

    store.listings.upsert_all(
      records.values,
      unique_by: :discogs_listing_id,
      update_only: UPDATE_FIELDS
    )

    store.listings
      .where(discogs_listing_id: changed_ids)
      .pluck(:id)
  end

  def remove_stale_listings(store, current_listings)
    current_ids = current_listings.map { |r| r[:discogs_listing_id] }

    if current_ids.empty?
      store.listings.delete_all
    else
      remove_listings_not_in_set(store, current_ids)
    end
  end

  def remove_listings_not_in_set(store, listing_ids)
    store.listings
      .where.not(discogs_listing_id: listing_ids)
      .delete_all
  end

  def sync_manager(store)
    StoreSync::StatusManager.new(store)
  end

  def materially_changed?(existing, incoming)
    differing?(
      [ existing.discogs_release_id.to_s, incoming[:discogs_release_id].to_s ],
      [ normalized_price(existing.price), normalized_price(incoming[:price]) ],
      [ existing.condition, incoming[:condition] ],
      [ existing.notes, incoming[:notes] ]
    )
  end

  def differing?(*pairs)
    pairs.any? { |a, b| a != b }
  end

  def normalized_price(value)
    value.present? ? BigDecimal(value.to_s) : nil
  end
end
