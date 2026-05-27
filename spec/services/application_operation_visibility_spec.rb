require "rails_helper"

RSpec.describe "application operation public protocols" do
  it "keeps store authorization orchestration internal" do
    expect(AuthorizeStoreService.public_instance_methods(false)).to contain_exactly(:call)
  end

  it "keeps OAuth callback orchestration internal" do
    expect(AuthCallbackService.public_instance_methods(false)).to contain_exactly(:call)
  end

  it "keeps experiment seed pipeline stages internal" do
    expect(Experiments::SeedGenerator.public_instance_methods(false)).to contain_exactly(:call)
  end

  it "keeps store onboarding phases internal" do
    expect(StoreOnboarding.public_instance_methods(false)).to contain_exactly(:call)
  end

  it "keeps daily curation phases internal" do
    expect(DailyCurationService.public_instance_methods(false)).to contain_exactly(:curate)
  end

  it "publishes only inventory update operations" do
    expect(StoreSync::InventoryUpdater.public_instance_methods(false)).to contain_exactly(:call, :remove_stale)
  end

  it "keeps Discogs request setup internal" do
    expect(Discogs::PublicClient.public_instance_methods(false))
      .to contain_exactly(:seller_inventory, :seller_inventory_pages, :seller_profile, :release)
  end
end
