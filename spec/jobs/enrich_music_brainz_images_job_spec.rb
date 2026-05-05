require "rails_helper"

RSpec.describe EnrichMusicBrainzImagesJob do
  let(:mb_client) { instance_double(MusicBrainzClient) }
  let(:store)     { create(:store, name: "Test Store", discogs_username: "teststore") }

  before do
    allow(MusicBrainzClient).to receive(:new).and_return(mb_client)
    allow_any_instance_of(described_class).to receive(:sleep)
    allow(mb_client).to receive(:search_release)
  end

  def create_imageless_listing(release_id:)
    listing = create(:listing, store:, discogs_release_id: release_id,
                     cover_image_url: "https://thumb.jpg", thumbnail_url: "https://thumb.jpg")
    Release.create!(discogs_release_id: release_id, discogs_image_missing: true,
                    enriched_at: 1.day.ago)
    listing
  end

  it "updates cover_image_url and musicbrainz_id when match and cover found" do
    listing = create_imageless_listing(release_id: "111")
    allow(mb_client).to receive(:search_release).with(artist: listing.artist, title: listing.title)
                                                .and_return("mbid-abc")
    allow(mb_client).to receive(:front_cover_url).with("mbid-abc")
                                                 .and_return("https://archive.org/cover.jpg")

    described_class.new.perform(store.id)

    expect(listing.reload.cover_image_url).to eq("https://archive.org/cover.jpg")
    expect(Release.find_by(discogs_release_id: "111").musicbrainz_id).to eq("mbid-abc")
  end

  it "stores musicbrainz_id but leaves cover unchanged when MBID found but no CAA image" do
    listing = create_imageless_listing(release_id: "111")
    allow(mb_client).to receive(:search_release).and_return("mbid-abc")
    allow(mb_client).to receive(:front_cover_url).with("mbid-abc").and_return(nil)

    described_class.new.perform(store.id)

    expect(listing.reload.cover_image_url).to eq("https://thumb.jpg")
    expect(Release.find_by(discogs_release_id: "111").musicbrainz_id).to eq("mbid-abc")
  end

  it "writes empty string to musicbrainz_id when no MusicBrainz match" do
    create_imageless_listing(release_id: "111")
    allow(mb_client).to receive(:search_release).and_return(nil)

    described_class.new.perform(store.id)

    expect(Release.find_by(discogs_release_id: "111").musicbrainz_id).to eq("")
  end

  it "skips releases already searched (musicbrainz_id not nil)" do
    create_imageless_listing(release_id: "111")
    Release.find_by(discogs_release_id: "111").update!(musicbrainz_id: "already-done")

    described_class.new.perform(store.id)

    expect(mb_client).not_to have_received(:search_release)
  end

  it "logs a warning and continues when MusicBrainzClient raises ApiError" do
    listing1 = create_imageless_listing(release_id: "111")
    listing2 = create_imageless_listing(release_id: "222")

    allow(mb_client).to receive(:search_release).with(artist: listing1.artist, title: listing1.title)
                                                .and_raise(MusicBrainzClient::ApiError, "timeout")
    allow(mb_client).to receive(:search_release).with(artist: listing2.artist, title: listing2.title)
                                                .and_return("mbid-222")
    allow(mb_client).to receive(:front_cover_url).with("mbid-222").and_return("https://archive.org/222.jpg")

    described_class.new.perform(store.id)

    expect(listing2.reload.cover_image_url).to eq("https://archive.org/222.jpg")
  end

  it "skips releases where discogs_image_missing is false" do
    listing = create(:listing, store:, discogs_release_id: "222",
                     cover_image_url: "https://full.jpg", thumbnail_url: "https://thumb.jpg")
    Release.create!(discogs_release_id: "222", discogs_image_missing: false, enriched_at: 1.day.ago)

    described_class.new.perform(store.id)

    expect(mb_client).not_to have_received(:search_release)
  end
end
