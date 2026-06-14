# frozen_string_literal: true

require "rails_helper"

RSpec.describe AppVersion do
  before do
    AppVersion.reset!
  end

  describe ".current" do
    it "reads version from VERSION file" do
      expect(described_class.current).to match(/\A\d+\.\d+\.\d+\z/)
    end
  end

  describe ".display" do
    it "returns version with vite digest" do
      expect(described_class.display).to match(/\A\d+\.\d+\.\d+ \([a-f0-9]{7}\)\z/)
    end
  end
end
