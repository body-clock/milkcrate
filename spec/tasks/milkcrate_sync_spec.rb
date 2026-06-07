require "rails_helper"
require "rake"

RSpec.describe "milkcrate sync tasks" do
  let!(:store) { create(:store, discogs_username: Settings.demo_store.discogs_username) }

  before(:all) do
    Rake.application = Rake::Application.new
    Rails.application.load_tasks
  end

  before do
    allow(FullStoreSyncJob).to receive(:perform_now)
  end

  after do
    Rake::Task["stores:sync"]&.reenable
  end

  it "enqueues FullStoreSyncJob for stores:sync" do
    expect { Rake::Task["stores:sync"].invoke(store.discogs_username) }
      .to output(/Synced \d+ listings\./).to_stdout

    expect(FullStoreSyncJob).to have_received(:perform_now).with(store.id, max_pages: nil)
  end
end
