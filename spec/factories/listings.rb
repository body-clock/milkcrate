FactoryBot.define do
  factory :listing do
    association :store
    sequence(:discogs_listing_id) { |n| "listing-#{n}" }
    sequence(:discogs_release_id) { |n| "release-#{n}" }
    artist { "Artist" }
    title { "Title" }
    label { "Label" }
    year { 1975 }
    format { "Vinyl" }
    genres { [ "Jazz" ] }
    styles { [ "Bebop" ] }
    condition { "VG+" }
    price { "12.50" }
    currency { "USD" }
    thumbnail_url { nil }
    cover_image_url { nil }
    notes { nil }
    listed_at { 1.week.ago }
    last_seen_at { Time.current }
  end
end
