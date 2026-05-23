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
      export_id = trigger_or_find_export
      wait_for_export(export_id)
      csv_body = download_export(export_id)
      Result.new(csv_body:, export_id:)
    end

    private

    def trigger_or_find_export
      response = @client.inventory_export
      export_id = extract_export_id(response)
      raise ExportError, "Could not determine export ID from export trigger response" unless export_id
      Rails.logger.info("[ExportRequester] Export triggered: id=#{export_id} response=#{response.inspect}")
      export_id
    rescue DiscogsClient::ApiError => e
      if e.message.include?("409")
        Rails.logger.info("[ExportRequester] Export already in progress, checking recent exports")
        recent = @client.recent_exports
        raise ExportError, "No recent export found" if recent.blank?
        export_id = extract_export_id(recent.first)
        raise ExportError, "Could not determine export ID from recent exports" unless export_id
        Rails.logger.info("[ExportRequester] Using existing export: id=#{export_id}")
        export_id
      else
        raise
      end
    end

    def wait_for_export(export_id)
      MAX_POLL_ATTEMPTS.times do |attempt|
        response = @client.check_export_status(export_id)
        Rails.logger.info("[ExportRequester] Poll attempt #{attempt + 1}: id=#{export_id} response=#{response.inspect}")

        status = response["status"]
        return if %w[completed success].include?(status)

        if %w[failed error].include?(status)
          raise ExportError, "Export failed with status: #{status}"
        end

        sleep(POLL_INTERVAL)
      end

      raise ExportError, "Export timed out after #{MAX_POLL_TIME / 60} minutes"
    end

    def download_export(export_id)
      @client.download_export(export_id)
    end

    def extract_export_id(response)
      return nil unless response.is_a?(Hash)

      value = response["id"] || response["export_id"]
      return nil if value.blank?

      id = Integer(value, exception: false)
      id.positive? ? id : nil
    end
  end
end
