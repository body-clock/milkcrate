class RecordCardComponent < ViewComponent::Base
  def initialize(listing:, in_session: false, pick_reasons: [])
    @listing = listing
    @in_session = in_session
    @pick_reasons = Array(pick_reasons).reject(&:blank?)
  end

  def in_session?
    @in_session
  end

  def cover_image?
    @listing.cover_image_url.present?
  end

  def tracklist_lines
    Array(@listing.tracklist).first(6).map do |track|
      track.is_a?(Hash) ? "#{track['position']} #{track['title']}".strip : track.to_s
    end
  end

  def meta
    [ @listing.label, @listing.year, @listing.condition ].compact.join(" · ")
  end

  def pick_reasons?
    @pick_reasons.any?
  end
end
