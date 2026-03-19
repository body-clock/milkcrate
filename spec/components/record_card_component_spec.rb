require "rails_helper"

RSpec.describe RecordCardComponent, type: :component do
  subject(:component) { described_class.new(listing: listing, in_session: in_session) }

  let(:listing) do
    build_stubbed(:listing,
      title: "A Love Supreme",
      artist: "John Coltrane",
      label: "Impulse!",
      year: 1965,
      condition: "VG+",
      price: 34.99,
      cover_image_url: "https://example.com/cover.jpg",
      tracklist: [
        { "position" => "A1", "title" => "Acknowledgement" },
        { "position" => "B1", "title" => "Pursuance" }
      ]
    )
  end
  let(:in_session) { false }

  it "renders the album title" do
    render_inline(component)
    expect(page).to have_text("A Love Supreme")
  end

  it "renders the artist" do
    render_inline(component)
    expect(page).to have_text("John Coltrane")
  end

  it "renders the cover image when present" do
    render_inline(component)
    expect(page).to have_css("img[src='https://example.com/cover.jpg']")
  end

  it "renders a placeholder when no cover image" do
    listing = build_stubbed(:listing, cover_image_url: nil)
    render_inline(described_class.new(listing: listing, in_session: false))
    expect(page).to have_css(".mc-record-no-image")
  end

  it "renders tracklist lines" do
    render_inline(component)
    expect(page).to have_text("A1 Acknowledgement")
    expect(page).to have_text("B1 Pursuance")
  end

  it "renders meta info" do
    render_inline(component)
    expect(page).to have_text("Impulse!")
    expect(page).to have_text("1965")
    expect(page).to have_text("VG+")
  end

  context "when not in session" do
    let(:in_session) { false }

    it "renders the add to pile button" do
      render_inline(component)
      expect(page).to have_button("+ Pile")
    end

    it "does not render the in-pile button" do
      render_inline(component)
      expect(page).not_to have_button("✓ In pile")
    end
  end

  context "when in session" do
    let(:in_session) { true }

    it "renders the in-pile button" do
      render_inline(component)
      expect(page).to have_button("✓ In pile")
    end

    it "does not render the add to pile button" do
      render_inline(component)
      expect(page).not_to have_button("+ Pile")
    end
  end

  describe "#meta" do
    it "joins label, year, and condition" do
      expect(component.meta).to eq("Impulse! · 1965 · VG+")
    end

    it "omits nil fields" do
      listing = build_stubbed(:listing, label: nil, year: 1965, condition: "VG+")
      c = described_class.new(listing: listing, in_session: false)
      expect(c.meta).to eq("1965 · VG+")
    end
  end
end
