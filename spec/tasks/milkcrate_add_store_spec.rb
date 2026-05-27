require "rails_helper"
require "rake"

RSpec.describe "stores:add" do
  before(:all) do
    Rake.application = Rake::Application.new
    Rails.application.load_tasks
  end

  after do
    Rake::Task["stores:add"].reenable
  end

  around do |example|
    if example.metadata[:silence_stdout] == false
      example.run
    else
      original_stdout = $stdout
      $stdout = StringIO.new
      begin
        example.run
      ensure
        $stdout = original_stdout
      end
    end
  end

  def stub_discogs_profile(username, name:)
    client = instance_double(DiscogsClient)
    allow(DiscogsClient).to receive(:new).and_return(client)
    allow(client).to receive(:seller_profile).with(username).and_return({ "name" => name })
  end

  it "creates a store with the given username and name from Discogs" do
    stub_discogs_profile("teststore", name: "Test Store")

    expect {
      Rake::Task["stores:add"].invoke("teststore")
    }.to change(Store, :count).by(1)

    store = Store.find_by(discogs_username: "teststore")
    expect(store).to be_present
    expect(store.name).to eq("Test Store")
  end

  it "enqueues FullStoreSyncJob for the new store" do
    stub_discogs_profile("teststore2", name: "Test Store 2")

    expect {
      Rake::Task["stores:add"].invoke("teststore2")
    }.to have_enqueued_job(FullStoreSyncJob)
  end

  it "prints the store URL", silence_stdout: false do
    stub_discogs_profile("teststore3", name: "Test Store 3")

    expect {
      Rake::Task["stores:add"].invoke("teststore3")
    }.to output(%r{/teststore3}).to_stdout
  end

  it "raises when no username given" do
    expect {
      Rake::Task["stores:add"].invoke
    }.to raise_error(RuntimeError, /Usage/)
  end

  it "raises when store already exists" do
    create(:store, discogs_username: "existing")
    stub_discogs_profile("existing", name: "Existing Store")

    expect {
      Rake::Task["stores:add"].invoke("existing")
    }.to raise_error(StoreOnboarding::Error, /already exists/)
  end
end
