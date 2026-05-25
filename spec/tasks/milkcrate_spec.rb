require "rails_helper"
require "rake"

RSpec.describe "milkcrate tasks" do
  before(:all) do
    Rake.application = Rake::Application.new
    Rails.application.load_tasks
  end

  after do
    Rake::Task["milkcrate:sync"]&.reenable
    Rake::Task["milkcrate:curate"]&.reenable
    Rake::Task["milkcrate:enrich"]&.reenable
  end

  let!(:store) { create(:store, discogs_username: Settings.demo_store.discogs_username, catalog_coverage: "partial", last_synced_at: 1.hour.ago) }

  before do
    allow(ENV).to receive(:[]).and_call_original
  end

  describe "milkcrate:sync" do
    it "calls StoreSyncService for the demo store" do
      sync_service = instance_double(StoreSyncService, full_sync: 10)
      allow(StoreSyncService).to receive(:new).with(store).and_return(sync_service)
      allow(EnrichmentJob).to receive(:perform_later)
      allow(DailyCurationJob).to receive(:perform_later)

      expect { Rake::Task["milkcrate:sync"].invoke }
        .to output(/Syncing/).to_stdout
    end
  end

  describe "milkcrate:curate" do
    it "enqueues a DailyCurationJob for the demo store" do
      expect(DailyCurationJob).to receive(:perform_now).with(store.id)

      expect { Rake::Task["milkcrate:curate"].invoke }
        .to output(/Running curation/).to_stdout
    end
  end

  describe "milkcrate:enrich" do
    it "enqueues an EnrichmentJob for the demo store" do
      expect(EnrichmentJob).to receive(:perform_now).with(store.id)

      expect { Rake::Task["milkcrate:enrich"].invoke }
        .to output(/Enriching metadata/).to_stdout
    end
  end
end
