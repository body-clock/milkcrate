require "rails_helper"
require "rake"

RSpec.describe "stores:discogs_identity" do
  let!(:store) { create(:store, discogs_username: "teststore", discogs_user_id: nil) }

  before(:all) do
    Rake.application = Rake::Application.new
    Rails.application.load_tasks
  end

  before do
    client = instance_double(DiscogsClient)
    allow(DiscogsClient).to receive(:new).and_return(client)
    allow(client).to receive(:seller_profile).with("teststore")
      .and_return({ "id" => 4_616_786, "name" => "Test Store" })
  end

  after do
    Rake::Task["stores:discogs_identity"]&.reenable
  end

  it "updates discogs_user_id from the seller profile" do
    expect {
      Rake::Task["stores:discogs_identity"].invoke("teststore")
    }.to output(/Updated discogs_user_id: 4616786/).to_stdout

    expect(store.reload.discogs_user_id).to eq(4_616_786)
  end

  it "exits with failure when the store does not exist" do
    expect {
      Rake::Task["stores:discogs_identity"].reenable
      Rake::Task["stores:discogs_identity"].invoke("nonexistent")
    }.to raise_error(RuntimeError, /Store not found/)
  end
end
