class StoreSyncService
  VINYL_FORMATS = %w[Vinyl LP EP Single].freeze

  def initialize(store)
    @store = store
    @client = DiscogsClient.new
  end

  # Full sync: crawls all pages. Pass max_pages: 1 for a quick 100-record dev sync.
  def full_sync(max_pages: nil)
    @store.update!(sync_status: "syncing")
    page = 1
    total_imported = 0

    loop do
      data = @client.seller_inventory(@store.discogs_username, page: page)
      listings = data["listings"] || []
      break if listings.empty?

      import_listings(listings)
      total_imported += listings.size

      pagination = data["pagination"] || {}
      break if page >= (pagination["pages"] || 1)
      break if max_pages && page >= max_pages

      page += 1
      sleep(0.5) # be kind to the API
    end

    @store.update!(
      sync_status: "idle",
      last_synced_at: Time.current,
      total_listings: @store.listings.count
    )
    total_imported
  rescue StandardError => e
    @store.update!(sync_status: "failed")
    raise e
  end

  # Delta sync: grabs first N pages (newest listings). Run hourly.
  def delta_sync(pages: 5)
    @store.update!(sync_status: "syncing")

    pages.times do |i|
      data = @client.seller_inventory(@store.discogs_username, page: i + 1)
      listings = data["listings"] || []
      break if listings.empty?

      import_listings(listings)
      sleep(0.3)
    end

    @store.update!(
      sync_status: "idle",
      last_synced_at: Time.current,
      total_listings: @store.listings.count
    )
  rescue StandardError => e
    @store.update!(sync_status: "failed")
    raise e
  end

  private

  def import_listings(raw_listings)
    vinyl_listings = raw_listings.select { |l| vinyl?(l) }

    vinyl_listings.each do |raw|
      upsert_listing(raw)
    end
  end

  def upsert_listing(raw)
    release = raw["release"] || {}
    basic_info = release

    genres = Array(basic_info["genres"])
    styles = Array(basic_info["styles"])
    format_descriptions = Array(raw.dig("release", "formats")&.flat_map { |f| [ f["name"], *Array(f["descriptions"]) ] })

    @store.listings.upsert(
      {
        discogs_listing_id: raw["id"].to_s,
        discogs_release_id: release["id"].to_s,
        artist: basic_info["artist"],
        title: basic_info["title"],
        label: extract_label(basic_info),
        year: release["year"],
        format: format_descriptions.join(", ").presence || "Vinyl",
        genres: genres,
        styles: styles,
        condition: raw["condition"],
        price: raw.dig("price", "value"),
        currency: raw.dig("price", "currency") || "USD",
        thumbnail_url: release["thumbnail"],
        cover_image_url: release["cover_image"] || release["thumbnail"],
        notes: raw["comments"],
        listed_at: parse_time(raw["posted"]),
        last_seen_at: Time.current,
        store_id: @store.id
      },
      unique_by: :discogs_listing_id,
      update_only: %i[condition price currency thumbnail_url cover_image_url last_seen_at notes]
    )
  rescue StandardError => e
    Rails.logger.warn("Failed to upsert listing #{raw['id']}: #{e.message}")
  end

  def vinyl?(raw)
    formats = raw.dig("release", "formats") || []
    return true if formats.empty? # assume vinyl if unknown

    formats.any? do |f|
      VINYL_FORMATS.any? { |vf| f["name"].to_s.include?(vf) }
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
