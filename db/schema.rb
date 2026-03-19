# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_19_170845) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "dig_session_items", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "dig_session_id", null: false
    t.bigint "listing_id", null: false
    t.datetime "updated_at", null: false
    t.index ["dig_session_id"], name: "index_dig_session_items_on_dig_session_id"
    t.index ["listing_id"], name: "index_dig_session_items_on_listing_id"
  end

  create_table "dig_sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.text "notes"
    t.string "status", default: "active", null: false
    t.bigint "store_id", null: false
    t.datetime "updated_at", null: false
    t.index ["status"], name: "index_dig_sessions_on_status"
    t.index ["store_id"], name: "index_dig_sessions_on_store_id"
  end

  create_table "listings", force: :cascade do |t|
    t.string "artist"
    t.string "condition"
    t.string "cover_image_url"
    t.datetime "created_at", null: false
    t.string "currency", default: "USD"
    t.string "discogs_listing_id", null: false
    t.string "discogs_release_id"
    t.string "format"
    t.string "genres", default: [], array: true
    t.string "label"
    t.datetime "last_seen_at"
    t.datetime "listed_at"
    t.text "notes"
    t.decimal "price", precision: 8, scale: 2
    t.bigint "store_id", null: false
    t.string "styles", default: [], array: true
    t.string "thumbnail_url"
    t.string "title"
    t.jsonb "tracklist", default: []
    t.datetime "updated_at", null: false
    t.integer "year"
    t.index ["discogs_listing_id"], name: "index_listings_on_discogs_listing_id", unique: true
    t.index ["genres"], name: "index_listings_on_genres", using: :gin
    t.index ["listed_at"], name: "index_listings_on_listed_at"
    t.index ["store_id"], name: "index_listings_on_store_id"
    t.index ["styles"], name: "index_listings_on_styles", using: :gin
  end

  create_table "stores", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "discogs_username"
    t.datetime "last_synced_at"
    t.string "name"
    t.string "sync_status"
    t.integer "total_listings"
    t.datetime "updated_at", null: false
  end

  add_foreign_key "dig_session_items", "dig_sessions"
  add_foreign_key "dig_session_items", "listings"
  add_foreign_key "dig_sessions", "stores"
  add_foreign_key "listings", "stores"
end
