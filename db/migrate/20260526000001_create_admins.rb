class CreateAdmins < ActiveRecord::Migration[8.0]
  def change
    create_table :admins do |t|
      t.string :email, null: false
      t.string :password_digest, null: false
      t.integer :failed_login_attempts, default: 0, null: false
      t.datetime :locked_at

      t.timestamps
    end

    add_index :admins, :email, unique: true
  end
end
