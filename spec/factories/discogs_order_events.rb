FactoryBot.define do
  factory :discogs_order_event do
    association :store
    sequence(:discogs_order_id) { |n| "order-#{n}" }
    status { "paid" }
    last_activity_at { 1.hour.ago }
    listing_ids { [ "listing-1", "listing-2" ] }
    removed_listing_count { 0 }
    processed_at { Time.current }
  end
end
