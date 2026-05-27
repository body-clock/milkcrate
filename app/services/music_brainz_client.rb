# HTTP client for the MusicBrainz API (music metadata, release lookups).
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
    response = search(artist:, title:)
    raise ApiError, "MusicBrainz error: #{response.status}" unless response.status == 200

    matching_release_id(response.body["releases"]&.first)
  end

  def front_cover_url(mbid)
    response = @caa_conn.get("/release/#{mbid}/front")
    return response.headers["Location"] if [ 307, 302 ].include?(response.status)
    return if response.status == 404

    raise ApiError, "CAA error: #{response.status}"
  end

  private

  def search(artist:, title:)
    @search_conn.get("release/") { |request| configure_search(request, artist:, title:) }
  end

  def configure_search(request, artist:, title:)
    request.params["query"] = "artist:\"#{artist}\" AND release:\"#{title}\""
    request.params["fmt"]   = "json"
    request.params["limit"] = 5
  end

  def matching_release_id(release)
    return if release.nil? || release["score"].to_i < SCORE_THRESHOLD
    release["id"]
  end

  def build_connection(url)
    Faraday.new(url:) { |connection| configure_connection(connection) }
  end

  def configure_connection(connection)
    connection.options.timeout = 10
    connection.options.open_timeout = 5
    connection.response :json
    connection.headers["User-Agent"] = "Milkcrate/1.0 +https://milkcrate.fm"
  end
end
