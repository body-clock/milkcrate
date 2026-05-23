# frozen_string_literal: true

require "rails_helper"

RSpec.describe MusicBrainzEnricher do
  let(:store) { create(:store) }
  let(:musicbrainz) { instance_double(MusicBrainzClient) }
  subject(:enricher) { described_class.new(musicbrainz: musicbrainz) }

  let!(:listing) do
    create(:listing, store:, discogs_release_id: "123", artist: "Test Artist",
      title: "Test Album", cover_image_url: nil)
  end

  before do
    Release.create!(
      discogs_release_id: "123",
      discogs_image_missing: true,
      musicbrainz_id: nil,
      enriched_at: Time.current)
  end

  describe "#enrich_store" do
    it "fetches cover images for releases without them" do
      allow(musicbrainz).to receive(:search_release).with(artist: "Test Artist", title: "Test Album")
        .and_return("mbid-123")
      allow(musicbrainz).to receive(:front_cover_url).with("mbid-123")
        .and_return("https://coverartarchive.org/release/mbid-123/front")

      enricher.enrich_store(store)

      listing.reload
      expect(listing.cover_image_url).to eq("https://coverartarchive.org/release/mbid-123/front")
      expect(Release.find_by(discogs_release_id: "123").musicbrainz_id).to eq("mbid-123")
    end

    it "skips releases with no matching MusicBrainz ID" do
      allow(musicbrainz).to receive(:search_release).with(artist: "Test Artist", title: "Test Album")
        .and_return(nil)

      enricher.enrich_store(store)

      listing.reload
      expect(listing.cover_image_url).to be_nil
      expect(Release.find_by(discogs_release_id: "123").musicbrainz_id).to eq("")
    end

    it "handles MusicBrainz API errors gracefully" do
      allow(musicbrainz).to receive(:search_release).with(artist: "Test Artist", title: "Test Album")
        .and_raise(MusicBrainzClient::ApiError, "Search failed")
      expect(Rails.logger).to receive(:warn).with(/API error/)

      enricher.enrich_store(store)
    end
  end
end
