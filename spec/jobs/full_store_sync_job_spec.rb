require "rails_helper"

RSpec.describe FullStoreSyncJob do
  include ActiveSupport::Testing::TimeHelpers

  describe "#perform" do
    context "with public API store" do
      let(:store) { create(:store) }
      let(:mock_strategy) { instance_double(SyncStrategies::PublicApi) }

      before do
        allow(Store).to receive(:find).with(store.id).and_return(store)
        allow(store).to receive(:sync_strategy).and_return(mock_strategy)
      end

      it "calls the store's sync strategy and upserts listings" do
        listings = [
          { discogs_listing_id: "1", artist: "Test", title: "Record", label: "Label",
            format: "Vinyl", condition: "Mint", price: 10.00, currency: "USD",
            listed_at: Time.current, last_seen_at: Time.current }
        ]
        sync_result = SyncStrategies::Result.new(listings:, complete: false)
        allow(mock_strategy).to receive(:call).with(store, max_pages: nil).and_return(sync_result)

        described_class.perform_now(store.id)

        expect(store.listings.count).to eq(1)
      end

      it "passes max_pages to the strategy" do
        allow(mock_strategy).to receive(:call).with(store, max_pages: 1)
          .and_return(SyncStrategies::Result.new(listings: [], complete: false))

        described_class.perform_now(store.id, max_pages: 1)

        expect(mock_strategy).to have_received(:call).with(store, max_pages: 1)
      end

      it "sets sync_status to syncing then idle" do
        allow(mock_strategy).to receive(:call).with(store, max_pages: nil)
          .and_return(SyncStrategies::Result.new(listings: [], complete: false))

        described_class.perform_now(store.id)
        store.reload

        expect(store.sync_status).to eq("idle")
        expect(store.last_sync_error).to be_nil
      end

      it "enqueues EnrichmentJob after sync when there are new listings" do
        listings = [
          { discogs_listing_id: "1", artist: "Test", title: "Record", label: "Label",
            format: "Vinyl", condition: "Mint", price: 10.00, currency: "USD",
            listed_at: Time.current, last_seen_at: Time.current }
        ]
        sync_result = SyncStrategies::Result.new(listings:, complete: false)
        allow(mock_strategy).to receive(:call).with(store, max_pages: nil).and_return(sync_result)

        expect { described_class.perform_now(store.id) }
          .to have_enqueued_job(EnrichmentJob).with(store.id, listing_ids: kind_of(Array))
      end

      it "enqueues DailyCurationJob after sync" do
        allow(mock_strategy).to receive(:call).with(store, max_pages: nil)
          .and_return(SyncStrategies::Result.new(listings: [], complete: false))

        expect {
          described_class.perform_now(store.id)
        }.to have_enqueued_job(DailyCurationJob).with(store.id)
      end

      it "does not enqueue EnrichmentJob when no listings changed" do
        allow(mock_strategy).to receive(:call).with(store, max_pages: nil)
          .and_return(SyncStrategies::Result.new(listings: [], complete: false))

        expect {
          described_class.perform_now(store.id)
        }.not_to have_enqueued_job(EnrichmentJob)
      end

      it "persists failure details when strategy raises" do
        allow(mock_strategy).to receive(:call).with(store, max_pages: nil)
          .and_raise(RuntimeError, "discogs timeout")

        expect {
          described_class.perform_now(store.id)
        }.to raise_error(RuntimeError, "discogs timeout")

        store.reload
        expect(store.sync_status).to eq("failed")
        expect(store.last_sync_error).to include("RuntimeError: discogs timeout")
        expect(store.last_sync_error_at).to be_present
      end

      it "uses strategy call time as the sync start watermark" do
        travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
          listing_attrs = {
            discogs_listing_id: "1", artist: "Test", title: "Record", label: "Label",
            format: "LP", condition: "Mint", price: 10.00, currency: "USD",
            listed_at: Time.current, last_seen_at: 2.seconds.from_now
          }
          sync_result = SyncStrategies::Result.new(listings: [ listing_attrs ], complete: false)
          allow(mock_strategy).to receive(:call).with(store, max_pages: nil).and_return(sync_result)

          travel 5.seconds
          described_class.perform_now(store.id)

          store.reload
          expect(store.last_synced_at).to eq(Time.zone.parse("2026-05-05 12:00:05"))
          expect(store.listings.available.count).to eq(0)
        end
      end

      it "does not call oauth_authorized? on the strategy" do
        allow(mock_strategy).to receive(:call).with(store, max_pages: nil)
          .and_return(SyncStrategies::Result.new(listings: [], complete: false))

        described_class.perform_now(store.id)

        expect(mock_strategy).to have_received(:call)
      end

      it "has a concurrency key lambda that accepts the job's positional arguments" do
        key = described_class.concurrency_key
        expect { key.call }.not_to raise_error
        expect { key.call(1) }.not_to raise_error
      end
    end

    context "with OAuth-authorized store" do
      let(:owner) { create(:store_owner) }
      let(:store) { create(:store, store_owner: owner) }
      let(:mock_strategy) { instance_double(SyncStrategies::CsvExport) }

      before do
        allow(Store).to receive(:find).with(store.id).and_return(store)
        allow(store).to receive(:sync_strategy).and_return(mock_strategy)
      end

      it "calls the strategy and upserts listings with reconciliation" do
        create(:listing, store:, discogs_listing_id: "stale")
        listings = [
          { discogs_listing_id: "1", artist: "Test", title: "Record", label: "Label",
            format: "Vinyl", condition: "Mint", price: 10.00, currency: "USD",
            listed_at: Time.current, last_seen_at: Time.current }
        ]
        sync_result = SyncStrategies::Result.new(listings:, complete: true)
        allow(mock_strategy).to receive(:call).with(store, max_pages: nil).and_return(sync_result)

        described_class.perform_now(store.id)

        store.reload
        expect(store.listings.count).to eq(1)
        expect(store.listings.pluck(:discogs_listing_id)).to eq(%w[1])
      end

      it "sets sync_status to syncing then idle" do
        allow(mock_strategy).to receive(:call).with(store, max_pages: nil)
          .and_return(SyncStrategies::Result.new(listings: [], complete: true))

        described_class.perform_now(store.id)
        store.reload

        expect(store.sync_status).to eq("idle")
        expect(store.last_sync_error).to be_nil
      end

      it "enqueues DailyCurationJob after sync" do
        allow(mock_strategy).to receive(:call).with(store, max_pages: nil)
          .and_return(SyncStrategies::Result.new(listings: [], complete: true))

        expect {
          described_class.perform_now(store.id)
        }.to have_enqueued_job(DailyCurationJob).with(store.id)
      end
    end
  end
end
