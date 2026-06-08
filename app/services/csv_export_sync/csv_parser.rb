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
      save_failure(csv_body, store_id)
      raise ParseError, "CSV parsing failed: #{e.message}"
    end

    private

    def save_failure(csv_body, store_id)
      FileUtils.mkdir_p(Rails.root.join("tmp/csv_failures"))
      path = "tmp/csv_failures/store-#{store_id}-#{Time.current.strftime('%Y%m%d%H%M%S')}.csv"
      File.binwrite(Rails.root.join(path), csv_body)
    rescue StandardError => e
      Rails.logger.warn("[CsvParser] could not save failing CSV: #{e.message}")
    end

    def parse_records(csv_body, store_id:)
      rows = try_parse(csv_body)
      validate_row_widths(rows)
      rows.filter_map { |row| normalize_row(row, store_id:) }
    end

    def try_parse(body)
      CSV.parse(body, headers: true)
    rescue CSV::MalformedCSVError => error
      recover(body, error)
    end

    def recover(body, error)
      return recover_newlines(body) if error.message.include?("Unquoted fields do not allow new line")
      return recover_newlines(body) if error.message.include?("New line must be")
      return liberal_parse(body) if error.message.include?("Illegal quoting")
      raise
    end

    def recover_newlines(body)
      repaired = body.gsub(/(?<!\r)\n/, " ")
      CSV.parse(repaired, headers: true)
    rescue CSV::MalformedCSVError => error
      raise unless error.message.include?("Illegal quoting")
      liberal_parse(repaired)
    end

    def liberal_parse(body)
      CSV.parse(body, headers: true, liberal_parsing: true)
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
