module CsvExportSync
  class ExportRequester
    POLL_INTERVAL = 5.seconds
    MAX_POLL_TIME = 10.minutes
    MAX_POLL_ATTEMPTS = (MAX_POLL_TIME / POLL_INTERVAL).ceil

    Result = Data.define(:csv_body, :export_id)
    class ExportError < StandardError; end

    def initialize(client:)
      @client = client
    end

    def call
      export_id = trigger_export
      wait_for_export(export_id)
      csv_body = download_export(export_id)
      Result.new(csv_body:, export_id:)
    end

    private

    def trigger_export
      response = @client.inventory_export
      export_id = response["id"] || response["export_id"]
      raise ExportError, "No export ID returned from Discogs" unless export_id
      export_id
    end

    def wait_for_export(export_id)
      MAX_POLL_ATTEMPTS.times do
        status = @client.check_export_status(export_id)
        return if status["status"] == "completed"

        raise ExportError, "Export failed with status: #{status["status"]}" if %w[failed error].include?(status["status"])

        sleep(POLL_INTERVAL)
      end

      raise ExportError, "Export timed out after #{MAX_POLL_TIME / 60} minutes"
    end

    def download_export(export_id)
      @client.download_export(export_id)
    end
  end
end
