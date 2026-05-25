require "rails_helper"

RSpec.describe StorefrontCuration::CacheManager do
  include ActiveSupport::Testing::TimeHelpers

  let(:store) { create(:store) }
  let(:cache) { ActiveSupport::Cache::MemoryStore.new }

  describe ".cached_curation" do
    it "returns cached payload on cache hit" do
      expected = { sections: [], crates: [] }
      described_class.write_curation_cache(store, expected, cache:)

      result = described_class.cached_curation(store, cache:)

      expect(result).to eq(expected)
    end

    it "builds and caches payload on cache miss" do
      allow(described_class).to receive(:dev_scorer).and_return(nil)

      result = described_class.cached_curation(store, cache:)

      expect(result).to be_a(Hash)
      expect(result).to have_key(:sections)
      expect(result).to have_key(:crates)
    end
  end

  describe ".write_curation_cache" do
    it "writes the expected key-value pair" do
      payload = { sections: [], crates: [] }

      described_class.write_curation_cache(store, payload, cache:)

      key = described_class.send(:curation_cache_key, store)
      expect(cache.read(key)).to eq(payload)
    end
  end

  describe "curation_cache_key" do
    it "includes store ID, date, and scope" do
      travel_to(Date.new(2026, 5, 23)) do
        key = described_class.send(:curation_cache_key, store)

        expect(key).to include(store.id.to_s)
        expect(key).to include("2026-05-23")
        expect(key).to include("available")
      end
    end

    it "uses 'all' scope when filter_available is false" do
      travel_to(Date.new(2026, 5, 23)) do
        key = described_class.send(:curation_cache_key, store, filter_available: false)

        expect(key).to include("all")
        expect(key).not_to include("available")
      end
    end
  end

  describe "delegation from StorefrontCuration" do
    it "StorefrontCuration.cached_curation delegates to CacheManager" do
      payload = { sections: [], crates: [] }
      allow(described_class).to receive(:cached_curation).and_return(payload)

      result = StorefrontCuration.cached_curation(store, cache:)

      expect(result).to eq(payload)
    end

    it "StorefrontCuration.write_curation_cache delegates to CacheManager" do
      payload = { sections: [], crates: [] }
      allow(described_class).to receive(:write_curation_cache).and_return(true)

      result = StorefrontCuration.write_curation_cache(store, payload, cache:)

      expect(result).to be true
    end
  end
end
