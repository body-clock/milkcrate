class AddSyncErrorTrackingToStores < ActiveRecord::Migration[8.1]
  def change
    add_column :stores, :last_sync_error, :text
    add_column :stores, :last_sync_error_at, :datetime
  end
end
