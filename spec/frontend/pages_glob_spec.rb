require "rails_helper"

RSpec.describe "frontend page glob" do
  it "does not include test files in Inertia page modules" do
    page_test_files = Rails.root.glob("app/frontend/pages/**/*.{test,spec}.tsx")

    expect(page_test_files).to be_empty
  end
end
