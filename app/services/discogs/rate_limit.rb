# frozen_string_literal: true

# Shared rate-limit constants and backoff logic for Discogs API consumers.
# Both the Faraday middleware (PublicClient) and the OAuth marketplace client
# need the same retry discipline; this module keeps them in sync.
module Discogs
  module RateLimit
    MAX_RETRIES = 3
    BACKOFF_BASE = 2

    def backoff_for(attempt)
      [ (BACKOFF_BASE**attempt), 60 ].min
    end
  end
end
