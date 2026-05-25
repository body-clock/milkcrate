# Namespace for Discogs API client components.
module Discogs
  # Client for Discogs public API endpoints that use an app token via Faraday.
  # Separated from DiscogsClient so OAuth-only endpoints live in Marketplace
  # and this client focuses on the public surface (inventory, releases, profile).
  class PublicClient
    BASE_URL = "https://api.discogs.com"
    PER_PAGE = 100

    def initialize(connection: nil)
      @token = Rails.application.credentials.dig(:discogs, :token)
      @connection = connection || build_connection
    end

    def seller_inventory(username, page: 1, sort: "listed", sort_order: "desc")
      response = @connection.get("/users/#{username}/inventory") do |req|
        req.params["page"] = page
        req.params["per_page"] = PER_PAGE
        req.params["sort"] = sort
        req.params["sort_order"] = sort_order
      end

      handle_response(response)
    end

    def release(release_id)
      response = @connection.get("/releases/#{release_id}")
      body = handle_response(response)
      remaining = response.headers["x-discogs-ratelimit-remaining"].to_i
      [ body, remaining ]
    end

    def seller_inventory_pages(username)
      first_page = seller_inventory(username, page: 1)
      total_pages = first_page.dig("pagination", "pages") || 1
      total_pages
    end

    def seller_profile(username)
      response = @connection.get("/users/#{username}")
      handle_response(response)
    end

    private

    def build_connection
      Faraday.new(url: BASE_URL) do |f|
        f.options.timeout = 10
        f.options.open_timeout = 5
        f.request :url_encoded
        f.response :json
        f.use DiscogsRateLimitMiddleware
        f.request :retry, max: 3, interval: 2.0, retry_statuses: [ 503 ]
        f.headers["Authorization"] = "Discogs token=#{@token}"
        f.headers["User-Agent"] = "Milkcrate/1.0 +https://milkcrate.fm"
      end
    end

    def handle_response(response)
      case response.status
      when 200
        response.body
      when 429
        raise Errors::RateLimitError, "Discogs rate limit hit"
      else
        raise Errors::ApiError, "Discogs API error: #{response.status} — #{response.body}"
      end
    end
  end
end
