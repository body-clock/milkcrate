require "digest"
require "digest/md5"

class ScoreStrategies::NoiseStrategy
  NOISE_MAGNITUDE = 1.5

  def initialize(today: Date.today)
    @today = today
  end

  def score(listing)
    seed_str = "#{listing.id}-#{@today}"
    noise_unit = Digest::MD5.hexdigest(seed_str).to_i(16).to_f / (2**128)
    (noise_unit * 2 - 1) * NOISE_MAGNITUDE
  end
end
