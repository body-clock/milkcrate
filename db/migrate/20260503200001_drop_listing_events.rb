class DropListingEvents < ActiveRecord::Migration[8.1]
  def change
    drop_table :listing_events, if_exists: true
  end
end
