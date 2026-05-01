class DropDigSessions < ActiveRecord::Migration[8.1]
  def change
    drop_table :dig_session_items, if_exists: true
    drop_table :dig_sessions, if_exists: true
  end
end
