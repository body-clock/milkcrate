module ListingHelpers
  def build_listing(overrides = {})
    build_stubbed(:listing, **overrides)
  end
end

RSpec.configure do |config|
  config.include ListingHelpers
end
