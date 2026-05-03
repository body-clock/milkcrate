FactoryBot.define do
  factory :waitlist do
    sequence(:name) { |n| "Record Store #{n}" }
    sequence(:email) { |n| "store#{n}@example.com" }
    sequence(:discogs_username) { |n| "recordstore#{n}" }
    inventory_size { "500_2000" }
    notes { nil }
  end
end
