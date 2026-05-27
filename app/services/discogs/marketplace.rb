# Namespace for Discogs API client components.
module Discogs
  # Client for Discogs marketplace endpoints that require OAuth authentication.
  # Uses OAuth::AccessToken for requests. Separated from DiscogsClient so the
  # public API surface (PublicClient) and OAuth-only methods live independently.
  class Marketplace
    BASE_URL = "https://api.discogs.com"

    def initialize(access_token:, access_token_secret:)
      @access_token = access_token
      @access_token_secret = access_token_secret
    end

    def inventory_export
      response = oauth_access_token.post("#{BASE_URL}/inventory/export")
      body = parse_oauth_response(response)
      export_id = find_export_id(body, response)
      raise Errors::ApiError, "Discogs API error: #{response.code} — #{response.body}" unless export_id

      { "id" => export_id }
    end

    def check_export_status(export_id)
      response = oauth_access_token.get("#{BASE_URL}/inventory/export/#{export_id}")
      parse_oauth_response(response)
    end

    def download_export(export_id)
      response = oauth_access_token.get("#{BASE_URL}/inventory/export/#{export_id}/download")
      raise Errors::ApiError, "Export download failed: HTTP #{response.code}" unless response.code.to_i == 200
      response.body
    end

    def recent_exports
      response = oauth_access_token.get("#{BASE_URL}/inventory/export")
      body = parse_oauth_response(response)
      Array.wrap(extract_exports(body)).compact
    end

    def list_orders(status: nil, page: 1)
      path = "#{BASE_URL}/marketplace/orders?page=#{page}"
      path += "&status=#{ERB::Util.url_encode(status)}" if status
      response = oauth_access_token.get(path)
      parse_oauth_response(response)
    end

    private

    def oauth_access_token
      @oauth_access_token ||= begin
        OAuth::AccessToken.new(DiscogsOauthConsumer.build, @access_token, @access_token_secret)
      end
    end

    def find_export_id(body, response)
      extract_export_id(body) || extract_location_export_id(response)
    end

    def extract_exports(body)
      case body
      when Array then body
      when Hash then body["exports"] || body["items"]
      end
    end

    def parse_oauth_response(response)
      code = response.code.to_i
      return { "status" => "not_modified" } if code == 304

      handle_status_code(code, parse_body(response.body), response)
    rescue JSON::ParserError
      raise Errors::ApiError, "Discogs API error: #{response.code} — #{response.body}"
    end

    def parse_body(raw_body)
      case raw_body
      when Hash, Array then raw_body
      else raw_body.to_s.blank? ? {} : JSON.parse(raw_body.to_s)
      end
    end

    def handle_status_code(code, parsed_body, response)
      case code
      when 200..299 then parsed_body
      when 429 then raise Errors::RateLimitError, "Discogs rate limit hit"
      else raise Errors::ApiError, "Discogs API error: #{code} — #{response.body}"
      end
    end

    def extract_export_id(body)
      return nil unless body.is_a?(Hash)

      normalize_export_id(body["id"] || body["export_id"])
    end

    def extract_location_export_id(response)
      location = response["Location"] || response["location"]
      return nil if location.blank?

      location.to_s.match(%r{/inventory/export/(\d+)})&.[](1)&.to_i
    end

    def normalize_export_id(value)
      return nil if value.blank?

      id = Integer(value, exception: false)
      id.positive? ? id : nil
    end
  end
end
