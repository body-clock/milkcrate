# Namespace for Discogs API client components.
module Discogs
  # Shared error classes for Discogs API clients.
  # RateLimitError is raised on HTTP 429 responses.
  # ApiError is raised on non-success responses.
  # TransientApiError identifies upstream 5xx failures.
  # AuthError identifies 401 Unauthorized responses (invalid/expired tokens).
  module Errors
    class RateLimitError < StandardError; end
    class ApiError < StandardError; end
    class TransientApiError < ApiError; end
    class AuthError < ApiError; end
  end
end
