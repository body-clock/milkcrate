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
    allow(EnrichmentJob).to receive(:perform_later)
    allow(EnrichmentJob).to receive(:perform_now)
    allow(DailyCurationJob).to receive(:perform_later)
    allow(DailyCurationJob).to receive(:perform_now)
  end

  after do
    %w[milkcrate:sync milkcrate:sync:quick milkcrate:setup].each do |task_name|
      Rake::Task[task_name].reenable
    end
  end

  it "uses full_sync and queues follow-up jobs for milkcrate:sync" do
    expect(service).to receive(:full_sync).and_return(4)
    expect(EnrichmentJob).to receive(:perform_later).with(store.id)
    expect(DailyCurationJob).to receive(:perform_later).with(store.id)

    expect { Rake::Task["milkcrate:sync"].invoke }
      .to output(/Synced 4 listings\./).to_stdout
  end

  it "passes max_pages: 1 for milkcrate:sync:quick" do
    expect(service).to receive(:full_sync).with(max_pages: 1).and_return(1)
    expect(EnrichmentJob).to receive(:perform_now).with(store.id)
    expect(DailyCurationJob).to receive(:perform_now).with(store.id)

    expect { Rake::Task["milkcrate:sync:quick"].invoke }
      .to output(/Quick-syncing/).to_stdout
  end

  it "runs setup synchronously" do
    expect(service).to receive(:full_sync).and_return(4)
    expect(EnrichmentJob).to receive(:perform_now).with(store.id)
    expect(DailyCurationJob).to receive(:perform_now).with(store.id)

    expect { Rake::Task["milkcrate:setup"].invoke }
      .to output(/Setup complete\./).to_stdout
  end
end
