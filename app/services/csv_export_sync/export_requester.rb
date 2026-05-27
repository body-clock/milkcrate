# Namespace for CSV export sync components.
module CsvExportSync
  # Requests and polls a Discogs CSV export, then downloads the result.
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
      trigger_new_export
    rescue DiscogsClient::ApiError => e
      handle_export_conflict(e)
    end

    def handle_export_conflict(e)
      raise unless e.message.include?("409")
      resolve_recent_export
    end

    def resolve_recent_export
      export_id = extract_and_validate_export_id
      Rails.logger.info("[ExportRequester] Using existing export: id=#{export_id}")
      export_id
    end

    def extract_and_validate_export_id
      recent = @client.recent_exports
      raise ExportError, "No recent export found" if recent.blank?
      validate_export_id(recent.first)
    end

    def validate_export_id(export_data)
      export_id = extract_export_id(export_data)
      raise ExportError, "Could not determine export ID from recent exports" unless export_id
      export_id
    end

    def trigger_new_export
      response = @client.inventory_export
      export_id = extract_export_id(response)
      raise ExportError, "Could not determine export ID from export trigger response" unless export_id
      Rails.logger.info("[ExportRequester] Export triggered: id=#{export_id} response=#{response.inspect}")
      export_id
    end



    def wait_for_export(export_id)
      MAX_POLL_ATTEMPTS.times do |attempt|
        poll_attempt(export_id, attempt)
      end

      raise ExportError, "Export timed out after #{MAX_POLL_TIME / 60} minutes"
    end

    def poll_attempt(export_id, attempt)
      response = fetch_export_status(export_id, attempt)
      sleep(POLL_INTERVAL) unless export_finished?(response)
    end

    def fetch_export_status(export_id, attempt)
      response = @client.check_export_status(export_id)
      Rails.logger.info("[ExportRequester] Poll attempt #{attempt + 1}: id=#{export_id} response=#{response.inspect}")
      response
    end

    def export_finished?(response)
      status = response["status"]
      return true if %w[completed success].include?(status)
      raise ExportError, "Export failed with status: #{status}" if %w[failed error].include?(status)
      false
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
