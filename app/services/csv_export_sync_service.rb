class CsvExportSyncService
  Result = Data.define(:listing_ids_for_enrichment, :export_id)
  class SyncError < StandardError; end

  UPDATE_FIELDS = %i[
    discogs_release_id artist title label year
    format condition price notes listed_at last_seen_at
  ].freeze

  def initialize(store, client: nil)
    @store = store
    @client = client || build_client
  end

  def call
    raise SyncError, "Store #{@store.discogs_username} is not OAuth authorized" unless @store.oauth_authorized?

    StoreSync::StatusManager.new(@store).tap do |status|
      status.send(:mark_succeeded!, sync_status: "syncing")
    end

    # Step 1: Trigger CSV export and download
    export_result = CsvExportSync::ExportRequester.new(client: @client).call

    # Step 2: Parse CSV into listing records
    parse_result = CsvExportSync::CsvParser.new.call(export_result.csv_body, store_id: @store.id)

    # Step 3: Upsert listings directly (records are already normalized)
    records = parse_result.records.index_by { |r| r[:discogs_listing_id] }
    enrichment_ids = []

    if records.any?
      existing = @store.listings
        .where(discogs_listing_id: records.keys)
        .index_by(&:discogs_listing_id)

      changed = records.filter_map do |id, record|
        existing_record = existing[id]
        id if existing_record.nil? || materially_changed?(existing_record, record)
      end

      @store.listings.upsert_all(
        records.values,
        unique_by: :discogs_listing_id,
        update_only: UPDATE_FIELDS
      )

      enrichment_ids = @store.listings
        .where(discogs_listing_id: changed)
        .pluck(:id)
    end

    # Step 4: Update store metadata
    StoreSync::StatusManager.new(@store).mark_succeeded!(
      total_listings: records.size,
      last_synced_at: Time.current
    )

    Result.new(listing_ids_for_enrichment: enrichment_ids, export_id: export_result.export_id)
  rescue StandardError => e
    StoreSync::StatusManager.new(@store).mark_failed!(e)
    raise
  end

  private

  def build_client
    DiscogsClient.new(
      access_token: @store.discogs_oauth_token,
      access_token_secret: @store.discogs_oauth_token_secret
    )
  end

  def materially_changed?(existing, incoming)
    [
      existing.discogs_release_id.to_s,
      existing.price&.to_s,
      existing.condition,
      existing.format,
      existing.notes
    ] != [
      incoming[:discogs_release_id].to_s,
      incoming[:price]&.to_s,
      incoming[:condition],
      incoming[:format],
      incoming[:notes]
    ]
  end
end
