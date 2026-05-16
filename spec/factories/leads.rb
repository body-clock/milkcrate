FactoryBot.define do
  sequence(:lead_discogs_username) { |n| "record_seller_#{n}" }

  factory :lead do
    discogs_username { generate(:lead_discogs_username) }
    store_name { "Record Seller" }
    inventory_size { 1_840 }
    vinyl_count { 1_692 }
    vinyl_percentage { 92.00 }
    genres { [ "Jazz", "Soul", "Funk", "Electronic" ] }
    styles { [ "Modal", "Deep Funk", "Detroit Techno" ] }
    score { 78.5 }
    score_breakdown { { "inventory_size" => 100, "vinyl_share" => 100, "genre_depth" => 80, "presence_penalty" => 0 } }
    status { :pending }
    scored_at { Time.current }
  end
end
