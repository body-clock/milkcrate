class AddSalesPollingToStores < ActiveRecord::Migration[8.0]
  def change
    add_column :stores, :sales_poll_cursor_at, :datetime
    add_column :stores, :last_sales_polled_at, :datetime
    add_column :stores, :last_sales_poll_error, :text
    add_column :stores, :last_sales_poll_error_at, :datetime
    add_column :stores, :inventory_version, :integer, default: 0, null: false
  end
end
