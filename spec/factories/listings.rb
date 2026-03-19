FactoryBot.define do
  factory :listing do
    store { nil }
    discogs_listing_id { "MyString" }
    discogs_release_id { "MyString" }
    artist { "MyString" }
    title { "MyString" }
    label { "MyString" }
    year { 1 }
    format { "MyString" }
    genres { "MyString" }
    styles { "MyString" }
    condition { "MyString" }
    price { "9.99" }
    thumbnail_url { "MyString" }
    cover_image_url { "MyString" }
    tracklist { "MyText" }
    notes { "MyText" }
    listed_at { "2026-03-19 13:08:40" }
    last_seen_at { "2026-03-19 13:08:40" }
  end
end
