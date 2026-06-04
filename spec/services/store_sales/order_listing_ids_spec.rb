# frozen_string_literal: true

require "rails_helper"

RSpec.describe StoreSales::OrderListingIds do
  describe ".call" do
    context "with standard Discogs order payload" do
      it "extracts a single listing ID from item id (primary key)" do
        order = {
          "items" => [
            {
              "id" => 41578242,
              "release" => { "id" => 1, "description" => "Some Release" },
              "price" => { "currency" => "USD", "value" => 42.0 }
            }
          ]
        }

        expect(described_class.call(order)).to eq([ "41578242" ])
      end

      it "extracts multiple listing IDs from multi-item order" do
        order = {
          "items" => [
            { "id" => 111, "release" => { "id" => 1 } },
            { "id" => 222, "release" => { "id" => 2 } },
            { "id" => 333, "release" => { "id" => 3 } }
          ]
        }

        expect(described_class.call(order)).to eq([ "111", "222", "333" ])
      end

      it "falls back to listing_id key when id is absent" do
        order = {
          "items" => [
            { "listing_id" => "9876543210" }
          ]
        }

        expect(described_class.call(order)).to eq([ "9876543210" ])
      end

      it "prefers id over listing_id when both present" do
        order = {
          "items" => [
            { "id" => 41578242, "listing_id" => "should-not-match" }
          ]
        }

        expect(described_class.call(order)).to eq([ "41578242" ])
      end
    end

    context "with symbol keys" do
      it "extracts listing IDs from symbol-keyed items" do
        order = {
          items: [
            { id: 555 }
          ]
        }

        expect(described_class.call(order)).to eq([ "555" ])
      end
    end

    context "with blank or nil IDs" do
      it "ignores items with blank IDs" do
        order = {
          "items" => [
            { "id" => 111 },
            { "id" => "" },
            { "id" => nil },
            { "id" => 222 }
          ]
        }

        expect(described_class.call(order)).to eq([ "111", "222" ])
      end

      it "ignores items with no ID keys at all" do
        order = {
          "items" => [
            { "id" => 111 },
            { "title" => "No ID here" }
          ]
        }

        expect(described_class.call(order)).to eq([ "111" ])
      end
    end

    context "with missing or malformed items" do
      it "returns empty array when items key is missing" do
        order = { "status" => "New Order" }

        expect(described_class.call(order)).to eq([])
      end

      it "returns empty array when items is nil" do
        order = { "items" => nil }

        expect(described_class.call(order)).to eq([])
      end

      it "returns empty array when items is empty" do
        order = { "items" => [] }

        expect(described_class.call(order)).to eq([])
      end

      it "handles non-array items gracefully" do
        order = { "items" => "not an array" }

        expect(described_class.call(order)).to eq([])
      end

      it "returns empty array when order_hash is nil" do
        expect(described_class.call(nil)).to eq([])
      end

      it "returns empty array when order_hash is not a hash" do
        expect(described_class.call("not a hash")).to eq([])
      end

      it "skips non-hash items in the array" do
        order = {
          "items" => [
            { "id" => 111 },
            "not a hash",
            nil
          ]
        }

        expect(described_class.call(order)).to eq([ "111" ])
      end
    end

    context "with duplicate listing IDs" do
      it "deduplicates listing IDs" do
        order = {
          "items" => [
            { "id" => 111 },
            { "id" => 111 },
            { "id" => 222 }
          ]
        }

        expect(described_class.call(order)).to eq([ "111", "222" ])
      end
    end

    context "with numeric IDs" do
      it "converts numeric IDs to strings" do
        order = {
          "items" => [
            { "id" => 12345 }
          ]
        }

        expect(described_class.call(order)).to eq([ "12345" ])
      end
    end
  end
end
