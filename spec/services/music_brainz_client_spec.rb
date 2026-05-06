require "rails_helper"

RSpec.describe MusicBrainzClient do
  let(:search_conn) { instance_double(Faraday::Connection) }
  let(:caa_conn)    { instance_double(Faraday::Connection) }
  let(:client) do
    described_class.new.tap do |c|
      c.instance_variable_set(:@search_conn, search_conn)
      c.instance_variable_set(:@caa_conn, caa_conn)
    end
  end

  describe "#search_release" do
    it "returns the MBID when score >= 90" do
      response = instance_double(Faraday::Response,
        status: 200,
        body: { "releases" => [ { "id" => "abc-123", "score" => 100 } ] })
      allow(search_conn).to receive(:get).and_yield(double("req", params: {})).and_return(response)
      expect(client.search_release(artist: "Miles Davis", title: "Kind of Blue")).to eq("abc-123")
    end

    it "returns nil when score < 90" do
      response = instance_double(Faraday::Response,
        status: 200,
        body: { "releases" => [ { "id" => "abc-123", "score" => 80 } ] })
      allow(search_conn).to receive(:get).and_yield(double("req", params: {})).and_return(response)
      expect(client.search_release(artist: "Miles Davis", title: "Kind of Blue")).to be_nil
    end

    it "returns nil when no results" do
      response = instance_double(Faraday::Response,
        status: 200,
        body: { "releases" => [] })
      allow(search_conn).to receive(:get).and_yield(double("req", params: {})).and_return(response)
      expect(client.search_release(artist: "Unknown", title: "Untitled")).to be_nil
    end
  end

  describe "#front_cover_url" do
    it "returns the redirect Location URL on 307" do
      response = instance_double(Faraday::Response,
        status: 307,
        headers: { "Location" => "https://archive.org/cover.jpg" })
      allow(caa_conn).to receive(:get).with("/release/abc-123/front").and_return(response)
      expect(client.front_cover_url("abc-123")).to eq("https://archive.org/cover.jpg")
    end

    it "returns nil on 404" do
      response = instance_double(Faraday::Response, status: 404, headers: {})
      allow(caa_conn).to receive(:get).with("/release/abc-123/front").and_return(response)
      expect(client.front_cover_url("abc-123")).to be_nil
    end
  end
end
