module StoreSync
  class ListingNormalizer
    VINYL_FORMATS = Listing::VINYL_FORMATS
    NON_VINYL = %w[CD Cassette DVD VHS].freeze

    def call(raw, store_id:)
      return unless vinyl?(raw)

      release = raw["release"] || {}
      basic_info = release["basic_information"] || release

      {
        discogs_listing_id: raw["id"].to_s,
        discogs_release_id: release["id"].to_s,
        artist: basic_info["artist"],
        title: basic_info["title"],
        label: extract_label(basic_info),
        year: release["year"],
        format: release["format"].presence || "Vinyl",
        genres: Array(basic_info["genres"]),
        styles: Array(basic_info["styles"]),
        condition: raw["condition"],
        price: raw.dig("price", "value"),
        currency: raw.dig("price", "currency") || "USD",
        thumbnail_url: release["thumbnail"],
        cover_image_url: release["cover_image"] || release["thumbnail"],
        notes: raw["comments"],
        listed_at: parse_time(raw["posted"]),
        last_seen_at: Time.current,
        store_id:
      }
    rescue StandardError => e
      Rails.logger.error("[StoreSync::ListingNormalizer] Error normalizing listing #{raw['id']}: #{e.message}")
      nil
    end

    private

    def vinyl?(raw)
      format_str = raw.dig("release", "format").to_s
      return false if NON_VINYL.any? { |format| format_str.include?(format) }

      formats = raw.dig("release", "formats") || []
      return true if formats.empty?

      formats.any? do |format|
        VINYL_FORMATS.any? { |vinyl_format| format["name"].to_s.include?(vinyl_format) }
      end
    end

    def extract_label(release_info)
      labels = release_info["labels"] || []
      labels.first&.dig("name")
    end

    def parse_time(str)
      Time.parse(str) if str
    rescue ArgumentError
      nil
    end
  end
end
