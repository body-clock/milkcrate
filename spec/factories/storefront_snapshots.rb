FactoryBot.define do
  factory :storefront_snapshot do
    association :store
    curation_date { Date.current }
    status { "ready" }
    active { false }
    props_schema_version { StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION }
    crates do
      [
        {
          "slug" => "picks",
          "name" => "Milkcrate Picks",
          "count" => 1,
          "records" => []
        }
      ]
    end
    storefront_sections do
      [
        {
          "key" => "picks_wall",
          "crate" => {
            "slug" => "picks",
            "name" => "Milkcrate Picks",
            "count" => 1,
            "records" => []
          }
        }
      ]
    end
    surfaced_listing_ids { [] }
    generated_at { Time.current }
    failed_at { nil }
    failure_message { nil }
    metrics { {} }
  end
end
