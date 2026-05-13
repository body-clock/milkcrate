require "rails_helper"

RSpec.describe DailyCurationJob do
  let(:store) { create(:store) }

  describe "#perform" do
    context "with a specific store_id" do
      it "calls DailyCurationService for the given store" do
        service = instance_double(DailyCurationService)
        allow(DailyCurationService).to receive(:new).and_return(service)
        expect(service).to receive(:curate).with(store)

        described_class.new.perform(store.id)
      end
    end

    context "without a store_id" do
      it "calls DailyCurationService for all stores" do
        store2 = create(:store)

        service = instance_double(DailyCurationService)
        allow(DailyCurationService).to receive(:new).and_return(service)
        expect(service).to receive(:curate).with(store)
        expect(service).to receive(:curate).with(store2)

        described_class.new.perform
      end
    end
  end
end
