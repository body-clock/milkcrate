FactoryBot.define do
  factory :discogs_shopper do
    sequence(:discogs_username) { |n| "shopper#{n}" }
    oauth_token { "test_oauth_token" }
    oauth_token_secret { "test_oauth_token_secret" }
    store_slug { "test-store" }
  end
end
