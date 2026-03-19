class DiscogsClient
  BASE_URL = "https://api.discogs.com"
  PER_PAGE = 100

  class RateLimitError < StandardError; end
  class ApiError < StandardError; end

  def initialize
    @token = ENV.fetch("DISCOGS_TOKEN")
    @connection = build_connection
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
    handle_response(response)
  end

  def seller_inventory_pages(username)
    first_page = seller_inventory(username, page: 1)
    total_pages = first_page.dig("pagination", "pages") || 1
    total_pages
  end

  private

  def build_connection
    Faraday.new(url: BASE_URL) do |f|
      f.request :retry, max: 3, interval: 2.0, retry_statuses: [ 503 ]
      f.request :url_encoded
      f.response :json
      f.headers["Authorization"] = "Discogs token=#{@token}"
      f.headers["User-Agent"] = "Milkcrate/1.0 +https://milkcrate.fm"
    end
  end

  def handle_response(response)
    case response.status
    when 200
      response.body
    when 429
      raise RateLimitError, "Discogs rate limit hit"
    else
      raise ApiError, "Discogs API error: #{response.status} — #{response.body}"
    end
  end
end
