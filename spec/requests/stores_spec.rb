require "rails_helper"

RSpec.describe "Stores", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  def snapshot_metrics(crates, storefront_sections)
    {
      crate_count: crates.size,
      record_count: crates.sum { |crate| crate[:count] },
      surfaced_count: crates.flat_map { |crate| crate[:records].map { |record| record[:id] } }.uniq.size,
      payload_bytes: JSON.generate({ crates:, storefront_sections: }).bytesize,
      duration_ms: 1
    }
  end

  describe "GET /:slug" do
    shared_examples "resolves store at slug" do |slug|
      it "returns 200 for /#{slug}" do
        get "/#{slug}"
        expect(response).to have_http_status(:ok)
      end

      it "renders the stores/featured Inertia component for /#{slug}" do
        get "/#{slug}"
        expect(inertia).to render_component("stores/featured")
      end
    end

    context "with an active compatible storefront snapshot" do
      let!(:store) { create(:store, discogs_username: "TestStore") }
      let!(:pick_listing) { create(:listing, store:, format: "LP", genres: [ "Jazz" ], styles: [ "Bop" ], last_seen_at: Time.current) }
      let!(:genre_listing) { create(:listing, store:, format: "LP", genres: [ "Rock" ], styles: [ "Indie Rock" ], last_seen_at: Time.current) }
      let(:picks_crate) { CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ pick_listing ]) }
      let(:genre_crate) { CuratedCrate.new(slug: "jazz", name: "Jazz", listings: [ genre_listing ]) }
      let(:groups) { { picks: picks_crate, featured: [], genres: [ genre_crate ] } }
      let(:presenter) { CratePresenter.new(store) }
      let(:snapshot_crates) { presenter.build_crates([ picks_crate, genre_crate ]) }
      let(:snapshot_sections) { presenter.build_storefront_sections(groups) }
      let!(:snapshot) do
        create(
          :storefront_snapshot,
          store:,
          active: true,
          status: "ready",
          props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION,
          crates: snapshot_crates,
          storefront_sections: snapshot_sections,
          surfaced_listing_ids: [ pick_listing.id, genre_listing.id ],
          generated_at: Time.zone.parse("2026-05-17 09:00:00"),
          metrics: snapshot_metrics(snapshot_crates, snapshot_sections)
        )
      end

      before do
        expect(StorefrontCuration).not_to receive(:new)
      end

      include_examples "resolves store at slug", "teststore"
      include_examples "resolves store at slug", "TESTSTORE"

      it "serves the snapshot payload and live store metadata" do
        get "/teststore"

        aggregate_failures do
          expect(inertia.props["store"]).to include(
            "id" => store.id,
            "name" => store.name,
            "discogs_username" => store.discogs_username,
            "description" => store.description,
            "sync_status" => store.sync_status,
            "enrichment_status" => store.enrichment_status
          )
          expect(inertia.props["crates"]).to eq(snapshot_crates.map(&:deep_stringify_keys))
          expect(inertia.props["storefront_sections"]).to eq(snapshot_sections.map(&:deep_stringify_keys))
          expect(inertia.props["active_crate_slug"]).to eq("picks")
        end
      end

      it "sends Content-Security-Policy header on the storefront page" do
        get "/teststore"
        expect(response.headers["Content-Security-Policy"]).to be_present
      end

      it "includes script-src with nonce in the storefront CSP" do
        get "/teststore"
        csp = response.headers["Content-Security-Policy"]
        expect(csp).to include("script-src")
        expect(csp).to include("'nonce-")
      end
    end

    context "when the active snapshot schema is stale but a compatible snapshot exists" do
      let!(:store) { create(:store, discogs_username: "TestStore") }
      let!(:pick_listing) { create(:listing, store:, format: "LP", genres: [ "Jazz" ], styles: [ "Bop" ], last_seen_at: Time.current) }
      let!(:genre_listing) { create(:listing, store:, format: "LP", genres: [ "Rock" ], styles: [ "Indie Rock" ], last_seen_at: Time.current) }
      let(:picks_crate) { CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ pick_listing ]) }
      let(:genre_crate) { CuratedCrate.new(slug: "jazz", name: "Jazz", listings: [ genre_listing ]) }
      let(:groups) { { picks: picks_crate, featured: [], genres: [ genre_crate ] } }
      let(:presenter) { CratePresenter.new(store) }
      let(:latest_crates) { presenter.build_crates([ picks_crate, genre_crate ]) }
      let(:latest_sections) { presenter.build_storefront_sections(groups) }
      let!(:stale_snapshot) do
        create(
          :storefront_snapshot,
          store:,
          active: true,
          status: "ready",
          props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION - 1,
          crates: latest_crates,
          storefront_sections: latest_sections,
          surfaced_listing_ids: [ pick_listing.id, genre_listing.id ],
          generated_at: 2.days.ago,
          metrics: snapshot_metrics(latest_crates, latest_sections)
        )
      end
      let!(:compatible_snapshot) do
        create(
          :storefront_snapshot,
          store:,
          active: false,
          status: "ready",
          props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION,
          crates: latest_crates,
          storefront_sections: latest_sections,
          surfaced_listing_ids: [ pick_listing.id, genre_listing.id ],
          generated_at: Time.zone.parse("2026-05-17 09:00:00"),
          metrics: snapshot_metrics(latest_crates, latest_sections)
        )
      end

      before do
        expect(StorefrontCuration).not_to receive(:new)
      end

      include_examples "resolves store at slug", "teststore"
      include_examples "resolves store at slug", "TESTSTORE"

      it "serves the latest compatible snapshot when the active snapshot schema is stale" do
        get "/teststore"

        expect(inertia.props["crates"]).to eq(latest_crates.map(&:deep_stringify_keys))
        expect(inertia.props["storefront_sections"]).to eq(latest_sections.map(&:deep_stringify_keys))
        expect(inertia.props["active_crate_slug"]).to eq("picks")
        expect(stale_snapshot.reload.active).to be(true)
      end
    end

    context "when a compatible snapshot is stale but still renderable" do
      let!(:store) { create(:store, discogs_username: "TestStore") }
      let!(:pick_listing) { create(:listing, store:, format: "LP", genres: [ "Jazz" ], styles: [ "Bop" ], last_seen_at: Time.current) }
      let!(:genre_listing) { create(:listing, store:, format: "LP", genres: [ "Rock" ], styles: [ "Indie Rock" ], last_seen_at: Time.current) }
      let(:picks_crate) { CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ pick_listing ]) }
      let(:genre_crate) { CuratedCrate.new(slug: "jazz", name: "Jazz", listings: [ genre_listing ]) }
      let(:groups) { { picks: picks_crate, featured: [], genres: [ genre_crate ] } }
      let(:presenter) { CratePresenter.new(store) }
      let(:stale_crates) { presenter.build_crates([ picks_crate, genre_crate ]) }
      let(:stale_sections) { presenter.build_storefront_sections(groups) }
      let(:logged_messages) { [] }
      let!(:snapshot) do
        create(
          :storefront_snapshot,
          store:,
          active: true,
          status: "ready",
          props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION,
          curation_date: Date.current - 1,
          crates: stale_crates,
          storefront_sections: stale_sections,
          surfaced_listing_ids: [ pick_listing.id, genre_listing.id ],
          generated_at: 1.day.ago,
          metrics: snapshot_metrics(stale_crates, stale_sections)
        )
      end

      before do
        expect(StorefrontCuration).not_to receive(:new)
        allow(Rails.logger).to receive(:info) do |*args|
          message = args.first
          logged_messages << message if message.is_a?(String)
        end
      end

      it "serves the stale snapshot and logs the stale hit" do
        get "/teststore"

        expect(inertia.props["crates"]).to eq(stale_crates.map(&:deep_stringify_keys))
        expect(inertia.props["storefront_sections"]).to eq(stale_sections.map(&:deep_stringify_keys))
        expect(logged_messages.any? { |message| message.include?("stale_snapshot=true") && message.include?("snapshot_id=#{snapshot.id}") }).to be(true)
      end
    end

    context "when the active snapshot payload is malformed" do
      let!(:store) { create(:store, discogs_username: "badstore") }
      let!(:pick_listing) { create(:listing, store:, format: "LP", genres: [ "Jazz" ], styles: [ "Bop" ], last_seen_at: Time.current) }
      let(:picks_crate) { CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ pick_listing ]) }
      let(:groups) { { picks: picks_crate, featured: [], genres: [] } }
      let(:presenter) { CratePresenter.new(store) }
      let(:live_crates) { presenter.build_crates([ picks_crate ]) }
      let(:live_sections) { presenter.build_storefront_sections(groups) }
      let!(:snapshot) do
        create(
          :storefront_snapshot,
          store:,
          active: true,
          status: "ready",
          props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION,
          crates: live_crates,
          storefront_sections: live_sections,
          surfaced_listing_ids: [ pick_listing.id ],
          generated_at: Time.zone.parse("2026-05-17 09:00:00"),
          metrics: snapshot_metrics(live_crates, live_sections)
        )
      end

      before do
        snapshot.update_columns(crates: {}, storefront_sections: {})

        curation = instance_double(StorefrontCuration)
        allow(StorefrontCuration).to receive(:new).with(store, filter_available: true).and_return(curation)
        allow(curation).to receive(:crates).and_return([ picks_crate ])
        allow(curation).to receive(:storefront_groups).and_return(groups)
      end

      it "falls back to live curation instead of serving malformed JSON" do
        get "/badstore"

        expect(inertia.props["crates"]).to eq(live_crates.map(&:deep_stringify_keys))
        expect(inertia.props["storefront_sections"]).to eq(live_sections.map(&:deep_stringify_keys))
      end
    end

    context "with existing store" do
      let!(:store) { create(:store, discogs_username: "TestStore") }

      include_examples "resolves store at slug", "teststore"
      include_examples "resolves store at slug", "TESTSTORE"

      it "sends Content-Security-Policy header on the storefront page" do
        get "/teststore"
        expect(response.headers["Content-Security-Policy"]).to be_present
      end

      it "includes script-src with nonce in the storefront CSP" do
        get "/teststore"
        csp = response.headers["Content-Security-Policy"]
        expect(csp).to include("script-src")
        expect(csp).to include("'nonce-")
      end
    end

    context "with unknown slug" do
      it "returns 200 and renders invitation" do
        get "/unknownstore"
        expect(response).to have_http_status(:ok)
        expect(inertia).to render_component("stores/invitation")
      end

      it "passes slug as prop" do
        get "/some-slug"
        expect(inertia.props[:slug]).to eq("some-slug")
      end

      it "passes waitlist_present as false when no waitlist entry exists" do
        get "/slug-not-on-waitlist"
        expect(inertia.props[:waitlist_present]).to be false
      end

      it "passes waitlist_present as true when waitlist entry exists" do
        create(:waitlist, discogs_username: "applied-slug")
        get "/applied-slug"
        expect(inertia.props[:waitlist_present]).to be true
      end
    end
  end

  describe "crate building integration" do
    let!(:store) { create(:store, discogs_username: "teststore") }

    it "builds a genre bin for each primary genre present" do
      create_list(:listing, 100, store: store, genres: [ "Jazz" ], format: "LP")
      create_list(:listing, 100, store: store, genres: [ "Rock" ], format: "LP")

      get "/teststore"

      crates = inertia.props["crates"]
      slugs = crates.map { |c| c["slug"] }
      expect(slugs).to include("picks", "jazz", "rock")
    end

    it "excludes records from a genre bin when that genre is not primary" do
      jazz_primary = create(:listing, store: store, genres: [ "Jazz", "Rock" ], format: "LP")
      create_list(:listing, 200, store: store, genres: [ "Rock" ], format: "LP")

      get "/teststore"

      crates = inertia.props["crates"]
      rock_crate = crates.find { |c| c["slug"] == "rock" }
      rock_record_ids = rock_crate["records"].map { |r| r["id"] }

      expect(rock_record_ids).not_to include(jazz_primary.id)
    end

    it "caps each genre bin at 50 records" do
      create_list(:listing, 200, store: store, genres: [ "Jazz" ], format: "LP")

      get "/teststore"

      crates = inertia.props["crates"]
      jazz_crate = crates.find { |c| c["slug"] == "jazz" }
      expect(jazz_crate["records"].size).to eq(50)
    end

    it "returns explicit storefront section semantics in payload order" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        create_list(:listing, 5, store: store, genres: [ "Funk / Soul" ], styles: [ "Boogie" ], format: "LP", listed_at: 2.days.ago)
        create_list(:listing, 5, store: store, genres: [ "Rock" ], styles: [ "Indie Rock" ], format: "LP", listed_at: 3.days.ago)
        create_list(:listing, 5, store: store, genres: [ "Jazz" ], styles: [ "Bop" ], format: "LP", listed_at: 4.days.ago)

        get "/teststore"

        sections = inertia.props["storefront_sections"]
        expect(sections.map { |s| s["key"] }).to include("picks_wall", "genre_grid")
        expect(sections.first["key"]).to eq("picks_wall")
        expect(sections.first.dig("crate", "slug")).to eq("picks")
      end
    end
  end
end
