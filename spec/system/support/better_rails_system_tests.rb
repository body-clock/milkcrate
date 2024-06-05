# frozen_string_literal: true

module BetterRailsSystemTests
  # Use relative path in screenshot message to make it clickable in IDE when running in Docker
  def image_path
    Pathname.new(absolute_image_path).relative_path_from(Rails.root).to_s
  end
end

RSpec.configure do |config|
  config.include BetterRailsSystemTests, type: :system
end
