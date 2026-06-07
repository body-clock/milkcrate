require "rails_helper"

RSpec.describe SalesPollDispatcherJob do
  include ActiveJob::TestHelper

  before { clear_enqueued_jobs }

  describe "#perform" do
    context "with OAuth-authorized stores due for polling" do
      let!(:store) { create(:store, :oauth_authorized, last_sales_polled_at: 2.minutes.ago) }

      it "enqueues SalesPollStoreJob for each due store" do
        expect {
          described_class.new.perform
        }.to have_enqueued_job(SalesPollStoreJob).with(store.id).exactly(:once)
      end

      it "enqueues jobs for multiple due stores" do
        store2 = create(:store, :oauth_authorized, last_sales_polled_at: 3.minutes.ago)

        expect {
          described_class.new.perform
        }.to have_enqueued_job(SalesPollStoreJob).exactly(:twice)
      end
    end

    context "with stores that have never been polled" do
      let!(:store) { create(:store, :oauth_authorized, last_sales_polled_at: nil) }

      it "enqueues SalesPollStoreJob" do
        expect {
          described_class.new.perform
        }.to have_enqueued_job(SalesPollStoreJob).with(store.id).exactly(:once)
      end
    end

    context "with non-OAuth stores" do
      let!(:store) { create(:store, store_owner: nil) }

      it "does not enqueue SalesPollStoreJob" do
        expect {
          described_class.new.perform
        }.not_to have_enqueued_job(SalesPollStoreJob)
      end
    end

    context "with OAuth stores not due for polling" do
      let!(:store) { create(:store, :oauth_authorized, last_sales_polled_at: 30.seconds.ago) }

      it "does not enqueue SalesPollStoreJob" do
        expect {
          described_class.new.perform
        }.not_to have_enqueued_job(SalesPollStoreJob)
      end
    end

    context "with more stores than MAX_STORES_PER_RUN" do
      before do
        create_list(:store, 25, :oauth_authorized, last_sales_polled_at: 2.minutes.ago)
      end

      it "enqueues only MAX_STORES_PER_RUN jobs" do
        expect {
          described_class.new.perform
        }.to have_enqueued_job(SalesPollStoreJob).exactly(described_class::MAX_STORES_PER_RUN).times
      end
    end

    context "with multiple due stores" do
      let!(:store1) { create(:store, :oauth_authorized, last_sales_polled_at: 2.minutes.ago) }
      let!(:store2) { create(:store, :oauth_authorized, last_sales_polled_at: 3.minutes.ago) }

      it "staggers jobs with STAGGER_INTERVAL" do
        described_class.new.perform

        jobs = enqueued_jobs.select { |j| j["job_class"] == "SalesPollStoreJob" }
        scheduled_times = jobs.map { |j| Time.parse(j["scheduled_at"]) }

        expect(scheduled_times[1] - scheduled_times[0]).to be_within(0.1).of(described_class::STAGGER_INTERVAL)
      end
    end

    context "with no due stores" do
      it "does not enqueue any jobs" do
        expect {
          described_class.new.perform
        }.not_to have_enqueued_job(SalesPollStoreJob)
      end
    end
  end
end
