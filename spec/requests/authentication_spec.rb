require "rails_helper"

RSpec.describe "HTTP authentication", type: :request do
  it "does not challenge local app requests with HTTP Basic auth" do
    get root_path

    expect(response).not_to have_http_status(:unauthorized)
    expect(response.headers).not_to include("WWW-Authenticate")
  end
end
