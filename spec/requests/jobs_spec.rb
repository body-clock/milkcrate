require "rails_helper"

RSpec.describe "Jobs dashboard", type: :request do
  around do |example|
    original_enabled = MissionControl::Jobs.http_basic_auth_enabled
    original_user = MissionControl::Jobs.http_basic_auth_user
    original_password = MissionControl::Jobs.http_basic_auth_password

    MissionControl::Jobs.http_basic_auth_enabled = false
    MissionControl::Jobs.http_basic_auth_user = nil
    MissionControl::Jobs.http_basic_auth_password = nil

    example.run
  ensure
    MissionControl::Jobs.http_basic_auth_enabled = original_enabled
    MissionControl::Jobs.http_basic_auth_user = original_user
    MissionControl::Jobs.http_basic_auth_password = original_password
  end

  it "routes /jobs to mission control instead of the store slug route" do
    get "/jobs"

    expect(response).not_to have_http_status(:not_found)
    expect(response.body).not_to include("No stores")
  end
end
