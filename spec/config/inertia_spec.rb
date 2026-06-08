require "rails_helper"

RSpec.describe "Inertia configuration" do
  it "computes the asset version once during application boot" do
    configured_version = InertiaRails.configuration.send(:options).fetch(:version)

    expect(configured_version).to be_a(String)
  end
end
