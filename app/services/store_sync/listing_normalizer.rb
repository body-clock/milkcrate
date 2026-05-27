# Namespace for store sync components (fetch, normalize, reconcile, status).
module StoreSync
  # Normalizes raw Discogs listing data into the internal listing schema.
  class ListingNormalizer
    VINYL_FORMATS = Listing::VINYL_FORMATS
    NON_VINYL = %w[CD Cassette DVD VHS].freeze

    def call(raw, store_id:)
      normalize(raw, store_id:)
    rescue StandardError => e
      Rails.logger.error("[StoreSync::ListingNormalizer] Error normalizing listing #{raw['id']}: #{e.message}")
      nil
    end

    def normalize(raw, store_id:)
      return unless vinyl?(raw)

      info = release_info(raw)
      base_fields(raw, info, store_id).merge(discogs_fields(raw, info)).merge(timestamp_fields(raw))
    end

    private

    def base_fields(raw, info, store_id)
      {
        discogs_listing_id: raw["id"].to_s,
        discogs_release_id: info[:release_id],
        artist: info[:artist],
        title: info[:title],
        label: extract_label(info[:basic_info]),
        year: info[:year],
        format: info[:format],
        genres: info[:genres],
        styles: info[:styles],
        condition: raw["condition"],
        store_id:
      }
    end

    def discogs_fields(raw, info)
      {
        price: raw.dig("price", "value"),
        currency: raw.dig("price", "currency") || "USD",
        thumbnail_url: info[:thumbnail],
        cover_image_url: info[:cover_image],
        notes: raw["comments"]
      }
    end

    def timestamp_fields(raw)
      {
        listed_at: parse_time(raw["posted"]),
        last_seen_at: Time.current
      }
    end

    def release_info(raw)
      release = raw["release"] || {}
      info = release["basic_information"] || release
      {
        release_id: release["id"].to_s,
        artist: info["artist"],
        title: info["title"],
        year: release["year"],
        format: release["format"].presence || "Vinyl",
        genres: Array(info["genres"]),
        styles: Array(info["styles"]),
        thumbnail: info["thumbnail"],
        cover_image: info["cover_image"] || info["thumbnail"],
        basic_info: info
      }
    end

    def vinyl?(raw)
      format_str = raw.dig("release", "format").to_s
      return false if NON_VINYL.any? { |format| format_str.include?(format) }
      formats = raw.dig("release", "formats") || []
      formats.empty? || formats.any? { |f| VINYL_FORMATS.any? { |vf| f["name"].to_s.include?(vf) } }
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
