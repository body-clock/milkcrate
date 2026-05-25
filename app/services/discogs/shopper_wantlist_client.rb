# Client for Discogs Wantlist API endpoints.
# Requires an OAuth-authenticated shopper's access tokens.
#
# Uses Faraday for HTTP with explicit timeouts, then signs each request
# with OAuth 1.0a via the oauth gem. Network-level errors (timeout, DNS,
# connection refused) are wrapped in Errors::ApiError so callers handle
# them consistently.
module Discogs
  class ShopperWantlistClient
    BASE_URL = "https://api.discogs.com"
    MAX_RETRIES = 2
    RETRY_DELAY = 2.0

    AddWantResult = Data.define(:item_id)

    def initialize(access_token:, access_token_secret:)
      @access_token = access_token
      @access_token_secret = access_token_secret
    end

    # Adds a release to the authenticated user's Discogs wantlist.
    # Retries up to MAX_RETRIES on 429 rate limits with exponential backoff.
    def add_want(username:, release_id:)
      url = "#{BASE_URL}/users/#{username}/wants/#{release_id.to_i}"
      oauth_header = build_oauth_header(:put, url)

      retries = 0
      begin
        connection = build_connection
        response = connection.put(url) do |req|
          req.headers["Authorization"] = oauth_header
          req.headers["Content-Type"] = "application/json"
          req.body = ""
        end

        parse_faraday_response(response)
      rescue Faraday::TimeoutError, Faraday::ConnectionFailed => e
        raise Errors::ApiError, "Discogs connection error: #{e.message}"
      rescue Errors::RateLimitError
        if retries < MAX_RETRIES
          retries += 1
          sleep(RETRY_DELAY * retries)
          retry
        end
        raise
      end
    end

    private

    def build_connection
      Faraday.new(url: BASE_URL) do |f|
        f.options.timeout = 10
        f.options.open_timeout = 5
        f.request :json
        f.response :json, parser_options: { symbolize_names: false }
        f.adapter :net_http
      end
    end

    def build_oauth_header(http_method, url)
      consumer = DiscogsOauthConsumer.build
      token = OAuth::AccessToken.new(consumer, @access_token, @access_token_secret)
      signed = consumer.create_signed_request(http_method, url, token, {},
        { "Content-Type" => "application/json" })
      signed["Authorization"]
    end

    def parse_faraday_response(response)
      code = response.status
      body = response.body

      case code
      when 200..299
        item_id = body.is_a?(Hash) ? body.dig("want", "id") : nil
        AddWantResult.new(item_id:)
      when 429
        raise Errors::RateLimitError, "Discogs rate limit hit"
      else
        error_message = body.is_a?(Hash) ? (body["message"] || response.reason_phrase) : body.to_s
        raise Errors::ApiError, "Discogs API error: #{code} — #{error_message}"
      end
    end
  end
end
