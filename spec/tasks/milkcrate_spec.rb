require "rails_helper"
require "rake"

RSpec.describe "milkcrate tasks" do
  before(:all) do
    Rake.application = Rake::Application.new
    Rails.application.load_tasks
  end

  after do
    Rake::Task["stores:sync"]&.reenable
    Rake::Task["stores:curate"]&.reenable
    Rake::Task["stores:enrich"]&.reenable
  end

  let!(:store) { create(:store, discogs_username: Settings.demo_store.discogs_username, catalog_coverage: "partial", last_synced_at: 1.hour.ago) }

  before do
    allow(ENV).to receive(:[]).and_call_original
    require "ruby-progressbar"
  end

  describe "stores:sync" do
    it "calls FullStoreSyncJob for the demo store" do
      allow(FullStoreSyncJob).to receive(:perform_now)

      expect { Rake::Task["stores:sync"].invoke(store.discogs_username) }
        .to output(/Syncing/).to_stdout

      expect(FullStoreSyncJob).to have_received(:perform_now).with(store.id, max_pages: nil)
    end
  end

  describe "stores:curate" do
    it "enqueues a DailyCurationJob for the demo store" do
      expect(DailyCurationJob).to receive(:perform_now).with(store.id)

      expect { Rake::Task["stores:curate"].invoke(store.discogs_username) }
        .to output(/Running curation/).to_stdout
    end
  end

  describe "stores:enrich" do
    it "runs EnrichmentService for the demo store" do
      enrichment_service = instance_double(EnrichmentService, enrich_store: nil)
      allow(ProgressBar).to receive(:create).and_return(double("progress", finish: nil))
      allow(EnrichmentService).to receive(:new).with(progress: anything).and_return(enrichment_service)

      expect { Rake::Task["stores:enrich"].invoke(store.discogs_username) }
        .to output(/Enriching metadata/).to_stdout
    end
  end
end
