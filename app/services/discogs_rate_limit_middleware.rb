class DiscogsRateLimitMiddleware < Faraday::Middleware
  SLEEP = 1.1       # baseline pacing: ~55 req/min
  LOW = 5           # remaining threshold to trigger extended pause
  PAUSE = 10        # seconds to sleep when remaining <= LOW
  MAX_RETRIES = 3   # max 429 retry attempts per request
  BACKOFF_BASE = 2  # exponential backoff base (2^attempt seconds)

  def initialize(app)
    super(app)
    @last_request_time = nil
    @last_remaining = nil
  end

  def call(env)
    sleep_if_needed

    retries = 0
    loop do
      response = @app.call(env)
      @last_remaining = response.headers["x-discogs-ratelimit-remaining"]&.to_i

      if response.status == 429 && retries < MAX_RETRIES
        retries += 1
        backoff = [(BACKOFF_BASE**retries), 60].min
        sleep(backoff)
        @last_request_time = nil
      else
        if @last_remaining && @last_remaining <= LOW
          sleep(PAUSE)
        end

        @last_request_time = Time.now.to_f
        return response
      end
    end
  end

  private

  def sleep_if_needed
    return unless @last_request_time

    elapsed = Time.now.to_f - @last_request_time
    if elapsed < SLEEP
      sleep(SLEEP - elapsed)
    end
  end
end
