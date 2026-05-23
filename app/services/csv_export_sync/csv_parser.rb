require "csv"

module CsvExportSync
  class CsvParser
    HEADER_TO_FIELD = {
      "listing_id" =>  { field: :discogs_listing_id, coerce: ->(v) { v.to_s } },
      "release_id" =>  { field: :discogs_release_id, coerce: ->(v) { v.to_s } },
      "artist" =>      { field: :artist, coerce: ->(v) { v.strip } },
      "title" =>       { field: :title, coerce: ->(v) { v.strip } },
      "label" =>       { field: :label, coerce: ->(v) { v.strip } },
      "format" =>      { field: :format, coerce: ->(v) { v.strip } },
      "condition" =>   { field: :condition, coerce: ->(v) { v.strip } },
      "price" =>       { field: :price, coerce: ->(v) { v.to_d } },
      "posted" =>      { field: :listed_at, coerce: ->(v) { CsvParser.parse_time(v) } },
      "comments" =>    { field: :notes, coerce: ->(v) { v.strip.presence } },
      "status" =>      { field: :_status, coerce: ->(v) { v.strip } }
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

      HEADER_TO_FIELD.each do |header, config|
        value = row[header]
        record[config[:field]] = value.nil? ? nil : config[:coerce].call(value)
      end

      record
    end

    def self.parse_time(str)
      Time.parse(str)
    rescue ArgumentError
      nil
    end
  end

  class ParseError < StandardError; end
end
