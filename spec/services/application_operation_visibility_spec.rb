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
end
