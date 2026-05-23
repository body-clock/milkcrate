# Looks up a Discogs seller by username to verify they exist before onboarding.
class DiscogsSellerLookup
  ROUTE_USERNAME_REGEX = /#{Settings.discogs.username_pattern}/
  VALID_USERNAME_REGEX = /\A#{Settings.discogs.username_pattern}\z/
  MIN_LENGTH = 3
  MAX_LENGTH = 40

  RESERVED_SLUGS = %w[
    admin apply jobs up assets 404 500 health
    login logout signup register
    api docs status help support
    favicon manifest service-worker
  ].freeze

  FOUND_TTL = 1.hour
  NOT_FOUND_TTL = 24.hours

  def initialize(username, client: DiscogsClient.new, cache: Rails.cache)
    @username = username.to_s.strip
    @client = client
    @cache = cache
  end

  def call
    return invalid_slug unless plausible_username?

    cached_result = cache.read(cache_key)
    return cached_result unless cached_result.nil?

    result = lookup_discogs

    unless result[:reason] == "api_error"
      cache.write(cache_key, result, expires_in: result[:found] ? FOUND_TTL : NOT_FOUND_TTL)
    end

    result
  rescue DiscogsClient::RateLimitError, DiscogsClient::ApiError, Faraday::Error
    api_error
  end

  private

  attr_reader :username, :client, :cache

  def plausible_username?
    return false if username.length < MIN_LENGTH || username.length > MAX_LENGTH
    return false unless VALID_USERNAME_REGEX.match?(username)
    return false if RESERVED_SLUGS.include?(normalized_username)

    true
  end

  def lookup_discogs
    profile = client.seller_profile(normalized_username)

    {
      found: true,
      seller_name: profile["name"] || profile["username"],
      avatar_url: profile["avatar_url"]
    }
  end

  def cache_key
    "discogs_lookup/#{normalized_username}"
  end

  def normalized_username
    username.downcase
  end

  def invalid_slug
    { found: false, reason: "invalid_slug" }
  end

  def api_error
    { found: false, reason: "api_error" }
  end
end
