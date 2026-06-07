# Namespace for Discogs API client components.
module Discogs
  # Client for Discogs marketplace endpoints that require OAuth authentication.
  # Uses OAuth::AccessToken for requests. Separated from DiscogsClient so the
  # public API surface (PublicClient) and OAuth-only methods live independently.
  class Marketplace
    include RateLimit

    BASE_URL = "https://api.discogs.com"

    def initialize(access_token:, access_token_secret:)
      @access_token = access_token
      @access_token_secret = access_token_secret
    end

    def inventory_export
      response = oauth_access_token.post("#{BASE_URL}/inventory/export")
      body = parse_oauth_response(response)
      export_id = extract_export_id(body) || extract_location_export_id(response)
      export_id ? { "id" => export_id } : api_error(response)
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

    def list_orders(status: nil, page: 1, per_page: 50, sort: "last_activity", sort_order: "desc")
      params = build_orders_params(status:, page:, per_page:, sort:, sort_order:)
      path = "#{BASE_URL}/marketplace/orders?#{URI.encode_www_form(params)}"
      response = with_rate_limit_retry { oauth_access_token.get(path) }
      parse_oauth_response(response)
    end

    private

    def build_orders_params(status:, page:, per_page:, sort:, sort_order:)
      params = { page: page, per_page: per_page, sort: sort, sort_order: sort_order }
      params[:status] = status if status.present?
      params
    end

    def with_rate_limit_retry(attempt: 1)
      response = yield
      return response unless response.code.to_i == 429
      return response if attempt > MAX_RETRIES
      sleep(backoff_for(attempt))
      with_rate_limit_retry(attempt: attempt + 1) { yield }
    end

    def oauth_access_token
      @oauth_access_token ||= begin
        OAuth::AccessToken.new(DiscogsOauthConsumer.build, @access_token, @access_token_secret)
      end
    end

    def parse_oauth_response(response)
      code = response.code.to_i
      return { "status" => "not_modified" } if code == 304
      return raise Errors::RateLimitError, "Discogs rate limit hit" if code == 429
      parsed = parse_response_body(response)
      (200..299).include?(code) ? parsed : raise(Errors::ApiError, "Discogs API error: #{code} — #{response.body}")
    end

    def parse_raw_body(body, response)
      raw = body.to_s
      raw.blank? ? {} : JSON.parse(raw)
    rescue JSON::ParserError
      raise Errors::ApiError, "Discogs API error: #{response.code} — #{response.body}"
    end

    def parse_response_body(response)
      body = response.body
      case body
      when Hash, Array then body
      else parse_raw_body(body, response)
      end
    end

    def extract_exports(body)
      case body
      when Array then body
      when Hash then body["exports"] || body["items"]
      end
    end

    def api_error(response)
      raise Errors::ApiError, "Discogs API error: #{response.code} — #{response.body}"
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
