require "rails_helper"

RSpec.describe DiscogsRateLimitMiddleware do
  subject(:middleware) { described_class.new(app) }
  let(:app) { double("app") }
  let(:env) { Faraday::Env.from({}) }

  # Helper to build a Faraday::Response with given status and headers
  def response_with(status:, headers: {}, body: "{}")
    response_headers = Faraday::Utils::Headers.new
    headers.each { |k, v| response_headers[k] = v.to_s }

    env = Faraday::Env.new.tap do |e|
      e.status = status
      e.response_headers = response_headers
      e.body = body
    end
    Faraday::Response.new(env)
  end

  describe "#call" do
    it "passes through a successful response" do
      allow(middleware).to receive(:sleep)
      response = response_with(status: 200, headers: { "x-discogs-ratelimit-remaining" => 55 })
      allow(app).to receive(:call).with(env).and_return(response)

      result = middleware.call(env)

      expect(result.status).to eq(200)
      expect(result.body).to eq("{}")
    end

    it "enforces baseline delay between two rapid consecutive requests" do
      response = response_with(status: 200, headers: { "x-discogs-ratelimit-remaining" => 55 })
      allow(app).to receive(:call).with(env).and_return(response)

      allow(middleware).to receive(:sleep)
      # First call sets @last_request_time
      middleware.call(env)

      # Second call should sleep for SLEEP seconds for baseline
      middleware.call(env)

      expect(middleware).to have_received(:sleep).with(be_within(0.01).of(described_class::SLEEP)).at_least(:once)
    end

    it "does not sleep on first request when remaining is moderate" do
      allow(middleware).to receive(:sleep)
      response = response_with(status: 200, headers: { "x-discogs-ratelimit-remaining" => 55 })
      allow(app).to receive(:call).with(env).and_return(response)

      middleware.call(env)

      # First call should not sleep for PAUSE (no prior request, remaining > LOW)
      expect(middleware).not_to have_received(:sleep).with(described_class::PAUSE)
    end

    it "applies extended pause when remaining is below LOW threshold" do
      response = response_with(status: 200, headers: { "x-discogs-ratelimit-remaining" => 3 })
      allow(app).to receive(:call).with(env).and_return(response)

      allow(middleware).to receive(:sleep)
      middleware.call(env)

      expect(middleware).to have_received(:sleep).with(described_class::PAUSE).at_least(:once)
    end

    it "does not apply extended pause when remaining is above LOW threshold" do
      response = response_with(status: 200, headers: { "x-discogs-ratelimit-remaining" => 55 })
      allow(app).to receive(:call).with(env).and_return(response)

      allow(middleware).to receive(:sleep)
      middleware.call(env)

      expect(middleware).not_to have_received(:sleep).with(described_class::PAUSE)
    end

    it "retries on 429 with exponential backoff and succeeds" do
      retry_response = response_with(status: 429, headers: { "x-discogs-ratelimit-remaining" => 0 })
      success_response = response_with(status: 200, headers: { "x-discogs-ratelimit-remaining" => 55 })

      allow(middleware).to receive(:sleep)
      allow(app).to receive(:call).with(env).and_return(retry_response, success_response)

      result = middleware.call(env)

      expect(result.status).to eq(200)
      expect(app).to have_received(:call).with(env).twice
    end

    it "exhausts retries and returns 429 after MAX_RETRIES" do
      retry_responses = Array.new(described_class::MAX_RETRIES + 1) do
        response_with(status: 429, headers: { "x-discogs-ratelimit-remaining" => 0 })
      end

      allow(middleware).to receive(:sleep)
      allow(app).to receive(:call).with(env).and_return(*retry_responses)

      result = middleware.call(env)

      expect(result.status).to eq(429)
      expect(app).to have_received(:call).with(env).exactly(described_class::MAX_RETRIES + 1).times
    end

    it "does not crash when rate-limit header is missing" do
      allow(middleware).to receive(:sleep)
      response = response_with(status: 200, headers: {})
      allow(app).to receive(:call).with(env).and_return(response)

      expect { middleware.call(env) }.not_to raise_error
    end
  end
end
