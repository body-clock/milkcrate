# Client for Discogs Lists API endpoints.
# Requires an OAuth-authenticated shopper's access tokens.
module Discogs
  class ShopperListClient
    BASE_URL = "https://api.discogs.com"

    ListResult = Data.define(:list_id, :list_url)
    AddItemResult = Data.define(:item_id)

    def initialize(access_token:, access_token_secret:)
      @access_token = access_token
      @access_token_secret = access_token_secret
    end

    # Creates a private Discogs list for the authenticated user.
    def create_list(name:, description: nil)
      body = { name:, is_private: true }
      body[:description] = description if description.present?

      response = oauth_access_token.post(
        "#{BASE_URL}/lists",
        body.to_json,
        "Content-Type" => "application/json"
      )

      parsed = parse_oauth_response(response)
      list_id = parsed["id"]
      raise Errors::ApiError, "Discogs list creation returned no ID" unless list_id

      ListResult.new(
        list_id:,
        list_url: parsed["resource_url"] || "https://www.discogs.com/lists/#{list_id}"
      )
    end

    # Adds a release to an existing Discogs list.
    def add_item(list_id:, release_id:)
      body = { release_id: release_id.to_i }

      response = oauth_access_token.post(
        "#{BASE_URL}/lists/#{list_id}/items",
        body.to_json,
        "Content-Type" => "application/json"
      )

      parsed = parse_oauth_response(response)
      AddItemResult.new(item_id: parsed["id"])
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
