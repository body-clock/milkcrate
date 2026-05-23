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

ActiveRecord::Schema[8.1].define(version: 2026_05_23_183215) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

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
    t.integer "have_count"
    t.string "label"
    t.datetime "last_seen_at"
    t.datetime "last_surfaced_at"
    t.datetime "listed_at"
    t.text "notes"
    t.decimal "price", precision: 8, scale: 2
    t.bigint "store_id", null: false
    t.string "styles", default: [], array: true
    t.integer "surface_count", default: 0, null: false
    t.string "thumbnail_url"
    t.string "title"
    t.jsonb "tracklist", default: []
    t.datetime "updated_at", null: false
    t.integer "want_count"
    t.integer "year"
    t.index ["discogs_listing_id"], name: "index_listings_on_discogs_listing_id", unique: true
    t.index ["discogs_release_id"], name: "index_listings_on_discogs_release_id"
    t.index ["genres"], name: "index_listings_on_genres", using: :gin
    t.index ["last_seen_at"], name: "index_listings_on_last_seen_at"
    t.index ["last_surfaced_at"], name: "index_listings_on_last_surfaced_at"
    t.index ["listed_at"], name: "index_listings_on_listed_at"
    t.index ["store_id"], name: "index_listings_on_store_id"
    t.index ["styles"], name: "index_listings_on_styles", using: :gin
  end

  create_table "releases", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "discogs_image_missing", default: false, null: false
    t.string "discogs_release_id"
    t.datetime "enriched_at"
    t.integer "have_count"
    t.string "musicbrainz_id"
    t.datetime "updated_at", null: false
    t.integer "want_count"
    t.index ["discogs_release_id"], name: "index_releases_on_discogs_release_id", unique: true
  end

  create_table "solid_cable_messages", force: :cascade do |t|
    t.binary "channel", null: false
    t.bigint "channel_hash", null: false
    t.datetime "created_at", null: false
    t.binary "payload", null: false
    t.index ["channel"], name: "index_solid_cable_messages_on_channel"
    t.index ["channel_hash"], name: "index_solid_cable_messages_on_channel_hash"
    t.index ["created_at"], name: "index_solid_cable_messages_on_created_at"
  end

  create_table "solid_cache_entries", force: :cascade do |t|
    t.integer "byte_size", null: false
    t.datetime "created_at", null: false
    t.binary "key", null: false
    t.bigint "key_hash", null: false
    t.binary "value", null: false
    t.index ["byte_size"], name: "index_solid_cache_entries_on_byte_size"
    t.index ["key_hash", "byte_size"], name: "index_solid_cache_entries_on_key_hash_and_byte_size"
    t.index ["key_hash"], name: "index_solid_cache_entries_on_key_hash", unique: true
  end

  create_table "solid_queue_blocked_executions", force: :cascade do |t|
    t.string "concurrency_key", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.index ["concurrency_key", "priority", "job_id"], name: "index_solid_queue_blocked_executions_for_release"
    t.index ["expires_at", "concurrency_key"], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index ["job_id"], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
  end

  create_table "solid_queue_claimed_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.index ["job_id"], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index ["process_id", "job_id"], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
  end

  create_table "solid_queue_failed_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "error"
    t.bigint "job_id", null: false
    t.index ["job_id"], name: "index_solid_queue_failed_executions_on_job_id", unique: true
  end

  create_table "solid_queue_jobs", force: :cascade do |t|
    t.string "active_job_id"
    t.text "arguments"
    t.string "class_name", null: false
    t.string "concurrency_key"
    t.datetime "created_at", null: false
    t.datetime "finished_at"
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.datetime "scheduled_at"
    t.datetime "updated_at", null: false
    t.index ["active_job_id"], name: "index_solid_queue_jobs_on_active_job_id"
    t.index ["class_name"], name: "index_solid_queue_jobs_on_class_name"
    t.index ["finished_at"], name: "index_solid_queue_jobs_on_finished_at"
    t.index ["queue_name", "finished_at"], name: "index_solid_queue_jobs_for_filtering"
    t.index ["scheduled_at", "finished_at"], name: "index_solid_queue_jobs_for_alerting"
  end

  create_table "solid_queue_pauses", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "queue_name", null: false
    t.index ["queue_name"], name: "index_solid_queue_pauses_on_queue_name", unique: true
  end

  create_table "solid_queue_processes", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "hostname"
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.text "metadata"
    t.string "name", null: false
    t.integer "pid", null: false
    t.bigint "supervisor_id"
    t.index ["last_heartbeat_at"], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index ["name", "supervisor_id"], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index ["supervisor_id"], name: "index_solid_queue_processes_on_supervisor_id"
  end

  create_table "solid_queue_ready_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.index ["job_id"], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index ["priority", "job_id"], name: "index_solid_queue_poll_all"
    t.index ["queue_name", "priority", "job_id"], name: "index_solid_queue_poll_by_queue"
  end

  create_table "solid_queue_recurring_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.datetime "run_at", null: false
    t.string "task_key", null: false
    t.index ["job_id"], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index ["task_key", "run_at"], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
  end

  create_table "solid_queue_recurring_tasks", force: :cascade do |t|
    t.text "arguments"
    t.string "class_name"
    t.string "command", limit: 2048
    t.datetime "created_at", null: false
    t.text "description"
    t.string "key", null: false
    t.integer "priority", default: 0
    t.string "queue_name"
    t.string "schedule", null: false
    t.boolean "static", default: true, null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index ["static"], name: "index_solid_queue_recurring_tasks_on_static"
  end

  create_table "solid_queue_scheduled_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.datetime "scheduled_at", null: false
    t.index ["job_id"], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index ["scheduled_at", "priority", "job_id"], name: "index_solid_queue_dispatch_all"
  end

  create_table "solid_queue_semaphores", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "key", null: false
    t.datetime "updated_at", null: false
    t.integer "value", default: 1, null: false
    t.index ["expires_at"], name: "index_solid_queue_semaphores_on_expires_at"
    t.index ["key", "value"], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index ["key"], name: "index_solid_queue_semaphores_on_key", unique: true
  end

  create_table "store_owners", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "discogs_oauth_token"
    t.text "discogs_oauth_token_secret"
    t.string "discogs_username", null: false
    t.datetime "oauth_authorized_at"
    t.string "owner_email"
    t.datetime "updated_at", null: false
    t.index ["discogs_username"], name: "index_store_owners_on_discogs_username", unique: true
  end

  create_table "stores", force: :cascade do |t|
    t.string "catalog_coverage", default: "unknown", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.string "discogs_username"
    t.string "enrichment_status", default: "idle", null: false
    t.integer "inventory_page_count", default: 0, null: false
    t.datetime "last_enriched_at"
    t.text "last_sync_error"
    t.datetime "last_sync_error_at"
    t.datetime "last_synced_at"
    t.string "name"
    t.bigint "store_owner_id"
    t.string "sync_source", default: "public_api", null: false
    t.string "sync_status"
    t.integer "total_listings"
    t.datetime "updated_at", null: false
    t.index ["discogs_username"], name: "index_stores_on_discogs_username", unique: true
    t.index ["store_owner_id"], name: "index_stores_on_store_owner_id"
  end

  create_table "waitlists", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "discogs_username", null: false
    t.string "email", null: false
    t.string "inventory_size"
    t.string "name", null: false
    t.text "notes"
    t.datetime "updated_at", null: false
    t.index ["discogs_username"], name: "index_waitlists_on_discogs_username", unique: true
  end

  add_foreign_key "listings", "stores"
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "stores", "store_owners"
end
