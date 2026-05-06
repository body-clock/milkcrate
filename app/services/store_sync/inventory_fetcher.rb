class StoreSync::InventoryFetcher
  Result = Data.define(:listings, :pages_fetched, :total_pages)

  def initialize(store, client: nil)
    @store = store
    @client = client || DiscogsClient.new
  end

  def fetch(sort_order: "desc", max_pages: nil)
    all_listings = []
    page = 1
    total_pages = nil

    loop do
      data = @client.seller_inventory(@store.discogs_username, page: page, sort_order: sort_order)
      page_listings = data["listings"] || []
      break if page_listings.empty?

      all_listings.concat(page_listings)

      pagination = data["pagination"] || {}
      total_pages = pagination["pages"] || 1
      break if page >= total_pages
      break if max_pages && page >= max_pages

      page += 1
      sleep(0.5)
    rescue DiscogsClient::ApiError => e
      raise unless e.message.include?("Pagination above 100")
      Rails.logger.info "[StoreSync::InventoryFetcher] Hit Discogs 100-page limit for #{@store.discogs_username}, stopping at page #{page}"
      break
    end

    Result.new(listings: all_listings, pages_fetched: page, total_pages: total_pages)
  end
end
