require "rails_helper"

RSpec.describe StylesAxis do
  subject(:axis) { described_class.new }

  let(:listing) { instance_double(Listing, styles: [ "Punk", "Hardcore" ]) }

  describe "#key_for" do
    it "returns the listing's first style" do
      expect(axis.key_for(listing)).to eq("Punk")
    end
  end

  describe "#matches?" do
    it "is true when the listing's styles include the name" do
      expect(axis.matches?(listing, "Hardcore")).to be true
    end

    it "is false when the listing's styles do not include the name" do
      expect(axis.matches?(listing, "Bebop")).to be false
    end
  end

  describe "#tally_from" do
    it "counts listings by all their styles" do
      a = instance_double(Listing, styles: [ "Punk" ])
      b = instance_double(Listing, styles: [ "Punk", "Hardcore" ])
      c = instance_double(Listing, styles: [ "Hardcore" ])

      expect(axis.tally_from([ a, b, c ])).to eq("Punk" => 2, "Hardcore" => 2)
    end

    it "excludes listings with nil or empty styles" do
      a = instance_double(Listing, styles: nil)
      b = instance_double(Listing, styles: [])

      expect(axis.tally_from([ a, b ])).to eq({})
    end
  end
end
