require "rails_helper"

RSpec.describe DiscogsRateLimitMiddleware do
  subject(:middleware) { described_class.new(app) }
  let(:app) { double("app") }
  let(:env) { Faraday::Env.from({}) }

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
      response = response_with(status: 200, headers: { "x-discogs-ratelimit-remaining" => 55 })
      allow(app).to receive(:call).with(env).and_return(response)

      result = middleware.call(env)

      expect(result.status).to eq(200)
      expect(result.body).to eq("{}")
    end

    it "retries on 429 up to MAX_RETRIES times" do
      allow(middleware).to receive(:sleep)
      retry_response = response_with(status: 429, headers: { "x-discogs-ratelimit-remaining" => 0 })
      success_response = response_with(status: 200, headers: { "x-discogs-ratelimit-remaining" => 55 })
      allow(app).to receive(:call).with(env).and_return(retry_response, success_response)

      result = middleware.call(env)

      expect(result.status).to eq(200)
      expect(app).to have_received(:call).with(env).twice
    end

    it "exhausts all retries and returns 429" do
      allow(middleware).to receive(:sleep)
      retry_responses = Array.new(described_class::MAX_RETRIES + 1) do
        response_with(status: 429, headers: { "x-discogs-ratelimit-remaining" => 0 })
      end
      allow(app).to receive(:call).with(env).and_return(*retry_responses)

      result = middleware.call(env)

      expect(result.status).to eq(429)
      expect(app).to have_received(:call).with(env).exactly(described_class::MAX_RETRIES + 1).times
    end

    it "does not crash when rate-limit header is missing" do
      response = response_with(status: 200, headers: {})
      allow(app).to receive(:call).with(env).and_return(response)

      expect { middleware.call(env) }.not_to raise_error
    end
  end

  describe "integration with DiscogsClient connection stack" do
    it "retries 429 transparently when wired into a DiscogsClient connection" do
      stubs = Faraday::Adapter::Test::Stubs.new
      conn = Faraday.new do |f|
        f.request :url_encoded
        f.response :json
        f.use DiscogsRateLimitMiddleware
        f.request :retry, max: 3, interval: 2.0, retry_statuses: [ 503 ]
        f.headers["Authorization"] = "Discogs token=test"
        f.headers["User-Agent"] = "Milkcrate/1.0 +https://milkcrate.fm"
        f.adapter :test, stubs
      end

      client = DiscogsClient.new(connection: conn)

      call_count = 0
      stubs.get("/users/testuser/inventory") do
        call_count += 1
        if call_count == 1
          [ 429, {}, "rate limited" ]
        else
          [ 200, { "Content-Type" => "application/json", "x-discogs-ratelimit-remaining" => "50" }, '{"listings":[]}' ]
        end
      end

      result = client.seller_inventory("testuser")

      expect(result["listings"]).to eq([])
      expect(call_count).to eq(2)
    end
  end
end
