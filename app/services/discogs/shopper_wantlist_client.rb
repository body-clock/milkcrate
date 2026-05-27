# Client for Discogs Wantlist API endpoints.
# Requires an OAuth-authenticated shopper's access tokens.
module Discogs
  class ShopperWantlistClient
    BASE_URL = "https://api.discogs.com"
    MAX_RETRIES = 2
    RETRY_DELAY = 2.0
    OPEN_TIMEOUT = 5
    READ_TIMEOUT = 10

    AddWantResult = Data.define(:item_id)

    def initialize(access_token:, access_token_secret:)
      @access_token = access_token
      @access_token_secret = access_token_secret
    end

    # Adds a release to the authenticated user's Discogs wantlist.
    # Retries up to MAX_RETRIES on 429 rate limits with exponential backoff.
    def add_want(username:, release_id:)
      with_rate_limit_retries { submit_want(username:, release_id:) }
    rescue Net::OpenTimeout, Net::ReadTimeout, Errno::ECONNREFUSED, Errno::ECONNRESET, SocketError => e
      raise Errors::ApiError, "Discogs connection error: #{e.class}: #{e.message}"
    end

    private

    def oauth_access_token
      @oauth_access_token ||= configured_access_token
    end

    def configured_access_token
      token = OAuth::AccessToken.new(DiscogsOauthConsumer.build, @access_token, @access_token_secret)
      configure_http_timeouts(token)
      token
    end

    def configure_http_timeouts(token)
      http = token.consumer.http
      http.open_timeout = OPEN_TIMEOUT
      http.read_timeout = READ_TIMEOUT
    end

    def submit_want(username:, release_id:)
      response = oauth_access_token.put(want_url(username, release_id), "", "Content-Type" => "application/json")
      parse_oauth_response(response)
    end

    def want_url(username, release_id)
      "#{BASE_URL}/users/#{username}/wants/#{release_id.to_i}"
    end

    def with_rate_limit_retries(retries = 0, &block)
      yield
    rescue Errors::RateLimitError
      raise if retries >= MAX_RETRIES
      sleep(RETRY_DELAY * (retries + 1))
      with_rate_limit_retries(retries + 1, &block)
    end

    def parse_oauth_response(response)
      body = response.body.blank? ? {} : JSON.parse(response.body)
      return success_result(body) if response.code.to_i.between?(200, 299)

      raise_response_error(response)
    rescue JSON::ParserError
      raise Errors::ApiError, "Discogs API error: #{response.code}"
    end

    def raise_response_error(response)
      raise Errors::RateLimitError, "Discogs rate limit hit" if response.code.to_i == 429
      raise Errors::ApiError, "Discogs API error: #{response.code}"
    end

    def success_result(body)
      AddWantResult.new(item_id: body.is_a?(Hash) ? body.dig("want", "id") : nil)
    end
  end
end
