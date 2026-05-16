module Api
  class DiscogsLookupController < ApplicationController
    # Slug quality gate — only allow plausible Discogs usernames
    VALID_USERNAME_REGEX = /\A[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]\z/
    MIN_LENGTH = 3
    MAX_LENGTH = 40

    # Common reserved routes that should not trigger a Discogs lookup
    RESERVED_SLUGS = %w[
      admin apply jobs up assets 404 500 health
      login logout signup register
      api docs status help support
      favicon manifest service-worker
    ].freeze

    # Cache TTLs
    FOUND_TTL = 1.hour
    NOT_FOUND_TTL = 24.hours

    def show
      username = params[:username].to_s.strip

      unless plausible_username?(username)
        return render json: { found: false, reason: "invalid_slug" }, status: :ok
      end

      normalized = username.downcase
      cached = Rails.cache.read(cache_key(normalized))
      if cached
        return render json: cached, status: :ok
      end

      result = lookup_discogs(normalized)
      Rails.cache.write(cache_key(normalized), result, expires_in: result[:found] ? FOUND_TTL : NOT_FOUND_TTL)

      render json: result, status: :ok
    end

    private

    def plausible_username?(username)
      return false if username.length < MIN_LENGTH || username.length > MAX_LENGTH
      return false unless VALID_USERNAME_REGEX.match?(username)
      return false if RESERVED_SLUGS.include?(username.downcase)

      true
    end

    def lookup_discogs(username)
      client = DiscogsClient.new
      profile = client.seller_profile(username)
      { found: true, seller_name: profile["name"] || profile["username"], avatar_url: profile["avatar_url"] }
    rescue DiscogsClient::RateLimitError, DiscogsClient::ApiError => e
      { found: false, reason: "api_error" }
    end

    def cache_key(username)
      "discogs_lookup/#{username}"
    end
  end
end
