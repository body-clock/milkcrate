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

    @store.update!(sync_status: "syncing")

    export_result = fetch_export
    enrichment_ids, total_count = import_listings(export_result.csv_body)
    finalize!(total_count)

    Result.new(listing_ids_for_enrichment: enrichment_ids, export_id: export_result.export_id)
  rescue StandardError => e
    StoreSync::StatusManager.new(@store).mark_failed!(e)
    raise
  end

  private

  def finalize!(total_count)
    StoreSync::StatusManager.new(@store).mark_succeeded!(
      total_listings: total_count,
      last_synced_at: Time.current
    )
  end

  def fetch_export
    CsvExportSync::ExportRequester.new(client: @client).call
  end

  def import_listings(csv_body)
    records = parse_records(csv_body)
    return [[], 0] if records.empty?

    enrichment_ids = upsert_records(records)
    [enrichment_ids, records.size]
  end

  def parse_records(csv_body)
    parsed = CsvExportSync::CsvParser.new.call(csv_body, store_id: @store.id)
    filtered = CsvExportSync::RecordFilter.call(parsed.records)
    filtered.each { |r| r.delete(:_status) }
    filtered.index_by { |r| r[:discogs_listing_id] }
  end

  def upsert_records(records)
    existing = @store.listings
      .where(discogs_listing_id: records.keys)
      .index_by(&:discogs_listing_id)

    changed = records.filter_map do |id, record|
      existing_record = existing[id]
      id if existing_record.nil? || materially_changed?(existing_record, record)
    end

    @store.listings.upsert_all(records.values, unique_by: :discogs_listing_id, update_only: UPDATE_FIELDS)

    @store.listings.where(discogs_listing_id: changed).pluck(:id)
  end



  def build_client
    owner = @store.store_owner
    raise SyncError, "Store #{@store.discogs_username} has no owner" unless owner

    DiscogsClient.new(
      access_token: owner.discogs_oauth_token,
      access_token_secret: owner.discogs_oauth_token_secret
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
