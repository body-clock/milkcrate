# Namespace for Discogs API client components.
module Discogs
  # Shared error classes for Discogs API clients.
  # RateLimitError is raised on HTTP 429 responses.
  # ApiError is raised on other non-success responses.
  module Errors
    class RateLimitError < StandardError; end
    class ApiError < StandardError; end
  end
end
