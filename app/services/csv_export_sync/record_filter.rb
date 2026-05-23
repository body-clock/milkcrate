# Namespace for CSV export sync components.
module CsvExportSync
  # Filters parsed CSV records to remove non-LP formats and unwanted entries.
  module RecordFilter
    NON_VINYL = %w[CD Cassette DVD VHS].freeze
    SOLD_STATUSES = %w[Sold Draft Expired].freeze

    def self.call(records)
      records.select do |record|
        vinyl?(record[:format]) &&
          record[:discogs_listing_id].present? &&
          !sold?(record[:_status])
      end
    end

    def self.vinyl?(format)
      return true if format.blank?
      NON_VINYL.none? { |nv| format.include?(nv) }
    end

    def self.sold?(status)
      status.present? && SOLD_STATUSES.include?(status)
    end
  end
end
