class DiscogsClient
  BASE_URL = "https://api.discogs.com"
  PER_PAGE = 100

  class RateLimitError < StandardError; end
  class ApiError < StandardError; end

  def initialize(connection: nil, access_token: nil, access_token_secret: nil)
    @token = Rails.application.credentials.dig(:discogs, :token)
    @access_token = access_token
    @access_token_secret = access_token_secret
    @connection = connection || build_connection
    @oauth_consumer = nil
  end

  # Public endpoints (work with both app token and OAuth)

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

  # OAuth-only endpoints (require access_token and access_token_secret)

  def inventory_export
    require_oauth!
    response = oauth_access_token.post("#{BASE_URL}/inventory/export")
    body = parse_oauth_response(response)
    export_id = extract_export_id(body) || extract_location_export_id(response)

    if export_id
      { "id" => export_id }
    else
      raise ApiError, "Discogs API error: #{response.code} — #{response.body}"
    end
  end

  def check_export_status(export_id)
    require_oauth!
    response = oauth_access_token.get("#{BASE_URL}/inventory/export/#{export_id}")
    parse_oauth_response(response)
  end

  def download_export(export_id)
    require_oauth!
    response = oauth_access_token.get("#{BASE_URL}/inventory/export/#{export_id}/download")
    raise ApiError, "Export download failed: HTTP #{response.code}" unless response.code.to_i == 200
    response.body
  end

  def recent_exports
    require_oauth!
    response = oauth_access_token.get("#{BASE_URL}/inventory/export")
    body = parse_oauth_response(response)
    exports = case body
    when Array then body
    when Hash then body["exports"] || body["items"]
    end
    Array.wrap(exports).compact
  end

  def list_orders(status: nil, page: 1)
    require_oauth!
    path = "#{BASE_URL}/marketplace/orders?page=#{page}"
    path += "&status=#{ERB::Util.url_encode(status)}" if status
    response = oauth_access_token.get(path)
    parse_oauth_response(response)
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
      raise RateLimitError, "Discogs rate limit hit"
    else
      raise ApiError, "Discogs API error: #{response.status} — #{response.body}"
    end
  end

  def oauth_access_token
    @oauth_access_token ||= begin
      OAuth::AccessToken.new(DiscogsOauthConsumer.build, @access_token, @access_token_secret)
    end
  end

  def require_oauth!
    raise ApiError, "OAuth access token required for this endpoint" if @access_token.blank? || @access_token_secret.blank?
  end

  def parse_oauth_response(response)
    code = response.code.to_i
    return { "status" => "not_modified" } if code == 304

    body = response.body
    parsed_body = case body
    when Hash, Array
      body
    else
      raw = body.to_s
      raw.blank? ? {} : JSON.parse(raw)
    end

    case code
    when 200..299
      parsed_body
    when 429
      raise RateLimitError, "Discogs rate limit hit"
    else
      raise ApiError, "Discogs API error: #{code} — #{response.body}"
    end
  rescue JSON::ParserError
    raise ApiError, "Discogs API error: #{response.code} — #{response.body}"
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
