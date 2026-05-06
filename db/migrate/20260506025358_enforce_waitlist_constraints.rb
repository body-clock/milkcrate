class EnforceWaitlistConstraints < ActiveRecord::Migration[8.1]
  def change
    change_column_null :waitlists, :name, false
    change_column_null :waitlists, :email, false
    change_column_null :waitlists, :discogs_username, false
    add_index :waitlists, :discogs_username, unique: true
  end
end
