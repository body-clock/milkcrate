require "rails_helper"

RSpec.describe EnrichReleasesJob do
  def create_listing(store:, release_id:, listing_id: release_id)
    create(
      :listing,
      store:,
      discogs_listing_id: listing_id,
      discogs_release_id: release_id,
      genres: [],
      styles: []
    )
  end

  let(:client) { instance_double(DiscogsClient) }
  let(:store) { create(:store, name: "Test Store", discogs_username: "test-store", sync_status: "idle") }

  before do
    allow(DiscogsClient).to receive(:new).and_return(client)
    allow(client).to receive(:release).with("111").and_return(
      [ { "community" => { "want" => 500, "have" => 200 }, "genres" => [], "styles" => [], "formats" => [], "images" => [], "tracklist" => [] }, 50 ]
    )
    allow(client).to receive(:release).with("222").and_return(
      [ { "community" => { "want" => 100, "have" => 300 }, "genres" => [], "styles" => [], "formats" => [], "images" => [], "tracklist" => [] }, 49 ]
    )
    allow_any_instance_of(described_class).to receive(:sleep)
  end

  it "fetches each unique release from the API" do
    create_listing(store:, release_id: "111")
    create_listing(store:, release_id: "222")

    described_class.new.perform(store.id)

    expect(client).to have_received(:release).with("111").once
    expect(client).to have_received(:release).with("222").once
  end

  it "skips already-fresh releases unless their listings were downgraded" do
    create_listing(store:, release_id: "111")
    create_listing(store:, release_id: "222")
    Release.create!(discogs_release_id: "111", enriched_at: Time.current)
    Release.create!(discogs_release_id: "222", enriched_at: Time.current)

    described_class.new.perform(store.id)

    # Both are fresh: neither enriched (no downgrade, no stale)
    expect(client).not_to have_received(:release).with("111")
    expect(client).not_to have_received(:release).with("222")
  end

  it "re-enriches fresh releases whose listings have cover_url == thumbnail_url (downgrade repair)" do
    listing = create_listing(store:, release_id: "111")
    listing.update_columns(
      thumbnail_url: "https://i.discogs.com/thumb.jpg",
      cover_image_url: "https://i.discogs.com/thumb.jpg"
    )
    Release.create!(discogs_release_id: "111", enriched_at: Time.current)

    allow(client).to receive(:release).with("111").and_return(
      [ {
        "community" => { "want" => 1, "have" => 1 },
        "genres" => [], "styles" => [], "formats" => [], "tracklist" => [],
        "images" => [ { "type" => "primary", "uri" => "https://i.discogs.com/fullres.jpg" } ]
      }, 50 ]
    )

    described_class.new.perform(store.id)

    expect(client).to have_received(:release).with("111").once
    expect(listing.reload.cover_image_url).to eq("https://i.discogs.com/fullres.jpg")
  end

  it "deduplicates listings with the same release_id" do
    create_listing(store:, release_id: "111", listing_id: "listing-a")
    create_listing(store:, release_id: "111", listing_id: "listing-b")

    described_class.new.perform(store.id)

    expect(client).to have_received(:release).with("111").once
  end

  it "writes community counts to releases and matching listings" do
    listing = create_listing(store:, release_id: "111")

    described_class.new.perform(store.id)

    release = Release.find_by!(discogs_release_id: "111")
    expect(release.want_count).to eq(500)
    expect(release.have_count).to eq(200)
    expect(listing.reload.want_count).to eq(500)
    expect(listing.have_count).to eq(200)
  end

  it "logs and continues on API errors" do
    create_listing(store:, release_id: "111")
    create_listing(store:, release_id: "222")
    allow(client).to receive(:release).with("111").and_raise(DiscogsClient::ApiError, "404")
    allow(Rails.logger).to receive(:warn)

    expect { described_class.new.perform(store.id) }.not_to raise_error
    expect(client).to have_received(:release).with("222")
  end

  it "sets discogs_image_missing true when Discogs returns no images" do
    create_listing(store:, release_id: "111")
    described_class.new.perform(store.id)
    expect(Release.find_by(discogs_release_id: "111").discogs_image_missing).to be true
  end

  it "sets discogs_image_missing false when Discogs returns an image" do
    allow(client).to receive(:release).with("111").and_return(
      [ {
        "community" => { "want" => 1, "have" => 1 },
        "genres" => [], "styles" => [], "formats" => [], "tracklist" => [],
        "images" => [ { "type" => "primary", "uri" => "https://img.discogs.com/cover.jpg" } ]
      }, 50 ]
    )
    create_listing(store:, release_id: "111")
    described_class.new.perform(store.id)
    expect(Release.find_by(discogs_release_id: "111").discogs_image_missing).to be false
  end

  it "enqueues EnrichMusicBrainzImagesJob after enrichment" do
    create_listing(store:, release_id: "111")
    expect {
      described_class.new.perform(store.id)
    }.to have_enqueued_job(EnrichMusicBrainzImagesJob).with(store.id)
  end
end
