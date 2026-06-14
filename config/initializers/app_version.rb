# frozen_string_literal: true

# Reads the semantic version from the VERSION file in the project root.
# Combined with ViteRuby.digest for cache busting in the footer.
#
# Usage:
#   AppVersion.current  # => "0.1.0"
#   AppVersion.display  # => "0.1.0 (abc1234)"
#
module AppVersion
  VERSION_FILE = Rails.root.join("VERSION")

  class << self
    def current
      @current ||= VERSION_FILE.read.strip
    end

    def display
      "#{current} (#{ViteRuby.digest.first(7)})"
    end

    def reset!
      @current = nil
    end
  end
end
