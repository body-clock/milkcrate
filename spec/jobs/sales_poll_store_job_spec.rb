require "rails_helper"

RSpec.describe SalesPollStoreJob do
  describe "#perform" do
    let(:store) { create(:store, :oauth_authorized) }
    let(:poller) { instance_double(StoreSales::OrderPoller) }

    before do
      allow(StoreSales::OrderPoller).to receive(:new).with(store).and_return(poller)
      allow(poller).to receive(:call)
    end

    it "calls StoreSales::OrderPoller for the store" do
      described_class.new.perform(store.id)

      expect(StoreSales::OrderPoller).to have_received(:new).with(store)
      expect(poller).to have_received(:call)
    end

    context "when poller removes listings" do
      before do
        allow(poller).to receive(:call).and_return(
          { order_count: 1, removed_count: 1, cursor_advanced: true }
        )
      end

      it "enqueues DailyCurationJob" do
        expect {
          described_class.new.perform(store.id)
        }.to have_enqueued_job(DailyCurationJob).with(store.id)
      end
    end

    context "when poller removes no listings" do
      before do
        allow(poller).to receive(:call).and_return(
          { order_count: 1, removed_count: 0, cursor_advanced: false }
        )
      end

      it "does not enqueue DailyCurationJob" do
        expect {
          described_class.new.perform(store.id)
        }.not_to have_enqueued_job(DailyCurationJob)
      end
    end

    context "when poller removes multiple listings" do
      before do
        allow(poller).to receive(:call).and_return(
          { order_count: 2, removed_count: 3, cursor_advanced: true }
        )
      end

      it "enqueues exactly one DailyCurationJob" do
        expect {
          described_class.new.perform(store.id)
        }.to have_enqueued_job(DailyCurationJob).exactly(:once)
      end
    end

    context "when store is not found" do
      it "logs a warning and does not raise" do
        expect(Rails.logger).to receive(:warn).with(/store 999999 not found/)

        expect {
          described_class.new.perform(999_999)
        }.not_to raise_error
      end
    end

    context "when poller raises an error" do
      before do
        allow(poller).to receive(:call).and_raise(StandardError, "API error")
      end

      it "propagates the error" do
        expect {
          described_class.new.perform(store.id)
        }.to raise_error(StandardError, "API error")
      end
    end

    context "when Discogs has a transient failure" do
      before do
        allow(poller).to receive(:call).and_raise(
          Discogs::Errors::TransientApiError,
          "Discogs API error: 502"
        )
      end

      it "logs the failure without reporting the expected upstream outage" do
        expect(Rails.logger).to receive(:warn).with(
          /transient Discogs failure for store #{store.id}: Discogs API error: 502/
        )

        expect {
          described_class.new.perform(store.id)
        }.not_to raise_error
      end
    end
  end

  describe "concurrency key" do
    it "accepts store_id as argument" do
      key_lambda = described_class.concurrency_key
      expect { key_lambda.call(123) }.not_to raise_error
    end

    it "generates unique keys per store" do
      key_lambda = described_class.concurrency_key
      expect(key_lambda.call(1)).to eq("sales_poll_1")
      expect(key_lambda.call(2)).to eq("sales_poll_2")
    end
  end
end
