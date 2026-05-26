module AdminAuthHelpers
  def auth_headers(username, password)
    credentials = Base64.strict_encode64("#{username}:#{password}")
    { "HTTP_AUTHORIZATION" => "Basic #{credentials}" }
  end
end

RSpec.configure do |config|
  config.include AdminAuthHelpers, type: :request

  config.before(:each, type: :request) do
    allow(Rails.application.credentials).to receive(:dig).and_call_original
    allow(Rails.application.credentials).to receive(:dig).with(:http_basic_auth, :user).and_return("admin")
    allow(Rails.application.credentials).to receive(:dig).with(:http_basic_auth, :password).and_return("secret")
  end
end
