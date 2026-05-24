require "rails_helper"

RSpec.describe Discogs::ShopperListClient do
  subject(:client) { described_class.new(access_token: "test_token", access_token_secret: "test_secret") }

  let(:oauth_consumer) { instance_double(OAuth::Consumer) }
  let(:access_token_obj) { instance_double(OAuth::AccessToken) }

  before do
    allow(DiscogsOauthConsumer).to receive(:build).and_return(oauth_consumer)
    allow(OAuth::AccessToken).to receive(:new).with(oauth_consumer, "test_token", "test_secret")
      .and_return(access_token_obj)
  end

  describe "#create_list" do
    context "when the API succeeds" do
      let(:response_body) { { "id" => 123, "resource_url" => "https://api.discogs.com/lists/123" }.to_json }

      before do
        allow(access_token_obj).to receive(:post)
          .with(
            "https://api.discogs.com/lists",
            '{"name":"Picks from Sonic Boom","is_private":true}',
            "Content-Type" => "application/json"
          )
          .and_return(instance_double(Net::HTTPResponse, code: "201", body: response_body))
      end

      it "returns a ListResult with list_id and list_url" do
        result = client.create_list(name: "Picks from Sonic Boom")

        expect(result.list_id).to eq(123)
        expect(result.list_url).to eq("https://api.discogs.com/lists/123")
      end
    end

    context "when description is provided" do
      it "includes description in the request body" do
        expected_body = '{"name":"Picks from Sonic Boom","is_private":true,"description":"My picks"}'

        expect(access_token_obj).to receive(:post)
          .with("https://api.discogs.com/lists", expected_body, "Content-Type" => "application/json")
          .and_return(instance_double(Net::HTTPResponse, code: "201", body: '{"id":1}'))

        client.create_list(name: "Picks from Sonic Boom", description: "My picks")
      end
    end

    context "when the API returns an error" do
      before do
        allow(access_token_obj).to receive(:post)
          .and_return(instance_double(Net::HTTPResponse, code: "400", body: '{"message":"Invalid list name"}'))
      end

      it "raises an ApiError" do
        expect { client.create_list(name: "") }
          .to raise_error(Discogs::Errors::ApiError, /Invalid list name/)
      end
    end

    context "when rate limited" do
      before do
        allow(access_token_obj).to receive(:post)
          .and_return(instance_double(Net::HTTPResponse, code: "429", body: ""))
      end

      it "raises a RateLimitError" do
        expect { client.create_list(name: "Test") }
          .to raise_error(Discogs::Errors::RateLimitError, /rate limit/)
      end
    end
  end

  describe "#add_item" do
    context "when the API succeeds" do
      before do
        allow(access_token_obj).to receive(:post)
          .with(
            "https://api.discogs.com/lists/123/items",
            '{"release_id":456}',
            "Content-Type" => "application/json"
          )
          .and_return(instance_double(Net::HTTPResponse, code: "201", body: '{"id":789}'))
      end

      it "returns an AddItemResult with item_id" do
        result = client.add_item(list_id: 123, release_id: 456)

        expect(result.item_id).to eq(789)
      end
    end

    context "when the API returns an error" do
      before do
        allow(access_token_obj).to receive(:post)
          .and_return(instance_double(Net::HTTPResponse, code: "404", body: '{"message":"List not found"}'))
      end

      it "raises an ApiError" do
        expect { client.add_item(list_id: 999, release_id: 1) }
          .to raise_error(Discogs::Errors::ApiError, /List not found/)
      end
    end
  end
end
