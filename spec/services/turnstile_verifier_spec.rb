require "rails_helper"

RSpec.describe TurnstileVerifier do
  around do |example|
    original_enabled = ENV["TURNSTILE_ENABLED"]
    original_secret = ENV["TURNSTILE_SECRET_KEY"]
    original_site_key = ENV["TURNSTILE_SITE_KEY"]

    example.run
  ensure
    ENV["TURNSTILE_ENABLED"] = original_enabled
    ENV["TURNSTILE_SECRET_KEY"] = original_secret
    ENV["TURNSTILE_SITE_KEY"] = original_site_key
  end

  describe ".enabled?" do
    it "is disabled by default" do
      ENV.delete("TURNSTILE_ENABLED")

      expect(described_class.enabled?).to eq(false)
    end

    it "is enabled when TURNSTILE_ENABLED is true" do
      ENV["TURNSTILE_ENABLED"] = "true"

      expect(described_class.enabled?).to eq(true)
    end
  end

  describe ".site_key" do
    it "returns the configured site key" do
      ENV["TURNSTILE_SITE_KEY"] = "site-key"

      expect(described_class.site_key).to eq("site-key")
    end
  end

  describe ".verify" do
    it "returns false without a token" do
      ENV["TURNSTILE_SECRET_KEY"] = "secret"

      expect(described_class.verify(token: "", remote_ip: "127.0.0.1")).to eq(false)
    end

    it "returns false without a secret key" do
      ENV.delete("TURNSTILE_SECRET_KEY")

      expect(described_class.verify(token: "token", remote_ip: "127.0.0.1")).to eq(false)
    end

    it "returns true when Cloudflare accepts the token" do
      ENV["TURNSTILE_SECRET_KEY"] = "secret"
      stub_turnstile_response("success" => true)

      expect(described_class.verify(token: "token", remote_ip: "127.0.0.1")).to eq(true)
    end

    it "returns false when Cloudflare rejects the token" do
      ENV["TURNSTILE_SECRET_KEY"] = "secret"
      stub_turnstile_response("success" => false)

      expect(described_class.verify(token: "token", remote_ip: "127.0.0.1")).to eq(false)
    end

    it "returns false and logs on connection failure" do
      ENV["TURNSTILE_SECRET_KEY"] = "secret"
      connection = instance_double(Faraday::Connection)
      allow(connection).to receive(:post).and_raise(Faraday::ConnectionFailed, "connection refused")
      allow(described_class).to receive(:connection).and_return(connection)
      allow(Rails.logger).to receive(:warn)

      result = described_class.verify(token: "token", remote_ip: "127.0.0.1")

      expect(result).to eq(false)
      expect(Rails.logger).to have_received(:warn).with(/Upstream connection failed/)
    end

    it "returns false and logs on timeout" do
      ENV["TURNSTILE_SECRET_KEY"] = "secret"
      connection = instance_double(Faraday::Connection)
      allow(connection).to receive(:post).and_raise(Faraday::TimeoutError, "timeout")
      allow(described_class).to receive(:connection).and_return(connection)
      allow(Rails.logger).to receive(:warn)

      result = described_class.verify(token: "token", remote_ip: "127.0.0.1")

      expect(result).to eq(false)
      expect(Rails.logger).to have_received(:warn).with(/Upstream timeout/)
    end
  end

  def stub_turnstile_response(body)
    response = instance_double(Faraday::Response, body: body)
    connection = instance_double(Faraday::Connection)
    allow(connection).to receive(:post).and_return(response)
    allow(described_class).to receive(:connection).and_return(connection)
  end
end
