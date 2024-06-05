# frozen_string_literal: true

module Youtube
  # The Youtube service
  class Service
    class << self
      def video_data(url:)
        return unless valid_youtube_url?(url: url)

        response = Faraday.get("https://www.youtube.com/oembed?url=#{url}&format=json")
        return unless response.success?

        JSON.parse(response.body)
      end

      def embed_url(url:)
        return unless valid_youtube_url?(url: url)

        regexp = %r{
        (?:https?://)?
        (?:www\.)?
        (?:
          youtube\.com/
          (?:
            [^/\n\s]+/\S+/
            |
            (?:v|e(?:mbed)?)/
            |
            .*[?&]v=
          )
          |
          youtu\.be/
        )
        ([a-zA-Z0-9_-]{11})
      }x
        match = url.match(regexp)
        youtube_id = match[1]
        "https://www.youtube.com/embed/#{youtube_id}"
      end

      private

      def valid_youtube_url?(url:)
        # TODO: Implement URL validation
        true if url
      end
    end
  end
end
