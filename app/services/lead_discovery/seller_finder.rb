# frozen_string_literal: true

# Discovers Discogs sellers for lead generation.
#
# The Discogs API does not provide a cross-seller "browse marketplace by genre"
# endpoint. Sellers must be discovered through specific usernames (seeds).
#
# ## Discovery strategies
#
# 1. **Seed usernames** (primary) — operators provide known Discogs sellers
#    via rake tasks or the pipeline job's `seed_usernames:` parameter.
# 2. **Internal curated list** — a small set of well-known sellers in target
#    genres used as a bootstrap when no seeds are provided.
#
# Once a username is known, SellerFinder samples their inventory to estimate
# vinyl share, genre depth, and overall fit — then returns a Candidate struct
# for scoring and web-presence checking.
#
class LeadDiscovery::SellerFinder
  SAMPLE_PAGES = 3
  PER_PAGE = 100

  RATE_LIMIT_SLEEP = 1.1
  RATE_LIMIT_LOW   = 5
  RATE_LIMIT_PAUSE = 10

  INVENTORY_MIN = 1
  INVENTORY_MAX = 5_000

  # A small bootstrap list of Discogs sellers in target genres.
  # Operators should expand this by passing seed_usernames to the pipeline.
  CURATED_SEEDS = %w[
    analog_attic
    alpharecords
    dustygroove
    thirdmanrecords
    easystreetrecords
  ].freeze

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
  #
  # When +seed_usernames+ is provided, only those sellers are evaluated
  # (plus any from the curated bootstrap list). When empty, the curated
  # list is used as a starting point.
  def find_candidates(seed_usernames: [])
    usernames_to_check = resolve_usernames(seed_usernames)
    known = known_usernames
    candidates = []

    usernames_to_check.each do |username|
      next if known.include?(username)

      begin
        candidate = sample_seller(username)
        candidates << candidate if candidate
      rescue DiscogsClient::RateLimitError
        Rails.logger.warn "[LeadDiscovery::SellerFinder] Rate limited, pausing 15s"
        sleep(15)
        retry
      rescue DiscogsClient::ApiError => e
        Rails.logger.warn "[LeadDiscovery::SellerFinder] API error for #{username}: #{e.message}"
      rescue Faraday::TimeoutError
        Rails.logger.warn "[LeadDiscovery::SellerFinder] Timeout for #{username}, skipping"
      end
    end

    candidates
  end

  private

  attr_reader :client

  # ── Username Resolution ────────────────────────────────────────────────

  def resolve_usernames(seed_usernames)
    seeds = seed_usernames.map(&:to_s).map(&:strip).map(&:downcase).reject(&:empty?)
    seeds = CURATED_SEEDS.dup if seeds.empty?
    seeds.uniq
  end

  # ── Seller Sampling ────────────────────────────────────────────────────

  def sample_seller(username)
    profile = client.seller_profile(username)
    total_pages = client.seller_inventory_pages(username)
    inventory_size = estimate_inventory_size(total_pages)

    return nil if inventory_size < INVENTORY_MIN || inventory_size > INVENTORY_MAX

    listings = fetch_sample_listings(username)
    return nil if listings.empty?

    vinyl_count = count_vinyl(listings)
    vinyl_pct = listings.size > 0 ? (vinyl_count.to_f / listings.size * 100).round(2) : 0.0
    genre_set, style_set = extract_genres_and_styles(listings)

    Candidate.new(
      discogs_username: username,
      store_name: profile["name"].presence || username,
      inventory_size:,
      sampled_listings: listings.first(50),
      vinyl_count:,
      vinyl_percentage: vinyl_pct,
      genres: genre_set.to_a,
      styles: style_set.to_a,
      discogs_profile: profile.slice("name", "profile", "location", "rank", "rating")
    )
  end

  def fetch_sample_listings(username)
    all = []

    (1..SAMPLE_PAGES).each do |page|
      data = client.seller_inventory(username, page:)
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
end
