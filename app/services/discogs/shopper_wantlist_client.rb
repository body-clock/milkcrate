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
      retries = 0
      begin
        response = oauth_access_token.put(
          "#{BASE_URL}/users/#{username}/wants/#{release_id.to_i}",
          "",  # PUT with empty body
          "Content-Type" => "application/json"
        )

        parse_oauth_response(response)
      rescue Errors::RateLimitError
        if retries < MAX_RETRIES
          retries += 1
          sleep(RETRY_DELAY * retries)
          retry
        end
        raise
      rescue Net::OpenTimeout, Net::ReadTimeout, Errno::ECONNREFUSED, Errno::ECONNRESET, SocketError => e
        raise Errors::ApiError, "Discogs connection error: #{e.class}: #{e.message}"
      end
    end

    private

    def oauth_access_token
      @oauth_access_token ||= begin
        consumer = DiscogsOauthConsumer.build
        token = OAuth::AccessToken.new(consumer, @access_token, @access_token_secret)
        configure_http_timeouts(token)
        token
      end
    end

    def configure_http_timeouts(token)
      http = token.consumer.http
      http.open_timeout = OPEN_TIMEOUT
      http.read_timeout = READ_TIMEOUT
    end

    def parse_oauth_response(response)
      code = response.code.to_i
      body = response.body

      parsed_body = body.blank? ? {} : JSON.parse(body)

      case code
      when 200..299
        AddWantResult.new(item_id: parsed_body.is_a?(Hash) ? parsed_body.dig("want", "id") : nil)
      when 429
        raise Errors::RateLimitError, "Discogs rate limit hit"
      else
        error_message = parsed_body.is_a?(Hash) ? (parsed_body["message"] || response.body) : response.body
        raise Errors::ApiError, "Discogs API error: #{code}"
      end
    rescue JSON::ParserError
      raise Errors::ApiError, "Discogs API error: #{response.code}"
    end
  end
end
