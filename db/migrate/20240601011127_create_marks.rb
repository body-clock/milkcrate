# frozen_string_literal: true

class CreateMarks < ActiveRecord::Migration[7.1]
  def change
    create_table :marks do |t|
      t.integer :timestamp
      t.references :record, null: false, foreign_key: true

      t.timestamps
    end
  end
end
