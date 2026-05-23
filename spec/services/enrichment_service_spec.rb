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
      enricher = instance_double(MusicBrainzEnricher, enrich_store: nil)
      allow(MusicBrainzEnricher).to receive(:new).with(musicbrainz: musicbrainz).and_return(enricher)
      allow(service).to receive(:enrich_releases)

      service.enrich_store(store, listing_ids: [ 1, 2 ])

      expect(service).to have_received(:enrich_releases).with(store, listing_ids: [ 1, 2 ])
      expect(enricher).to have_received(:enrich_store).with(store)
      expect(store.reload.enrichment_status).to eq("idle")
      expect(store.last_enriched_at).to be_within(1.second).of(Time.current)
    end

    it "marks enrichment failed and re-raises on hard failure" do
      enricher = instance_double(MusicBrainzEnricher, enrich_store: nil)
      allow(MusicBrainzEnricher).to receive(:new).and_return(enricher)
      allow(service).to receive(:enrich_releases).and_raise(StandardError.new("boom"))

      expect {
        service.enrich_store(store)
      }.to raise_error(StandardError, "boom")

      expect(store.reload.enrichment_status).to eq("failed")
      expect(enricher).not_to have_received(:enrich_store)
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

    describe "overwritten-release detection" do
      before do
        # Default stub: any unexpected release calls return data silently
        allow(discogs).to receive(:release).and_return([ release_data, 55 ])
      end

      it "re-enriches a release whose listing format shows it was overwritten, even if recent" do
        overwritten = create(:listing, store:,
          discogs_listing_id: "ow", discogs_release_id: "999",
          format: "LP, Album", genres: [], styles: [])
        Release.create!(discogs_release_id: "999", enriched_at: 1.hour.ago, want_count: 10, have_count: 5)

        service.enrich_releases(store, listing_ids: [ listing.id ])

        expect(discogs).to have_received(:release).with("999")
      end

      it "does not re-enrich a release that already has enriched format" do
        enriched = create(:listing, store:,
          discogs_listing_id: "enr", discogs_release_id: "888",
          format: "Vinyl, LP, Album", genres: [ "Jazz" ], styles: [ "Bebop" ])
        Release.create!(discogs_release_id: "888", enriched_at: 1.hour.ago, want_count: 10, have_count: 5)

        service.enrich_releases(store, listing_ids: [ listing.id ])

        expect(discogs).not_to have_received(:release).with("888")
      end

      it "catches overwritten releases across the whole store, not just listing_ids" do
        overwritten = create(:listing, store:,
          discogs_listing_id: "ow", discogs_release_id: "999",
          format: "LP, Album", genres: [], styles: [])
        Release.create!(discogs_release_id: "999", enriched_at: 1.hour.ago, want_count: 10, have_count: 5)

        other_listing = create(:listing, store:,
          discogs_listing_id: "other", discogs_release_id: "777", format: "Cassette")
        Release.create!(discogs_release_id: "777", enriched_at: 1.hour.ago, want_count: 0, have_count: 0)

        service.enrich_releases(store, listing_ids: [ other_listing.id ])

        expect(discogs).to have_received(:release).with("999")
      end

      it "re-enriches a listing that is both in listing_ids and has sync format, even if recently enriched" do
        in_scope = create(:listing, store:,
          discogs_listing_id: "in-scope", discogs_release_id: "555",
          format: "LP, Album", genres: [], styles: [])
        Release.create!(discogs_release_id: "555", enriched_at: 1.hour.ago, want_count: 10, have_count: 5)

        service.enrich_releases(store, listing_ids: [ in_scope.id ])

        # Previously excluded by .where.not(discogs_release_id: release_ids)
        expect(discogs).to have_received(:release).with("555")
      end

      it "still enriches stale releases via stale_release_ids, not overwritten detection" do
        stale_listing = create(:listing, store:,
          discogs_listing_id: "stale", discogs_release_id: "666",
          format: "LP, Album")
        Release.create!(discogs_release_id: "666", enriched_at: 8.days.ago, want_count: 0, have_count: 0)

        service.enrich_releases(store, listing_ids: [ listing.id, stale_listing.id ])

        expect(discogs).to have_received(:release).with("666")
      end
    end
  end
end
