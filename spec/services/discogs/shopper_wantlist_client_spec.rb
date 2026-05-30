require "rails_helper"

RSpec.describe Discogs::ShopperWantlistClient do
  subject(:client) { described_class.new(access_token: "token", access_token_secret: "secret") }

  let(:token) { instance_double(OAuth::AccessToken) }

  before do
    allow(client).to receive(:oauth_access_token).and_return(token)
  end

  describe "#add_want" do
    it "returns the created wantlist item id" do
      allow(token).to receive(:put).and_return(oauth_response(201, '{"want":{"id":321}}'))

      result = client.add_want(username: "buyer", release_id: "123")

      expect(result.item_id).to eq(321)
      expect(token).to have_received(:put).with(
        "https://api.discogs.com/users/buyer/wants/123",
        "",
        "Content-Type" => "application/json"
      )
    end

    it "retries rate limits twice using increasing delays" do
      allow(token).to receive(:put).and_return(
        oauth_response(429),
        oauth_response(429),
        oauth_response(201, '{"want":{"id":321}}')
      )
      delays = []
      allow(client).to receive(:sleep) { |delay| delays << delay }

      result = client.add_want(username: "buyer", release_id: 123)

      expect(result.item_id).to eq(321)
      expect(delays).to eq([ 2.0, 4.0 ])
      expect(token).to have_received(:put).exactly(3).times
    end

    it "turns connection failures into API errors" do
      allow(token).to receive(:put).and_raise(Net::ReadTimeout, "timed out")

      expect {
        client.add_want(username: "buyer", release_id: 123)
      }.to raise_error(Discogs::Errors::ApiError, /Discogs connection error/)
    end
  end

  def oauth_response(code, body = "")
    instance_double(Net::HTTPResponse, code: code.to_s, body:)
  end
end
