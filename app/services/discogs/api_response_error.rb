# Formats and raises bounded errors for unsuccessful Discogs API responses.
module Discogs
  class ApiResponseError
    BODY_LIMIT = 500

    def self.raise!(response, prefix: nil)
      new(response, prefix:).raise!
    end

    def initialize(response, prefix:)
      @response = response
      @prefix = prefix || "Discogs API error: #{response.code}"
    end

    def raise!
      raise error_class, message
    end

    private

    def error_class
      code.between?(500, 599) ? Errors::TransientApiError : Errors::ApiError
    end

    def code
      @response.code.to_i
    end

    def message
      excerpt.present? ? "#{@prefix} — #{excerpt}" : @prefix
    end

    def excerpt
      @response.body.to_s
        .encode("UTF-8", invalid: :replace, undef: :replace)
        .squish
        .truncate(BODY_LIMIT)
    end
  end
end
