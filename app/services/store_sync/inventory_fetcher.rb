# Fetches a store inventory from the Discogs API with pagination handling.
class StoreSync::InventoryFetcher
  Result = Data.define(:listings, :pages_fetched, :total_pages)

  DISCOGS_PAGE_LIMIT_ERROR = "Pagination above 100"

  def initialize(store, client: nil)
    @store = store
    @client = client || DiscogsClient.new
  end

  def fetch(sort_order: "desc", max_pages: nil)
    all_listings = []
    total_pages = nil

    each_page(sort_order:, max_pages:) do |data, page|
      total_pages = extract_total_pages(data)
      all_listings.concat(data["listings"] || [])
    end

    Result.new(listings: all_listings, pages_fetched: pages_fetched, total_pages: total_pages)
  end

  private

  def each_page(sort_order:, max_pages:)
    @pages_fetched = 0

    loop do
      @pages_fetched += 1
      data = fetch_page(@pages_fetched, sort_order)

      break if empty_page?(data)

      yield data, @pages_fetched

      break if last_page?(data, max_pages)
    end
  end

  def fetch_page(page, sort_order)
    @client.seller_inventory(@store.discogs_username, page:, sort_order:)
  rescue DiscogsClient::ApiError => e
    raise unless e.message.include?(DISCOGS_PAGE_LIMIT_ERROR)
    log_page_limit_hit(page)
    nil
  end

  def empty_page?(data)
    data.nil? || (data["listings"] || []).empty?
  end

  def last_page?(data, max_pages)
    current = @pages_fetched
    total = extract_total_pages(data)
    current >= total || (max_pages && current >= max_pages)
  end

  def extract_total_pages(data)
    data&.dig("pagination", "pages") || 1
  end

  def log_page_limit_hit(page)
    Rails.logger.info "[StoreSync::InventoryFetcher] Hit Discogs 100-page limit " \
                      "for #{@store.discogs_username}, stopping at page #{page}"
  end

  def pages_fetched
    @pages_fetched || 0
  end
end
