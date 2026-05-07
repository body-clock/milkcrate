FactoryBot.define do
  factory :record_scorer, class: "RecordScorer" do
    genre_counts { { "Jazz" => 5 } }
    today { Date.today }

    initialize_with { new(genre_counts:, today:) }
  end
end
