require "rails_helper"

RSpec.describe SyncAllStoresJob do
  include ActiveJob::TestHelper

  before { clear_enqueued_jobs }
  describe "#perform" do
    it "enqueues FullStoreSyncJob for each store with staggered delays" do
      stores = create_list(:store, 3)

      expect {
        described_class.new.perform
      }.to have_enqueued_job(FullStoreSyncJob).exactly(3).times

      expect(FullStoreSyncJob).to have_been_enqueued.with(stores[0].id)
      expect(FullStoreSyncJob).to have_been_enqueued.with(stores[1].id)
      expect(FullStoreSyncJob).to have_been_enqueued.with(stores[2].id)
    end

    it "applies staggering delays based on index" do
      create_list(:store, 2)
      now = Time.now.to_f

      described_class.new.perform

      first_job = enqueued_jobs.first
      second_job = enqueued_jobs.second

      # First job runs immediately (wait: 0)
      expect(first_job[:at]).to be_within(1).of(now)
      # Second job runs after STAGGER_INTERVAL
      expect(second_job[:at]).to be_within(1).of(now + described_class::STAGGER_INTERVAL)
    end

    it "is a no-op when there are no stores" do
      expect {
        described_class.new.perform
      }.not_to have_enqueued_job(FullStoreSyncJob)
    end
  end
end
