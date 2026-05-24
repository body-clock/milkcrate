# Client for Discogs Wantlist API endpoints.
# Requires an OAuth-authenticated shopper's access tokens.
module Discogs
  class ShopperWantlistClient
    BASE_URL = "https://api.discogs.com"

    AddWantResult = Data.define(:item_id)

    def initialize(access_token:, access_token_secret:)
      @access_token = access_token
      @access_token_secret = access_token_secret
    end

    # Adds a release to the authenticated user's Discogs wantlist.
    def add_want(username:, release_id:)
      response = oauth_access_token.put(
        "#{BASE_URL}/users/#{username}/wants/#{release_id.to_i}",
        "",  # PUT with empty body
        "Content-Type" => "application/json"
      )

      parsed = parse_oauth_response(response)
      AddWantResult.new(item_id: parsed.dig("want", "id"))
    end

    private

    def oauth_access_token
      @oauth_access_token ||= begin
        OAuth::AccessToken.new(DiscogsOauthConsumer.build, @access_token, @access_token_secret)
      end
    end

    def parse_oauth_response(response)
      code = response.code.to_i
      body = response.body

      parsed_body = body.blank? ? {} : JSON.parse(body)

      case code
      when 200..299
        parsed_body
      when 429
        raise Errors::RateLimitError, "Discogs rate limit hit"
      else
        error_message = parsed_body.is_a?(Hash) ? (parsed_body["message"] || response.body) : response.body
        raise Errors::ApiError, "Discogs API error: #{code} — #{error_message}"
      end
    rescue JSON::ParserError
      raise Errors::ApiError, "Discogs API error: #{response.code} — #{response.body}"
    end
  end
end
