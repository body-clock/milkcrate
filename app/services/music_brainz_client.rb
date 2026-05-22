class MusicBrainzClient
  SEARCH_URL      = "https://musicbrainz.org/ws/2/"
  CAA_URL         = "https://coverartarchive.org"
  SCORE_THRESHOLD = 90

  class ApiError < StandardError; end

  def initialize(search_conn: nil, caa_conn: nil)
    @search_conn = search_conn || build_connection(SEARCH_URL)
    @caa_conn    = caa_conn || build_connection(CAA_URL)
  end

  def search_release(artist:, title:)
    response = @search_conn.get("release/") do |req|
      req.params["query"] = "artist:\"#{artist}\" AND release:\"#{title}\""
      req.params["fmt"]   = "json"
      req.params["limit"] = 5
    end
    raise ApiError, "MusicBrainz error: #{response.status}" unless response.status == 200

    releases = response.body["releases"] || []
    best = releases.first
    return nil if best.nil? || best["score"].to_i < SCORE_THRESHOLD

    best["id"]
  end

  def front_cover_url(mbid)
    response = @caa_conn.get("/release/#{mbid}/front")
    case response.status
    when 307, 302
      response.headers["Location"]
    when 404
      nil
    else
      raise ApiError, "CAA error: #{response.status}"
    end
  end

  private

  def build_connection(url)
    Faraday.new(url: url) do |f|
      f.options.timeout = 10
      f.options.open_timeout = 5
      f.response :json
      f.headers["User-Agent"] = "Milkcrate/1.0 +https://milkcrate.fm"
    end
  end
end
