require "csv"

module CsvExportSync
  class CsvParser
    HEADER_TO_FIELD = {
      "listing_id" => :discogs_listing_id,
      "release_id" => :discogs_release_id,
      "artist" => :artist,
      "title" => :title,
      "label" => :label,
      "format" => :format,
      "condition" => :condition,
      "price" => :price,
      "posted" => :listed_at,
      "comments" => :notes
    }.freeze

    Result = Data.define(:records)

    def call(csv_body, store_id:)
      rows = CSV.parse(csv_body, headers: true)
      records = rows.filter_map { |row| normalize_row(row, store_id:) }
      Result.new(records:)
    rescue CSV::MalformedCSVError => e
      raise ParseError, "CSV parsing failed: #{e.message}"
    end

    private

    def normalize_row(row, store_id:)
      record = { store_id:, last_seen_at: Time.current }

      HEADER_TO_FIELD.each do |header, field|
        value = row[header]
        next if value.nil?

        record[field] = case field
        when :price
          value.to_d
        when :listed_at
          parse_time(value)
        when :discogs_listing_id, :discogs_release_id
          value.to_s
        else
          value.strip.presence
        end
      end

      # Skip non-vinyl formats
      return nil unless vinyl?(record[:format])

      # Skip sold/unavailable listings
      status = row["status"]
      return nil if status.present? && %w[Sold Draft Expired].include?(status.strip)

      # Ensure required fields
      return nil if record[:discogs_listing_id].blank?

      record
    end

    def vinyl?(format)
      return true if format.blank?
      non_vinyl = %w[CD Cassette DVD VHS]
      non_vinyl.none? { |nv| format.include?(nv) }
    end

    def parse_time(str)
      Time.parse(str)
    rescue ArgumentError
      nil
    end
  end

  class ParseError < StandardError; end
end
