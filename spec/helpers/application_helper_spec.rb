require "rails_helper"

RSpec.describe ApplicationHelper, type: :helper do
  describe "#sanitize_url" do
    it "returns '#' for blank input" do
      expect(helper.sanitize_url(nil)).to eq("#")
      expect(helper.sanitize_url("")).to eq("#")
    end

    it "passes through valid http URLs" do
      url = "http://example.com/record"
      expect(helper.sanitize_url(url)).to eq(url)
    end

    it "passes through valid https URLs" do
      url = "https://www.discogs.com/sell/item/123"
      expect(helper.sanitize_url(url)).to eq(url)
    end

    it "returns '#' for javascript: URLs" do
      expect(helper.sanitize_url("javascript:alert(1)")).to eq("#")
    end

    it "returns '#' for ftp URLs" do
      expect(helper.sanitize_url("ftp://files.example.com")).to eq("#")
    end

    it "returns '#' for malformed URLs" do
      expect(helper.sanitize_url("not a url")).to eq("#")
    end

    it "returns '#' for mailto: URLs" do
      expect(helper.sanitize_url("mailto:user@example.com")).to eq("#")
    end
  end
end
