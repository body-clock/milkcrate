require "rails_helper"

RSpec.describe "crate strategy public protocols" do
  INTERNAL_MESSAGES = %i[
    score_and_sort exclude_and_filter rank
    select_from_windows window_qualifies? try_window recent_in_window
    reject_excluded pick_theme best_theme sort_by_score
  ].freeze

  [
    CrateStrategies::Picks,
    CrateStrategies::Genre,
    CrateStrategies::HiddenGems,
    CrateStrategies::NewArrivals,
    CrateStrategies::Thematic
  ].each do |strategy|
    it "publishes only selection for #{strategy}" do
      expect(strategy.public_instance_methods(false)).to contain_exactly(:select)
      expect(strategy.public_instance_methods).not_to include(*INTERNAL_MESSAGES)
    end
  end
end
