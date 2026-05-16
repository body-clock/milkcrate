class LeadDiscovery::SellerFinder
  SAMPLE_PAGES = 3
  PER_PAGE = 100

  RATE_LIMIT_SLEEP = 1.1
  RATE_LIMIT_LOW   = 5
  RATE_LIMIT_PAUSE = 10

  DISCOVERY_QUIET_PAGES = 10  # how many pages to search before stopping
  INVENTORY_MIN = 1
  INVENTORY_MAX = 5_000

  # Genres that align with MilkCrate's strengths for directed discovery.
  TARGET_GENRES = %w[Jazz Soul Funk Electronic].freeze

  Candidate = Data.define(
    :discogs_username,
    :store_name,
    :inventory_size,
    :sampled_listings,
    :vinyl_count,
    :vinyl_percentage,
    :genres,
    :styles,
    :discogs_profile
  )

  def initialize(client: nil)
    @client = client || DiscogsClient.new
  end

  # Returns an array of Candidate structs for sellers that passed filtering.
  def find_candidates(seed_usernames: [])
    discovered_usernames = Set.new
    candidates = []

    # Phase 1: Discover sellers from genre-targeted marketplace search.
    discover_from_marketplace(discovered_usernames)

    # Phase 2: Include any seed usernames provided directly.
    seed_usernames.each { |u| discovered_usernames << u.to_s.strip.downcase }

    # Phase 3: Already-known usernames to skip.
    known = known_usernames

    # Phase 4: Sample each newly discovered seller.
    discovered_usernames.each do |username|
      next if known.include?(username)

      begin
        candidate = sample_seller(username)
        candidates << candidate if candidate
      rescue DiscogsClient::RateLimitError
        Rails.logger.warn "[LeadDiscovery::SellerFinder] Rate limited during discovery, pausing"
        sleep(15)
        retry
      rescue DiscogsClient::ApiError => e
        Rails.logger.warn "[LeadDiscovery::SellerFinder] API error for #{username}: #{e.message}"
      end
    end

    candidates
  end

  private

  attr_reader :client

  # ── Marketplace Discovery ──────────────────────────────────────────────

  def discover_from_marketplace(discovered)
    TARGET_GENRES.each do |genre|
      Rails.logger.info "[LeadDiscovery::SellerFinder] Searching marketplace for genre: #{genre}"
      search_listings(genre:) do |listing|
        seller = listing.dig("seller", "username")
        discovered << seller.downcase if seller
      end
    end
  end

  # Iterates over marketplace search pages for a genre and yields each listing.
  def search_listings(genre:)
    (1..DISCOVERY_QUIET_PAGES).each do |page|
      data = fetch_search_page(genre, page)
      listings = data["listings"] || data["results"] || []
      break if listings.empty?

      listings.each { |listing| yield listing }

      total_pages = data.dig("pagination", "pages") || 1
      break if page >= total_pages

      rate_limit_sleep
    end
  end

  def fetch_search_page(genre, page)
    # Discogs /database/search with type=listing returns marketplace listings.
    connection = Faraday.new(url: "https://api.discogs.com") do |f|
      f.options.timeout = 10
      f.options.open_timeout = 5
      f.request :url_encoded
      f.response :json
      f.headers["Authorization"] = "Discogs token=#{discogs_token}"
      f.headers["User-Agent"] = "Milkcrate/1.0 +https://milkcrate.fm"
    end

    response = connection.get("/database/search") do |req|
      req.params["type"] = "listing"
      req.params["genre"] = genre
      req.params["page"] = page
      req.params["per_page"] = PER_PAGE
      req.params["sort"] = "listed"
      req.params["sort_order"] = "desc"
    end

    case response.status
    when 200
      response.body
    when 429
      raise DiscogsClient::RateLimitError, "Discogs rate limit hit during search"
    else
      raise DiscogsClient::ApiError, "Discogs search error: #{response.status}"
    end
  end

  # ── Seller Sampling ────────────────────────────────────────────────────

  def sample_seller(username)
    profile = client.seller_profile(username)
    total_pages = client.seller_inventory_pages(username)
    inventory_size = estimate_inventory_size(total_pages)

    # Apply inventory size filter.
    return nil if inventory_size < INVENTORY_MIN || inventory_size > INVENTORY_MAX

    # Fetch sample pages.
    listings = fetch_sample_listings(username)
    return nil if listings.empty?

    # Compute metrics from sample.
    vinyl_count = count_vinyl(listings)
    vinyl_pct = (listings.size > 0 ? (vinyl_count.to_f / listings.size * 100).round(2) : 0.0)
    genre_set, style_set = extract_genres_and_styles(listings)

    Candidate.new(
      discogs_username: username,
      store_name: profile["name"].presence || username,
      inventory_size: inventory_size,
      sampled_listings: listings.first(50),  # keep a representative subset
      vinyl_count: vinyl_count,
      vinyl_percentage: vinyl_pct,
      genres: genre_set.to_a,
      styles: style_set.to_a,
      discogs_profile: profile.slice("name", "profile", "location", "rank", "rating")
    )
  end

  def fetch_sample_listings(username)
    all = []

    (1..SAMPLE_PAGES).each do |page|
      data = client.seller_inventory(username, page: page)
      listings = data["listings"] || []
      break if listings.empty?

      all.concat(listings)
      rate_limit_sleep
    end

    all
  rescue DiscogsClient::RateLimitError
    Rails.logger.warn "[LeadDiscovery::SellerFinder] Rate limited sampling #{username}, using #{all.size} listings"
    all
  end

  # ── Metrics Helpers ────────────────────────────────────────────────────

  VINYL_FORMATS = %w[vinyl lp ep single].freeze

  def count_vinyl(listings)
    listings.count { |l| vinyl_listing?(l) }
  end

  def vinyl_listing?(listing)
    format = listing.dig("release", "format") || listing["format"] || ""
    VINYL_FORMATS.any? { |vf| format.downcase.include?(vf) }
  end

  def extract_genres_and_styles(listings)
    genres = Set.new
    styles = Set.new

    listings.each do |listing|
      # Some listing responses include genre/style directly, others don't.
      # Use whatever is available from the inventory listing response.
      listing_genres = listing.dig("release", "genre") || listing["genre"]
      listing_styles = listing.dig("release", "style") || listing["style"]

      Array(listing_genres).each { |g| genres << g }
      Array(listing_styles).each { |s| styles << s }
    end

    [genres, styles]
  end

  # ── Filtering Helpers ──────────────────────────────────────────────────

  def estimate_inventory_size(total_pages)
    total_pages * PER_PAGE
  end

  def known_usernames
    store_usernames = Store.pluck(:discogs_username).to_set
    lead_usernames = Lead.where.not(status: %w[pending reviewed contacted])
                         .pluck(:discogs_username).to_set
    store_usernames | lead_usernames
  end

  # ── Rate Limiting ──────────────────────────────────────────────────────

  def rate_limit_sleep
    sleep(RATE_LIMIT_SLEEP)
  end

  # ── Discogs Token ──────────────────────────────────────────────────────

  def discogs_token
    @discogs_token ||= Rails.application.credentials.dig(:discogs, :token)
  end
end
