FactoryBot.define do
  factory :store do
    sequence(:name) { |n| "Record Store #{n}" }
    sequence(:discogs_username) { |n| "recordstore#{n}" }
    description { "A great record store." }
    sync_status { "idle" }
    enrichment_status { "idle" }
    catalog_coverage { "near_complete" }
    inventory_page_count { 1 }
    total_listings { 0 }
    last_synced_at { 1.hour.ago }
    last_enriched_at { 1.hour.ago }

    trait :oauth_authorized do
      discogs_oauth_token { "test_oauth_token" }
      discogs_oauth_token_secret { "test_oauth_token_secret" }
      oauth_authorized_at { Time.current }
      sync_source { "csv_export" }
    end
  end
end
