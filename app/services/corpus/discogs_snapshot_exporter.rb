require "json"
require "time"

module Corpus
  class DiscogsSnapshotExporter
    SNAPSHOT_VERSION = 1
    DEFAULT_SNAPSHOT_PATH = Rails.root.join("db/corpus/discogs_store_snapshot.json")

    def initialize(username:, output_path: DEFAULT_SNAPSHOT_PATH, max_pages: 5, client: DiscogsClient.new)
      @username = username
      @output_path = Pathname(output_path)
      @max_pages = max_pages.to_i
      @client = client
    end

    def call
      listings = fetch_inventory
      payload = {
        "snapshot_version" => SNAPSHOT_VERSION,
        "captured_at" => Time.current.utc.iso8601,
        "source" => {
          "discogs_username" => username,
          "max_pages" => max_pages,
          "per_page" => DiscogsClient::PER_PAGE
        },
        "store" => {
          "name" => username.titleize,
          "discogs_username" => username,
          "description" => nil
        },
        "listings" => listings.sort_by { |row| row.fetch("discogs_listing_id") }
      }

      FileUtils.mkdir_p(output_path.dirname)
      File.write(output_path, JSON.pretty_generate(payload))
      payload
    end

    private

    attr_reader :username, :output_path, :max_pages, :client

    def fetch_inventory
      page = 1
      listings = []

      loop do
        data = client.seller_inventory(username, page:)
        page_listings = data.fetch("listings", [])

        page_listings.each do |raw|
          next unless vinyl?(raw)

          listings << normalize(raw)
        end

        total_pages = data.dig("pagination", "pages").to_i
        break if total_pages <= 1 || page >= total_pages
        break if max_pages.positive? && page >= max_pages

        page += 1
      end

      listings
    end

    def vinyl?(raw)
      formats = raw.dig("release", "formats") || []
      return true if formats.empty?

      formats.any? do |format|
        Listing::VINYL_FORMATS.any? { |vf| format["name"].to_s.include?(vf) }
      end
    end

    def normalize(raw)
      release = raw["release"] || {}
      {
        "discogs_listing_id" => raw.fetch("id").to_s,
        "discogs_release_id" => release["id"]&.to_s,
        "artist" => release["artist"],
        "title" => release["title"],
        "label" => Array(release["labels"]).first&.dig("name"),
        "year" => release["year"],
        "format" => format_name(raw),
        "genres" => Array(release["genres"]).compact,
        "styles" => Array(release["styles"]).compact,
        "condition" => raw["condition"],
        "price" => raw.dig("price", "value"),
        "currency" => raw.dig("price", "currency") || "USD",
        "thumbnail_url" => release["thumbnail"],
        "cover_image_url" => release["cover_image"] || release["thumbnail"],
        "notes" => raw["comments"],
        "listed_at" => parse_time(raw["posted"])
      }
    end

    def format_name(raw)
      format_parts = Array(raw.dig("release", "formats")).flat_map do |format|
        [ format["name"], *Array(format["descriptions"]) ]
      end.compact

      format_parts.join(", ").presence || "Vinyl"
    end

    def parse_time(value)
      return nil if value.blank?

      Time.parse(value).utc.iso8601
    rescue ArgumentError
      nil
    end
  end
end
