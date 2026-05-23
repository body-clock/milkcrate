FactoryBot.define do
  factory :store_owner do
    sequence(:discogs_username) { |n| "owner#{n}" }
    discogs_oauth_token { "test_oauth_token" }
    discogs_oauth_token_secret { "test_oauth_token_secret" }
    oauth_authorized_at { Time.current }
  end
end
