module AdminAuthHelpers
  def auth_headers(username, password)
    credentials = Base64.strict_encode64("#{username}:#{password}")
    { "HTTP_AUTHORIZATION" => "Basic #{credentials}" }
  end
end

RSpec.configure do |config|
  config.include AdminAuthHelpers, type: :request
end
