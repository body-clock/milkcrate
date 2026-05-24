require "rails_helper"
require "rake"

RSpec.describe "milkcrate sync tasks" do
  let!(:store) { create(:store, discogs_username: Settings.demo_store.discogs_username) }
  let(:service) { instance_double(StoreSyncService) }

  before(:all) do
    Rake.application = Rake::Application.new
    Rails.application.load_tasks
  end

  before do
    allow(StoreSyncService).to receive(:new).and_return(service)
    allow(service).to receive(:full_sync).and_return(4)
  end

  after do
    Rake::Task["milkcrate:sync"]&.reenable
  end

  it "uses full_sync for milkcrate:sync" do
    expect(service).to receive(:full_sync).and_return(4)

    expect { Rake::Task["milkcrate:sync"].invoke }
      .to output(/Synced 4 listings\./).to_stdout
  end
end
