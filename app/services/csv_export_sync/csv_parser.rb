require "csv"

# Namespace for CSV export sync components.
module CsvExportSync
  # Parses Discogs CSV export data into structured listing records.
  class CsvParser
    HEADER_TO_FIELD = {
      "listing_id" =>      { field: :discogs_listing_id, coerce: ->(v) { v.to_s } },
      "release_id" =>      { field: :discogs_release_id, coerce: ->(v) { v.to_s } },
      "artist" =>          { field: :artist, coerce: ->(v) { v.strip } },
      "title" =>           { field: :title, coerce: ->(v) { v.strip } },
      "label" =>           { field: :label, coerce: ->(v) { v.strip } },
      "format" =>          { field: :format, coerce: ->(v) { v.strip } },
      "media_condition" => { field: :condition, coerce: ->(v) { v.strip } },
      "price" =>           { field: :price, coerce: ->(v) { v.to_d } },
      "listed" =>          { field: :listed_at, coerce: ->(v) { CsvParser.parse_time(v) } },
      "comments" =>        { field: :notes, coerce: ->(v) { v.strip.presence } },
      "status" =>          { field: :_status, coerce: ->(v) { v.strip } }
    }.freeze

    Result = Data.define(:records)

    def call(csv_body, store_id:)
      Result.new(records: parse_records(csv_body, store_id:))
    rescue CSV::MalformedCSVError => e
      raise ParseError, "CSV parsing failed: #{e.message}"
    end

    private

    def parse_records(csv_body, store_id:)
      rows = parse_rows(csv_body)
      validate_row_widths(rows)
      rows.filter_map { |row| normalize_row(row, store_id:) }
    end

    def parse_rows(csv_body)
      CSV.parse(csv_body, headers: true)
    rescue CSV::MalformedCSVError => error
      raise unless error.message.include?("Unquoted fields do not allow new line")
      # Auto-detected row separator is likely CRLF — bare LFs are data-embedded.
      # Replace them with spaces and retry.
      CSV.parse(csv_body.gsub(/(?<!\r)\n/, " "), headers: true)
    end

    def validate_row_widths(rows)
      expected = rows.headers&.compact&.length
      return unless expected

      rows.each_with_index { |row, index| validate_row_width(row, expected, index) }
    end

    def validate_row_width(row, expected, index)
      return if row.size == expected

      raise ParseError,
        "CSV parsing failed: unexpected number of fields in line #{index + 2}"
    end

    def normalize_row(row, store_id:)
      record = base_record(store_id)
      apply_fields(record, row)
      record
    end

    def base_record(store_id)
      { store_id:, last_seen_at: Time.current }
    end

    def apply_fields(record, row)
      HEADER_TO_FIELD.each do |header, config|
        value = row[header]
        record[config[:field]] = value.nil? ? nil : config[:coerce].call(value)
      end
    end

    def self.parse_time(str)
      Time.parse(str)
    rescue ArgumentError
      nil
    end
  end

  class ParseError < StandardError; end
end
