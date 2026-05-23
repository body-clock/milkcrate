# Namespace for sync strategies (public API, CSV export).
module SyncStrategies
  # Sync strategy that imports listings from a Discogs CSV export via OAuth.
  class CsvExport
    class NotAuthorizedError < StandardError; end

    def initialize(client: nil)
      @client = client
    end

    def call(store, max_pages: nil)
      raise NotAuthorizedError, "Store #{store.discogs_username} has no store owner" unless store.store_owner

      client = @client || build_client(store)
      export_result = CsvExportSync::ExportRequester.new(client:).call
      parsed = CsvExportSync::CsvParser.new.call(export_result.csv_body, store_id: store.id)
      filtered = CsvExportSync::RecordFilter.call(parsed.records)
      filtered.each { |r| r.delete(:_status) }

      SyncStrategies::Result.new(listings: filtered, complete: true)
    end

    private

    def build_client(store)
      owner = store.store_owner
      DiscogsClient.new(
        access_token: owner.discogs_oauth_token,
        access_token_secret: owner.discogs_oauth_token_secret
      )
    end
  end
end
