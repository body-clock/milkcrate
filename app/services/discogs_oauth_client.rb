class DiscogsOauthClient
  RequestTokenResult = Data.define(:request_token, :authorize_url)
  AccessTokenResult = Data.define(:access_token, :access_token_secret)
  IdentityResult = Data.define(:username)

  class OauthError < StandardError; end

  def initialize(consumer: nil)
    @consumer = consumer || DiscogsOauthConsumer.build
  end

  def request_token(callback_url:)
    rt = @consumer.get_request_token(oauth_callback: callback_url)
    # Build authorize URL manually — Discogs' authorize page is on www.discogs.com,
    # not api.discogs.com, but the OAuth gem always prepends site to authorize_path
    authorize_url = "https://www.discogs.com/oauth/authorize?oauth_token=#{rt.token}"
    RequestTokenResult.new(request_token: rt, authorize_url: authorize_url)
  rescue OAuth::Unauthorized => e
    raise OauthError, "Discogs OAuth request token failed: #{e.message}"
  end

  def exchange_access_token(request_token, verifier)
    at = request_token.get_access_token(oauth_verifier: verifier)
    AccessTokenResult.new(access_token: at.token, access_token_secret: at.secret)
  rescue OAuth::Unauthorized => e
    raise OauthError, "Discogs OAuth access token exchange failed: #{e.message}"
  end

  def verify_identity(access_token, access_token_secret)
    at = OAuth::AccessToken.new(@consumer, access_token, access_token_secret)
    response = at.get("/oauth/identity")

    raise OauthError, "Discogs identity verification failed: HTTP #{response.code}" unless response.code.to_i == 200

    body = JSON.parse(response.body)
    IdentityResult.new(username: body["username"])
  rescue JSON::ParserError => e
    raise OauthError, "Discogs identity response parse failed: #{e.message}"
  end

end
