# Parses genre tags from a store's Discogs profile description.
class StoreProfileParser
  GENRE_KEYWORDS = %w[
    punk rock jazz soul funk blues country folk classical hip-hop electronic
    reggae metal hardcore indie alternative pop r&b gospel latin african
    asian european experimental ambient drone noise post-punk new-wave
    synthwave disco house techno dubstep trap lo-fi garage psychobilly
    rockabilly ska oompah bluegrass americana celtic zydeco cajun
    motown northern-soul rare-groove library soundtrack film-tv musical
    broadway opera choral chamber orchestra ensemble
  ].freeze

  def initialize(description)
    @description = description.to_s.downcase
  end

  def genre_tags
    GENRE_KEYWORDS.select { |keyword| @description.include?(keyword) }.uniq
  end
end
