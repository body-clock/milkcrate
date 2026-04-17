require "rails_helper"
require "rake"

RSpec.describe "corpus tasks" do
  before(:all) do
    Rake.application = Rake::Application.new
    Rails.application.load_tasks
  end

  after do
    %w[corpus:seed corpus:refresh corpus:stats].each do |task_name|
      Rake::Task[task_name].reenable
    end
  end

  it "runs seed task using importer" do
    importer = instance_double(Corpus::DiscogsSnapshotImporter, import: { imported_listings: 12 })
    allow(Corpus::DiscogsSnapshotImporter).to receive(:new).and_return(importer)

    expect { Rake::Task["corpus:seed"].invoke }
      .to output(/imported_listings/).to_stdout
  end

  it "runs refresh task with username and max_pages args" do
    exporter = instance_double(Corpus::DiscogsSnapshotExporter, call: { "listings" => [] })
    allow(Corpus::DiscogsSnapshotExporter).to receive(:new).and_return(exporter)

    Rake::Task["corpus:refresh"].invoke("philadelphiamusic", "3")

    expect(Corpus::DiscogsSnapshotExporter)
      .to have_received(:new).with(hash_including(username: "philadelphiamusic", max_pages: 3))
  end
end
