module InventoryExportFixtures
  def discogs_inventory_export_csv
    file_fixture("discogs_inventory_export.csv").read
  end
end

RSpec.configure do |config|
  config.include InventoryExportFixtures
end
