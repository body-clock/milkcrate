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
    response = request_with_retry(env)
    pause_if_quota_low(response)
    @last_request_time = Time.now.to_f
    response
  end

  private

  def request_with_retry(env, attempt: 1)
    response = @app.call(env)
    return response unless response.status == 429
    return response if attempt > MAX_RETRIES
    sleep(backoff_for(attempt))
    request_with_retry(env, attempt: attempt + 1)
  end

  def backoff_for(attempt)
    [ (BACKOFF_BASE**attempt), 60 ].min
  end

  def pause_if_quota_low(response)
    @last_remaining = response.headers["x-discogs-ratelimit-remaining"]&.to_i
    return unless @last_remaining && @last_remaining <= LOW
    sleep(PAUSE)
  end

  def sleep_if_needed
    return unless @last_request_time

    elapsed = Time.now.to_f - @last_request_time
    if elapsed < SLEEP
      sleep(SLEEP - elapsed)
    end
  end
end
