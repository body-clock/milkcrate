require "rails_helper"

RSpec.describe EnrichmentService do
  let(:store) { create(:store) }
  let(:discogs) { instance_double(DiscogsClient) }
  let(:musicbrainz) { instance_double(MusicBrainzClient) }
  subject(:service) { described_class.new }

  before do
    allow(DiscogsClient).to receive(:new).and_return(discogs)
    allow(MusicBrainzClient).to receive(:new).and_return(musicbrainz)
  end

  describe "#enrich_store" do
    it "sets enrichment lifecycle state around both enrichment phases" do
      allow(service).to receive(:enrich_releases)
      allow(service).to receive(:enrich_music_brainz_images)

      service.enrich_store(store, listing_ids: [ 1, 2 ])

      expect(service).to have_received(:enrich_releases).with(store, listing_ids: [ 1, 2 ])
      expect(service).to have_received(:enrich_music_brainz_images).with(store)
      expect(store.reload.enrichment_status).to eq("idle")
      expect(store.last_enriched_at).to be_within(1.second).of(Time.current)
    end

    it "marks enrichment failed and re-raises on hard failure" do
      allow(service).to receive(:enrich_releases).and_raise(StandardError.new("boom"))
      allow(service).to receive(:enrich_music_brainz_images)

      expect {
        service.enrich_store(store)
      }.to raise_error(StandardError, "boom")

      expect(store.reload.enrichment_status).to eq("failed")
      expect(service).not_to have_received(:enrich_music_brainz_images)
    end

    it "finishes idle when individual API errors are handled inside enrichment phases" do
      listing = create(:listing, store:, discogs_release_id: "123", format: "Vinyl")
      Release.create!(discogs_release_id: "123", enriched_at: 8.days.ago, want_count: 0, have_count: 0)
      allow(discogs).to receive(:release).with("123").and_raise(DiscogsClient::ApiError, "Not found")
      allow(musicbrainz).to receive(:search_release)
      expect(Rails.logger).to receive(:warn).with(/API error/)

      service.enrich_store(store, listing_ids: [ listing.id ])

      expect(store.reload.enrichment_status).to eq("idle")
    end
  end

  describe "#enrich_releases" do
    let!(:listing) do
      create(:listing, store:, discogs_release_id: "123", format: "Vinyl")
    end

    let(:release_data) do
      {
        "community" => { "want" => 10, "have" => 5 },
        "genres" => [ "Jazz" ],
        "styles" => [ "Bebop" ],
        "formats" => [ { "name" => "Vinyl", "descriptions" => [ "LP" ] } ],
        "images" => [ { "type" => "primary", "uri" => "https://example.com/cover.jpg" } ],
        "tracklist" => [ { "position" => "A1", "title" => "Song One" } ]
      }
    end

    before do
      Release.create!(discogs_release_id: "123", enriched_at: 8.days.ago, want_count: 0, have_count: 0)
    end

    it "enriches releases with Discogs data and updates listings" do
      allow(discogs).to receive(:release).with("123").and_return([ release_data, 55 ])

      service.enrich_releases(store, listing_ids: [ listing.id ])

      release = Release.find_by(discogs_release_id: "123")
      expect(release.want_count).to eq(10)
      expect(release.have_count).to eq(5)
      expect(release.enriched_at).to be_within(5).of(Time.current)

      listing.reload
      expect(listing.genres).to eq([ "Jazz" ])
      expect(listing.styles).to eq([ "Bebop" ])
      expect(listing.cover_image_url).to eq("https://example.com/cover.jpg")
    end

    it "handles API errors gracefully without crashing the batch" do
      allow(discogs).to receive(:release).with("123").and_raise(DiscogsClient::ApiError, "Not found")
      expect(Rails.logger).to receive(:warn).with(/API error/)

      service.enrich_releases(store, listing_ids: [ listing.id ])
    end

    it "skips releases that are not stale" do
      Release.where(discogs_release_id: "123").update_all(enriched_at: 1.hour.ago)

      expect(discogs).not_to receive(:release)

      service.enrich_releases(store, listing_ids: [ listing.id ])
    end

  end

  describe "#enrich_music_brainz_images" do
    let!(:listing) do
      create(:listing, store:, discogs_release_id: "123", artist: "Test Artist", title: "Test Album", cover_image_url: nil)
    end

    before do
      Release.create!(
        discogs_release_id: "123",
        discogs_image_missing: true,
        musicbrainz_id: nil,
        enriched_at: Time.current)
    end

    it "fetches cover images for releases without them" do
      allow(musicbrainz).to receive(:search_release).with(artist: "Test Artist", title: "Test Album")
        .and_return("mbid-123")
      allow(musicbrainz).to receive(:front_cover_url).with("mbid-123")
        .and_return("https://coverartarchive.org/release/mbid-123/front")

      service.enrich_music_brainz_images(store)

      listing.reload
      expect(listing.cover_image_url).to eq("https://coverartarchive.org/release/mbid-123/front")
      expect(Release.find_by(discogs_release_id: "123").musicbrainz_id).to eq("mbid-123")
    end

    it "skips releases with no matching MusicBrainz ID" do
      allow(musicbrainz).to receive(:search_release).with(artist: "Test Artist", title: "Test Album")
        .and_return(nil)

      service.enrich_music_brainz_images(store)

      listing.reload
      expect(listing.cover_image_url).to be_nil
      expect(Release.find_by(discogs_release_id: "123").musicbrainz_id).to eq("")
    end

    it "handles MusicBrainz API errors gracefully" do
      allow(musicbrainz).to receive(:search_release).with(artist: "Test Artist", title: "Test Album")
        .and_raise(MusicBrainzClient::ApiError, "Search failed")
      expect(Rails.logger).to receive(:warn).with(/API error/)

      service.enrich_music_brainz_images(store)
    end
  end
end
