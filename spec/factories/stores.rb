FactoryBot.define do
  factory :store do
    sequence(:name) { |n| "Record Store #{n}" }
    sequence(:discogs_username) { |n| "recordstore#{n}" }
    description { "A great record store." }
    sync_status { "idle" }
    total_listings { 0 }
    last_synced_at { 1.hour.ago }
  end
end
