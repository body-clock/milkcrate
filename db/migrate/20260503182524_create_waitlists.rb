class CreateWaitlists < ActiveRecord::Migration[8.1]
  def change
    create_table :waitlists do |t|
      t.string :name
      t.string :discogs_username
      t.string :email
      t.string :inventory_size
      t.text :notes

      t.timestamps
    end
  end
end
